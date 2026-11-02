import { GoogleGenAI } from '@google/genai';

/**
 * GeminiKeyManager
 * Manages multiple Google Gemini API keys with automatic failover,
 * quota/rate-limit detection (429 RESOURCE_EXHAUSTED), and key rotation.
 */
class GeminiKeyManager {
  constructor() {
    this.keys = [];
    this.currentIndex = 0;
    this.cooldownMs = parseInt(process.env.GEMINI_KEY_COOLDOWN_MS, 10) || 60000; // default 60 seconds
    this.initKeys();
  }

  /**
   * Mask an API key for safe logging (e.g., "AIza...8x2k")
   */
  maskKey(key) {
    if (!key || typeof key !== 'string') return 'UNKNOWN';
    const trimmed = key.trim();
    if (trimmed.length <= 8) return '****';
    return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`;
  }

  /**
   * Validate if a key string is non-empty and not a placeholder
   */
  isValidKeyString(key) {
    if (!key || typeof key !== 'string') return false;
    const trimmed = key.trim();
    if (trimmed.length < 10) return false;
    const lower = trimmed.toLowerCase();
    if (
      lower === 'your_gemini_api_key' ||
      lower.includes('your_gemini_api_key') ||
      lower === 'your_api_key_here'
    ) {
      return false;
    }
    return true;
  }

  /**
   * Discover and initialize Gemini API keys from environment variables.
   * Supports:
   *  - GEMINI_API_KEY (primary)
   *  - GEMINI_API_KEY_1, GEMINI_API_KEY_2, GEMINI_API_KEY_3, GEMINI_API_KEY_4 (and further GEMINI_API_KEY_N)
   *  - GEMINI_API_KEYS (comma-separated list: "key1,key2,key3")
   */
  initKeys() {
    const rawCandidates = [];

    // 1. Primary key
    if (process.env.GEMINI_API_KEY) {
      rawCandidates.push({
        source: 'GEMINI_API_KEY',
        key: process.env.GEMINI_API_KEY.trim(),
      });
    }

    // 2. Specific additional keys (GEMINI_API_KEY_1 through GEMINI_API_KEY_4 and beyond)
    for (let i = 1; i <= 20; i++) {
      const envName = `GEMINI_API_KEY_${i}`;
      if (process.env[envName]) {
        rawCandidates.push({
          source: envName,
          key: process.env[envName].trim(),
        });
      }
    }

    // 3. Comma-separated GEMINI_API_KEYS list
    if (process.env.GEMINI_API_KEYS) {
      const parts = process.env.GEMINI_API_KEYS.split(',');
      parts.forEach((p, idx) => {
        const trimmed = p.trim();
        if (trimmed) {
          rawCandidates.push({
            source: `GEMINI_API_KEYS[${idx}]`,
            key: trimmed,
          });
        }
      });
    }

    // Deduplicate and filter out invalid/placeholder keys
    const seenKeys = new Set();
    this.keys = [];

    for (const item of rawCandidates) {
      if (this.isValidKeyString(item.key) && !seenKeys.has(item.key)) {
        seenKeys.add(item.key);
        this.keys.push({
          id: this.keys.length + 1,
          key: item.key,
          source: item.source,
          masked: this.maskKey(item.key),
          client: new GoogleGenAI({ apiKey: item.key }),
          exhaustedUntil: 0,
          successCount: 0,
          failureCount: 0,
          lastError: null,
        });
      }
    }

    this.currentIndex = 0;

    if (this.keys.length > 0) {
      const summary = this.keys
        .map((k) => `Key #${k.id} (${k.source}: ${k.masked})`)
        .join(', ');
      console.log(`[GeminiKeyManager] Loaded ${this.keys.length} Gemini API key(s): ${summary}`);
    } else {
      console.info('[GeminiKeyManager] No valid Gemini API keys detected. System will operate in procedural fallback mode.');
    }
  }

  /**
   * Reload keys dynamically (useful for tests or runtime config changes)
   */
  reloadKeys() {
    this.initKeys();
  }

  hasKeys() {
    return this.keys.length > 0;
  }

  getKeyCount() {
    return this.keys.length;
  }

  /**
   * Check if an error indicates rate limit, quota exhaustion (429 RESOURCE_EXHAUSTED)
   */
  isQuotaOrRateLimitError(err) {
    if (!err) return false;

    if (err.status === 429 || err.statusCode === 429 || err.code === 429 || err.code === 'RESOURCE_EXHAUSTED') {
      return true;
    }

    const message = String(err.message || err.toString() || '').toLowerCase();
    if (
      message.includes('429') ||
      message.includes('resource_exhausted') ||
      message.includes('quota') ||
      message.includes('rate limit') ||
      message.includes('ratelimit') ||
      message.includes('too many requests')
    ) {
      return true;
    }

    if (err.errorDetails && Array.isArray(err.errorDetails)) {
      const detailsStr = JSON.stringify(err.errorDetails).toLowerCase();
      if (detailsStr.includes('quota') || detailsStr.includes('rate_limit') || detailsStr.includes('resource_exhausted')) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if an error indicates invalid, unauthorized, or blocked API key
   */
  isInvalidKeyError(err) {
    if (!err) return false;
    if (err.status === 401 || err.status === 403 || err.statusCode === 401 || err.statusCode === 403) {
      return true;
    }
    const message = String(err.message || err.toString() || '').toLowerCase();
    return (
      message.includes('api_key_invalid') ||
      message.includes('invalid api key') ||
      message.includes('api key not valid') ||
      message.includes('permission_denied')
    );
  }

  /**
   * Mark a key as exhausted with a cooldown timestamp
   */
  markExhausted(keyEntry, reason, cooldownMs = this.cooldownMs) {
    keyEntry.exhaustedUntil = Date.now() + cooldownMs;
    keyEntry.failureCount += 1;
    keyEntry.lastError = reason;
    console.warn(
      `[GeminiKeyManager] Key #${keyEntry.id} (${keyEntry.masked}) marked exhausted for ${Math.round(cooldownMs / 1000)}s. Reason: ${reason}`
    );
  }

  /**
   * Mark a key as having successfully fulfilled a request
   */
  markSuccess(keyEntry) {
    keyEntry.successCount += 1;
    keyEntry.exhaustedUntil = 0;
    keyEntry.lastError = null;
  }

  /**
   * Find next available unexhausted key starting from index
   */
  findNextAvailableKey(startIndex = this.currentIndex) {
    if (this.keys.length === 0) return null;

    const now = Date.now();
    for (let i = 0; i < this.keys.length; i++) {
      const checkIdx = (startIndex + i) % this.keys.length;
      const candidate = this.keys[checkIdx];
      if (candidate.exhaustedUntil <= now) {
        this.currentIndex = checkIdx;
        return candidate;
      }
    }

    return null;
  }

  /**
   * Returns current active client, or next available client
   */
  getActiveClient() {
    const keyEntry = this.findNextAvailableKey(this.currentIndex);
    return keyEntry ? keyEntry.client : null;
  }

  /**
   * Execute an async Gemini API operation with automatic key rotation and failover.
   * If a key encounters 429 RESOURCE_EXHAUSTED or invalid key errors, it is placed on cooldown
   * and the request is retried with the next unexhausted key.
   *
   * @param {Function} operation - async (aiClient, keyEntry) => Promise<any>
   * @returns {Promise<any>}
   */
  async executeWithKeyRotation(operation) {
    if (this.keys.length === 0) {
      const err = new Error('No Gemini API keys are configured');
      err.code = 'NO_API_KEYS';
      throw err;
    }

    const totalKeys = this.keys.length;
    let attempts = 0;
    let lastError = null;

    while (attempts < totalKeys) {
      const currentKey = this.findNextAvailableKey(this.currentIndex);

      if (!currentKey) {
        // All keys are currently exhausted in cooldown
        const cooldownRemaining = Math.max(
          ...this.keys.map((k) => Math.max(0, k.exhaustedUntil - Date.now()))
        );
        const err = new Error(
          `All ${totalKeys} Gemini API keys are currently exhausted (cooldown remaining: ~${Math.ceil(cooldownRemaining / 1000)}s)`
        );
        err.code = 'ALL_KEYS_EXHAUSTED';
        throw err;
      }

      try {
        const result = await operation(currentKey.client, currentKey);
        this.markSuccess(currentKey);
        return result;
      } catch (err) {
        attempts += 1;
        lastError = err;

        if (this.isQuotaOrRateLimitError(err)) {
          this.markExhausted(currentKey, 'Quota limit or rate limit exceeded (429/RESOURCE_EXHAUSTED)', this.cooldownMs);
          const nextIdx = (this.currentIndex + 1) % totalKeys;
          this.currentIndex = nextIdx;

          if (attempts < totalKeys) {
            console.log(
              `[GeminiKeyManager] Rotating to next key (attempt ${attempts + 1}/${totalKeys}) following quota exhaustion on Key #${currentKey.id}.`
            );
            continue;
          }
        } else if (this.isInvalidKeyError(err)) {
          // 24 hour cooldown for invalid keys
          this.markExhausted(currentKey, 'Invalid or unauthorized API key', 24 * 60 * 60 * 1000);
          const nextIdx = (this.currentIndex + 1) % totalKeys;
          this.currentIndex = nextIdx;

          if (attempts < totalKeys) {
            console.log(
              `[GeminiKeyManager] Rotating to next key (attempt ${attempts + 1}/${totalKeys}) following invalid key error on Key #${currentKey.id}.`
            );
            continue;
          }
        } else if (err.status >= 500 || err.code === 'ETIMEDOUT' || err.message?.includes('fetch failed')) {
          // Transient network or server error - try next key
          console.warn(
            `[GeminiKeyManager] Transient error with Key #${currentKey.id} (${err.message}). Retrying with next key...`
          );
          const nextIdx = (this.currentIndex + 1) % totalKeys;
          this.currentIndex = nextIdx;
          if (attempts < totalKeys) {
            continue;
          }
        }

        // Non-retryable error, rethrow immediately
        throw err;
      }
    }

    console.warn(`[GeminiKeyManager] All ${totalKeys} Gemini API keys failed after ${attempts} attempts.`);
    throw lastError || new Error('All Gemini API keys exhausted');
  }

  /**
   * Return safe diagnostic information about configured keys without exposing raw secrets
   */
  getStatus() {
    const now = Date.now();
    return {
      totalKeys: this.keys.length,
      activeKeyIndex: this.currentIndex,
      keys: this.keys.map((k) => ({
        id: k.id,
        source: k.source,
        masked: k.masked,
        isCoolingDown: k.exhaustedUntil > now,
        cooldownRemainingSeconds: Math.max(0, Math.ceil((k.exhaustedUntil - now) / 1000)),
        successCount: k.successCount,
        failureCount: k.failureCount,
        lastError: k.lastError,
      })),
    };
  }
}

// Export singleton instance
export const geminiKeyManager = new GeminiKeyManager();
export default geminiKeyManager;

