import { register } from 'node:module';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Register JSX loader for Node ESM
register(new URL('../../test-loader.mjs', import.meta.url).href, import.meta.url);

const { MarkdownRenderer, isSafeUrl } = await import('./MarkdownRenderer.jsx');
const { ChatMessage } = await import('./ChatMessage.jsx');

console.log('--- Starting Chatbot Markdown Rendering & Security Tests ---');

// Test 1: Bold and Italic formatting
{
  const markdown = 'Detective, this is **critical** and *confidential*.';
  const html = renderToStaticMarkup(React.createElement(MarkdownRenderer, { content: markdown }));

  assert.ok(html.includes('<strong class="font-semibold text-white">critical</strong>'), 'Should render bold text with white font');
  assert.ok(html.includes('<em class="italic text-slate-300">confidential</em>'), 'Should render italic text with slate-300 font');
  console.log('✓ Test 1 Passed: Bold and italic formatting rendered correctly.');
}

// Test 2: Headings hierarchy
{
  const markdown = '# Mission Brief\n## Secondary Intel\n### Timestamp Analysis';
  const html = renderToStaticMarkup(React.createElement(MarkdownRenderer, { content: markdown }));

  assert.ok(html.includes('<h1 class="text-sm font-bold text-white mt-2 mb-1 border-b border-slate-800 pb-1">Mission Brief</h1>'), 'H1 heading formatted correctly');
  assert.ok(html.includes('<h2 class="text-xs font-bold text-white mt-2 mb-1">Secondary Intel</h2>'), 'H2 heading formatted correctly');
  assert.ok(html.includes('<h3 class="text-xs font-semibold text-cyan-300 mt-1.5 mb-0.5">Timestamp Analysis</h3>'), 'H3 heading formatted correctly');
  console.log('✓ Test 2 Passed: Headings with proper visual hierarchy rendered.');
}

// Test 3: Numbered and Bulleted lists with proper indentation
{
  const markdown = `To solve the case:
1. Review the crime briefing
2. Inspect surveillance footage

Key evidence:
- Bloodstain pattern
- Fingerprint on safe door`;

  const html = renderToStaticMarkup(React.createElement(MarkdownRenderer, { content: markdown }));

  assert.ok(html.includes('<ol class="list-decimal list-outside pl-4 space-y-1 my-1.5">'), 'Ordered list has correct classes and indentation');
  assert.ok(html.includes('<li class="text-slate-200 leading-relaxed pl-0.5">Review the crime briefing</li>'), 'Ordered list items render text properly');
  assert.ok(html.includes('<ul class="list-disc list-outside pl-4 space-y-1 my-1.5">'), 'Unordered list has correct classes and indentation');
  assert.ok(html.includes('<li class="text-slate-200 leading-relaxed pl-0.5">Bloodstain pattern</li>'), 'Unordered list items render text properly');
  console.log('✓ Test 3 Passed: Numbered and bulleted lists formatted with indentation.');
}

// Test 4: Paragraphs and Line Breaks
{
  const markdown = 'First transmission.\nStill first transmission on next line.\n\nSecond transmission in new paragraph.';
  const html = renderToStaticMarkup(React.createElement(MarkdownRenderer, { content: markdown }));

  assert.ok(html.includes('<br/>'), 'Soft line breaks converted to <br/> tags via remark-breaks');
  assert.ok(html.includes('<p class="mb-2 last:mb-0 leading-relaxed">Second transmission in new paragraph.</p>'), 'Separate paragraphs rendered in distinct <p> tags');
  console.log('✓ Test 4 Passed: Paragraphs and line breaks handled properly.');
}

// Test 5: Inline code and Fenced code blocks
{
  const markdown = 'Run `checkCCTV()` to verify.\n\n```javascript\nfunction solveMystery() {\n  return "culprit identified";\n}\n```';
  const html = renderToStaticMarkup(React.createElement(MarkdownRenderer, { content: markdown }));

  assert.ok(html.includes('<code class="font-mono bg-slate-950/80 border border-slate-800 text-cyan-300 px-1 py-0.5 rounded text-[11px] break-all">checkCCTV()</code>'), 'Inline code styled properly');
  assert.ok(html.includes('<pre class="font-mono bg-slate-950 border border-slate-800 text-slate-200 p-2.5 rounded-lg my-2 overflow-x-auto text-[11px] leading-snug">'), 'Fenced code container renders preformatted block');
  assert.ok(html.includes('solveMystery()'), 'Code content inside block is preserved');
  console.log('✓ Test 5 Passed: Inline code and fenced code blocks supported.');
}

// Test 6: Plain-text compatibility
{
  const plainText = 'Greetings Detective. How can I assist with your investigation today?';
  const html = renderToStaticMarkup(React.createElement(MarkdownRenderer, { content: plainText }));

  assert.ok(html.includes('Greetings Detective. How can I assist with your investigation today?'), 'Plain text renders cleanly');
  assert.ok(!html.includes('<strong>') && !html.includes('<code>'), 'No unintended markdown tags generated');
  console.log('✓ Test 6 Passed: Plain text compatibility maintained.');
}

// Test 7: Empty, null, undefined, and non-string responses
{
  assert.equal(renderToStaticMarkup(React.createElement(MarkdownRenderer, { content: '' })), '', 'Empty string renders empty');
  assert.equal(renderToStaticMarkup(React.createElement(MarkdownRenderer, { content: null })), '', 'Null content renders empty');
  assert.equal(renderToStaticMarkup(React.createElement(MarkdownRenderer, { content: undefined })), '', 'Undefined content renders empty');
  assert.equal(renderToStaticMarkup(React.createElement(MarkdownRenderer, { content: 12345 })), '', 'Non-string content renders empty');
  console.log('✓ Test 7 Passed: Empty and invalid inputs handled gracefully.');
}

