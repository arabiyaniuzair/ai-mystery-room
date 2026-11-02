import assert from 'node:assert/strict';
import { geminiKeyManager } from './geminiKeyManager.js';
import { generateMysteryFromAI } from './geminiService.js';
import { askMysteryAssistant, getFallbackBotReply } from './chatbotService.js';

console.log('--- Starting Gemini Key Manager & Rotation Tests ---');

// Test 1: Empty environment handles fallback gracefully
{
  delete process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY_1;
  delete process.env.GEMINI_API_KEY_2;
  delete process.env.GEMINI_API_KEY_3;
  delete process.env.GEMINI_API_KEY_4;
  delete process.env.GEMINI_API_KEYS;

  geminiKeyManager.reloadKeys();
  assert.equal(geminiKeyManager.hasKeys(), false, 'Should have 0 keys when none provided');
  assert.equal(geminiKeyManager.getKeyCount(), 0, 'Count should be 0');

  // Verify mystery service falls back cleanly
  const mystery = await generateMysteryFromAI('Cyberpunk lab murder', 'medium');
  assert.ok(mystery && mystery.title, 'Procedural mystery generated when no keys configured');
  assert.equal(typeof mystery.solutionExplanation, 'string');

  // Verify chatbot service falls back cleanly
  const botReply = await askMysteryAssistant('How do I play this game?');
  assert.ok(botReply && botReply.includes('Here is the step-by-step guide'), 'Chatbot falls back cleanly');
  console.log('✓ Test 1 Passed: Zero keys fallback gracefully to procedural/local engines.');
}

// Test 2: Single key configuration (backward compatibility)
{
  process.env.GEMINI_API_KEY = 'AIzaSyA_mock_key_0000000000000001';
  geminiKeyManager.reloadKeys();

  assert.equal(geminiKeyManager.hasKeys(), true, 'Should detect single key');
  assert.equal(geminiKeyManager.getKeyCount(), 1, 'Should have exactly 1 key');
  assert.equal(geminiKeyManager.keys[0].source, 'GEMINI_API_KEY');
  assert.equal(geminiKeyManager.keys[0].masked, 'AIza...0001', 'Key must be masked for security');
  console.log('✓ Test 2 Passed: Single GEMINI_API_KEY works seamlessly (backward compatible).');
}

// Test 3: Support 4 additional keys (GEMINI_API_KEY_1 through GEMINI_API_KEY_4)
{
  process.env.GEMINI_API_KEY = 'AIzaSyA_primary_000000000000000';
  process.env.GEMINI_API_KEY_1 = 'AIzaSyB_extra_1_111111111111111';
  process.env.GEMINI_API_KEY_2 = 'AIzaSyC_extra_2_222222222222222';
  process.env.GEMINI_API_KEY_3 = 'AIzaSyD_extra_3_333333333333333';
  process.env.GEMINI_API_KEY_4 = 'AIzaSyE_extra_4_444444444444444';

  geminiKeyManager.reloadKeys();

  assert.equal(geminiKeyManager.getKeyCount(), 5, 'Should load primary + 4 additional keys = 5 total keys');
  assert.equal(geminiKeyManager.keys[0].source, 'GEMINI_API_KEY');
  assert.equal(geminiKeyManager.keys[1].source, 'GEMINI_API_KEY_1');
  assert.equal(geminiKeyManager.keys[2].source, 'GEMINI_API_KEY_2');
  assert.equal(geminiKeyManager.keys[3].source, 'GEMINI_API_KEY_3');
  assert.equal(geminiKeyManager.keys[4].source, 'GEMINI_API_KEY_4');
  console.log('✓ Test 3 Passed: 4 additional Gemini keys (GEMINI_API_KEY_1..4) correctly discovered and loaded.');
}

// Test 4: Comma-separated list and deduplication
{
  process.env.GEMINI_API_KEYS = 'AIzaSyF_comma_1_111111111111111, AIzaSyG_comma_2_222222222222222, AIzaSyA_primary_000000000000000, your_gemini_api_key';
  geminiKeyManager.reloadKeys();

  // Primary + 4 extra + 2 new from comma list (1 duplicate primary ignored, 1 placeholder ignored) = 7 keys
  assert.equal(geminiKeyManager.getKeyCount(), 7, 'Deduplicates keys and excludes placeholders');
  console.log('✓ Test 4 Passed: Comma-separated list deduplication and placeholder filtering verified.');
}

// Test 5: Automatic rotation on 429 RESOURCE_EXHAUSTED
{
  // Set up 3 mock keys
  delete process.env.GEMINI_API_KEYS;
  delete process.env.GEMINI_API_KEY_3;
  delete process.env.GEMINI_API_KEY_4;
  process.env.GEMINI_API_KEY = 'AIzaSy_key1_1111111111111111111';
  process.env.GEMINI_API_KEY_1 = 'AIzaSy_key2_2222222222222222222';
  process.env.GEMINI_API_KEY_2 = 'AIzaSy_key3_3333333333333333333';
  geminiKeyManager.reloadKeys();

  assert.equal(geminiKeyManager.getKeyCount(), 3);

  const calls = [];
  // Simulate operation where Key 1 throws 429, Key 2 throws RESOURCE_EXHAUSTED, Key 3 succeeds
  const mockOperation = async (client, keyEntry) => {
    calls.push(keyEntry.id);
    if (keyEntry.id === 1) {
      const err = new Error('Resource has been exhausted (e.g. check quota).');
      err.status = 429;
      err.code = 429;
      throw err;
    }
    if (keyEntry.id === 2) {
      const err = new Error('[GoogleGenerativeAI Error]: RESOURCE_EXHAUSTED quota exceeded');
      throw err;
    }
    return { success: true, answeredBy: keyEntry.id };
  };

  const result = await geminiKeyManager.executeWithKeyRotation(mockOperation);
  assert.deepEqual(calls, [1, 2, 3], 'Should attempt Key 1, rotate to Key 2, rotate to Key 3');
  assert.equal(result.success, true);
  assert.equal(result.answeredBy, 3);

  // Key 1 and Key 2 should now be marked as cooling down
  assert.ok(geminiKeyManager.keys[0].exhaustedUntil > Date.now(), 'Key 1 should be cooling down');
  assert.ok(geminiKeyManager.keys[1].exhaustedUntil > Date.now(), 'Key 2 should be cooling down');
  assert.equal(geminiKeyManager.keys[2].exhaustedUntil, 0, 'Key 3 should be active');

  console.log('✓ Test 5 Passed: Automatic failover from Key 1 -> Key 2 -> Key 3 on 429 quota exhaustion.');
}

// Test 6: Next request automatically uses the unexhausted key (skips cooling down keys)
{
  const nextCalls = [];
  const nextOperation = async (client, keyEntry) => {
    nextCalls.push(keyEntry.id);
    return { success: true, keyId: keyEntry.id };
  };

  const nextResult = await geminiKeyManager.executeWithKeyRotation(nextOperation);
  assert.deepEqual(nextCalls, [3], 'Subsequent call directly uses unexhausted Key 3 without wasting calls on Key 1/2');
  assert.equal(nextResult.keyId, 3);
  console.log('✓ Test 6 Passed: Exhausted keys are skipped automatically until cooldown finishes.');
}

// Test 7: All keys exhausted error
{
  // Mark Key 3 exhausted as well
  geminiKeyManager.markExhausted(geminiKeyManager.keys[2], 'Quota exhausted', 60000);

  let caughtError = null;
  try {
    await geminiKeyManager.executeWithKeyRotation(async () => 'should not reach here');
  } catch (err) {
    caughtError = err;
  }

  assert.ok(caughtError, 'Should throw error when all keys are exhausted');
  assert.equal(caughtError.code, 'ALL_KEYS_EXHAUSTED');
  console.log('✓ Test 7 Passed: Clean exception when all keys are exhausted in cooldown.');
}

// Clean up env vars
delete process.env.GEMINI_API_KEY;
delete process.env.GEMINI_API_KEY_1;
delete process.env.GEMINI_API_KEY_2;
delete process.env.GEMINI_API_KEY_3;
delete process.env.GEMINI_API_KEY_4;
delete process.env.GEMINI_API_KEYS;
geminiKeyManager.reloadKeys();

console.log('--- ALL GEMINI KEY ROTATION TESTS PASSED SUCCESSFULLY! ---');