// Test 8: Safe Link Handling
{
  // Safe URL helper check
  assert.equal(isSafeUrl('https://example.com/guide'), true, 'HTTPS URL is safe');
  assert.equal(isSafeUrl('http://example.com/guide'), true, 'HTTP URL is safe');
  assert.equal(isSafeUrl('mailto:detective@mystery.org'), true, 'Mailto URL is safe');
  assert.equal(isSafeUrl('/clues/briefing'), true, 'Relative path is safe');
  assert.equal(isSafeUrl('#cctv-feed'), true, 'Anchor is safe');
  assert.equal(isSafeUrl('//evil.com'), false, 'Protocol-relative URL is unsafe');
  assert.equal(isSafeUrl('javascript:alert(1)'), false, 'javascript: scheme is unsafe');
  assert.equal(isSafeUrl('data:text/html;base64,PHNjcmlwdD4='), false, 'data: scheme is unsafe');
  assert.equal(isSafeUrl('vbscript:msgbox(1)'), false, 'vbscript: scheme is unsafe');

  // Rendering safe external link
  const markdownSafe = '[Investigation Guide](https://mysteryroom.example.com/handbook)';
  const htmlSafe = renderToStaticMarkup(React.createElement(MarkdownRenderer, { content: markdownSafe }));
  assert.ok(htmlSafe.includes('href="https://mysteryroom.example.com/handbook"'), 'Safe URL has correct href');
  assert.ok(htmlSafe.includes('target="_blank"'), 'External link has target="_blank"');
  assert.ok(htmlSafe.includes('rel="noopener noreferrer"'), 'External link has rel="noopener noreferrer"');
  assert.ok(htmlSafe.includes('text-cyan-400'), 'Link styled with cyan theme');

  console.log('✓ Test 8 Passed: Safe external and relative links rendered with security attributes.');
}

// Test 9: Dangerous links neutralized
{
  const markdownXSS = '[Malicious Link](javascript:alert("hacked")) and [Data Link](data:text/html,<script>alert(1)</script>)';
  const htmlXSS = renderToStaticMarkup(React.createElement(MarkdownRenderer, { content: markdownXSS }));

  assert.ok(!htmlXSS.includes('href="javascript:'), 'javascript: scheme must not be in href');
  assert.ok(!htmlXSS.includes('href="data:'), 'data: scheme must not be in href');
  assert.ok(htmlXSS.includes('<span class="text-slate-300 font-medium">Malicious Link</span>'), 'Neutralized link renders as safe text span');
  console.log('✓ Test 9 Passed: Dangerous URL schemes (javascript:, data:) neutralized.');
}

// Test 10: Raw HTML Injection Prevention
{
  const maliciousInput = 'Normal text <script>window.__pwned = true;</script> <img src="x" onerror="alert(1)" /> <iframe>test</iframe>';
  const html = renderToStaticMarkup(React.createElement(MarkdownRenderer, { content: maliciousInput }));

  assert.ok(!html.includes('<script'), 'Raw <script> tags must not exist in output');
  assert.ok(!html.includes('<img'), 'Raw <img> elements must not be injected in DOM');
  assert.ok(!html.includes('<iframe'), 'Raw <iframe> tags must not exist in output');
  assert.ok(html.includes('&lt;script&gt;'), 'Script tag is escaped as plain text');
  assert.ok(html.includes('&lt;img'), 'Img tag is escaped as plain text');
  assert.ok(html.includes('&lt;iframe&gt;'), 'Iframe tag is escaped as plain text');
  console.log('✓ Test 10 Passed: Raw HTML tags are escaped and cannot be injected.');
}

// Test 11: ChatMessage component user vs assistant rendering
{
  // User message: stays plain text with whitespace-pre-line and cyan background
  const userMsg = { role: 'user', text: '**Not markdown**, just a question!' };
  const userHtml = renderToStaticMarkup(React.createElement(ChatMessage, { message: userMsg }));

  assert.ok(userHtml.includes('bg-cyan-600 text-black'), 'User message has original cyan bubble style');
  assert.ok(userHtml.includes('<p class="whitespace-pre-line">**Not markdown**, just a question!</p>'), 'User message text remains literal plain-text');
  assert.ok(!userHtml.includes('<strong>'), 'User message is not parsed as markdown');

  // Assistant message: rendered with MarkdownRenderer and slate bubble style
  const botMsg = { role: 'assistant', text: 'Greetings, Detective. I am your **Mystery Assistant**.', showGuideButton: true };
  const botHtml = renderToStaticMarkup(React.createElement(ChatMessage, { message: botMsg, onOpenHowToPlay: () => {} }));

  assert.ok(botHtml.includes('bg-slate-900 border border-slate-800 text-slate-200'), 'Assistant message has slate bubble style');
  assert.ok(botHtml.includes('<strong class="font-semibold text-white">Mystery Assistant</strong>'), 'Assistant message renders formatted markdown');
  assert.ok(botHtml.includes('Open Visual Field Guide'), 'Field guide button is rendered when showGuideButton is true');

  console.log('✓ Test 11 Passed: ChatMessage preserves user plain-text and formats assistant markdown with quick actions.');
}

console.log('--- ALL CHATBOT MARKDOWN & SECURITY TESTS PASSED! ---');
