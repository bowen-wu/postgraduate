/**
 * Parser Unit Tests
 *
 * 测试目标：验证 synonym 和 antonym 相关函数的正确性
 *
 * 运行方式：
 * 1. 在浏览器中打开 tests/unit.html
 * 2. 或在控制台运行：import('./tests/parser.unit.test.js').then(m => m.runAllTests())
 */

import { MarkdownParser } from '../js/parser/index.js';

// ==================== Test Utilities ====================

let passCount = 0;
let failCount = 0;
const results = [];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected "${expected}", got "${actual}"`);
  }
}

function assertDeepEqual(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function test(name, fn) {
  try {
    fn();
    passCount++;
    results.push({ name, status: 'PASS', error: null });
  } catch (error) {
    failCount++;
    results.push({ name, status: 'FAIL', error: error.message });
  }
}

function createParser() {
  return new MarkdownParser('');
}

// ==================== Tests: addSynonymToParent ====================

function test_addSynonymToParent() {
  console.log('\n📦 Testing addSynonymToParent');

  test('内联完整定义 (pos + cn) → 直接添加到 synonyms', () => {
    const parser = createParser();
    parser.parentCard = { word: 'test', items: [], synonyms: [] };

    parser.addSynonymToParent('== restrain vt. 抑制', 4);

    assertEqual(parser.parentCard.synonyms.length, 1, 'synonyms count');
    assertEqual(parser.parentCard.synonyms[0].word, 'restrain', 'word');
    assertEqual(parser.parentCard.synonyms[0].pos, 'vt.', 'pos');
    assertEqual(parser.parentCard.synonyms[0].cn, '抑制', 'cn');
    assert(parser.pendingSynonymCard === null, 'pendingSynonymCard should be null');
  });

  test('只有 word → 创建 pendingSynonymCard', () => {
    const parser = createParser();
    parser.parentCard = { word: 'test', items: [], synonyms: [] };
    parser.pendingSynonymOriginalParent = null;

    parser.addSynonymToParent('== curb', 4);

    assert(parser.pendingSynonymCard !== null, 'pendingSynonymCard should exist');
    assertEqual(parser.pendingSynonymCard.word, 'curb', 'pending word');
    assertEqual(parser.parentCard, parser.pendingSynonymCard, 'parentCard redirected');
    assertEqual(parser.pendingSynonymLevel, 4, 'level recorded');
  });

  test('只有 ipa → 创建 pendingSynonymCard', () => {
    const parser = createParser();
    parser.parentCard = { word: 'test', items: [], synonyms: [] };

    parser.addSynonymToParent('== word [wɜːrd]', 4);

    assert(parser.pendingSynonymCard !== null, 'pendingSynonymCard should exist');
    assertEqual(parser.pendingSynonymCard.word, 'word', 'word');
    assertEqual(parser.pendingSynonymCard.ipa, '[wɜːrd]', 'ipa');
  });

  test('重复同义词 → 不添加', () => {
    const parser = createParser();
    parser.parentCard = { word: 'test', items: [], synonyms: [{ word: 'restrain' }] };

    parser.addSynonymToParent('== restrain vt. 抑制', 4);

    assertEqual(parser.parentCard.synonyms.length, 1, 'should not add duplicate');
  });
}

// ==================== Tests: addAntonymToParent ====================

function test_addAntonymToParent() {
  console.log('\n📦 Testing addAntonymToParent');

  test('内联完整定义 (pos + cn) → 直接添加到 antonyms', () => {
    const parser = createParser();
    parser.parentCard = { word: 'test', type: 'word', items: [], antonyms: [] };

    parser.addAntonymToParent('Opposite: cold adj. 冷的', 4);

    assertEqual(parser.parentCard.antonyms.length, 1, 'antonyms count');
    assertEqual(parser.parentCard.antonyms[0].word, 'cold', 'word');
    assertEqual(parser.parentCard.antonyms[0].pos, 'adj.', 'pos');
    assertEqual(parser.parentCard.antonyms[0].cn, '冷的', 'cn');
    assert(parser.pendingAntonymCard === null, 'pendingAntonymCard should be null');
  });

  test('只有 word + ipa → 创建 pendingAntonymCard', () => {
    const parser = createParser();
    parser.parentCard = { word: 'test', type: 'word', items: [], antonyms: [] };

    parser.addAntonymToParent('Opposite: solitary [ˈsɑːləteri]', 4);

    assert(parser.pendingAntonymCard !== null, 'pendingAntonymCard should exist');
    assertEqual(parser.pendingAntonymCard.word, 'solitary', 'pending word');
    assertEqual(parser.pendingAntonymCard.ipa, '[ˈsɑːləteri]', 'pending ipa');
    assertEqual(parser.parentCard, parser.pendingAntonymCard, 'parentCard redirected');
  });

  test('只有 word → 创建 pendingAntonymCard', () => {
    const parser = createParser();
    parser.parentCard = { word: 'test', type: 'word', items: [], antonyms: [] };

    parser.addAntonymToParent('Opposite: cold', 4);

    assert(parser.pendingAntonymCard !== null, 'pendingAntonymCard should exist');
    assertEqual(parser.pendingAntonymCard.word, 'cold', 'word');
  });
}

// ==================== Tests: addPosToParent ====================

function test_addPosToParent() {
  console.log('\n📦 Testing addPosToParent');

  test('添加到普通 parentCard', () => {
    const parser = createParser();
    parser.parentCard = { word: 'test', items: [{ en: 'test', cn: '' }] };

    parser.addPosToParent('vt. 抑制');

    assertEqual(parser.parentCard.items.length, 1, 'items count (placeholder removed)');
    assertEqual(parser.parentCard.items[0].en, 'vt.', 'pos');
    assertEqual(parser.parentCard.items[0].cn, '抑制', 'cn');
  });

  test('添加到 pendingSynonymCard', () => {
    const parser = createParser();
    parser.pendingSynonymCard = { word: 'curb', items: [{ en: 'curb', cn: '' }] };
    parser.parentCard = parser.pendingSynonymCard;

    parser.addPosToParent('vt. 抑制，控制');

    assertEqual(parser.pendingSynonymCard.items.length, 1, 'items count');
    assertEqual(parser.pendingSynonymCard.items[0].cn, '抑制，控制', 'cn');
  });

  test('添加到 pendingAntonymCard', () => {
    const parser = createParser();
    parser.pendingAntonymCard = { word: 'solitary', items: [{ en: 'solitary', cn: '' }] };
    parser.parentCard = parser.pendingAntonymCard;

    parser.addPosToParent('adj. 独自的');

    assertEqual(parser.pendingAntonymCard.items.length, 1, 'items count');
    assertEqual(parser.pendingAntonymCard.items[0].cn, '独自的', 'cn');
  });
}

// ==================== Tests: finalizePendingSynonymIfNeeded ====================

function test_finalizePendingSynonymIfNeeded() {
  console.log('\n📦 Testing finalizePendingSynonymIfNeeded');

  test('indent 减小 → 完成 pending', () => {
    const parser = createParser();
    parser.pendingSynonymCard = { word: 'curb', items: [{ en: 'vt.', cn: '抑制' }] };
    parser.pendingSynonymLevel = 4;
    parser.pendingAntonymOriginalParent = null;
    parser.pendingSynonymOriginalParent = { word: 'test', type: 'word', synonyms: [] };
    parser.parentCard = parser.pendingSynonymCard;

    parser.finalizePendingSynonymIfNeeded(0);  // indent 减小

    assert(parser.pendingSynonymCard === null, 'pendingSynonymCard cleared');
    assertEqual(parser.pendingSynonymOriginalParent.synonyms.length, 1, 'synonym added');
    assertEqual(parser.pendingSynonymOriginalParent.synonyms[0].word, 'curb', 'word');
    assertEqual(parser.pendingSynonymOriginalParent.synonyms[0].items.length, 1, 'has items');
  });

  test('indent 未变 → 不完成', () => {
    const parser = createParser();
    parser.pendingSynonymCard = { word: 'curb', items: [] };
    parser.pendingSynonymLevel = 4;
    parser.parentCard = parser.pendingSynonymCard;

    parser.finalizePendingSynonymIfNeeded(6);  // indent 增大

    assert(parser.pendingSynonymCard !== null, 'pendingSynonymCard not cleared');
  });
}

// ==================== Tests: finalizePendingAntonymIfNeeded ====================

function test_finalizePendingAntonymIfNeeded() {
  console.log('\n📦 Testing finalizePendingAntonymIfNeeded');

  test('indent 减小 → 完成 pending', () => {
    const parser = createParser();
    parser.pendingAntonymCard = { word: 'solitary', ipa: '[ˈsɑːləteri]', items: [{ en: 'adj.', cn: '独自的' }] };
    parser.pendingAntonymLevel = 4;
    parser.pendingAntonymOriginalParent = { word: 'test', type: 'word', antonyms: [] };
    parser.parentCard = parser.pendingAntonymCard;

    parser.finalizePendingAntonymIfNeeded(0);  // indent 减小

    assert(parser.pendingAntonymCard === null, 'pendingAntonymCard cleared');
    assertEqual(parser.pendingAntonymOriginalParent.antonyms.length, 1, 'antonym added');
    assertEqual(parser.pendingAntonymOriginalParent.antonyms[0].word, 'solitary', 'word');
    assertEqual(parser.pendingAntonymOriginalParent.antonyms[0].items.length, 1, 'has items');
  });
}

// ==================== Tests: 集成场景 ====================

function test_integrationScenarios() {
  console.log('\n📦 Testing Integration Scenarios');

  test('场景: 同义词 + 子级 → 父卡片不受影响', () => {
    const parser = createParser();
    parser.parentCard = { word: 'dampen', type: 'word', items: [{ en: 'vt.', cn: '抑制' }], synonyms: [] };

    // 添加同义词 curb（无内联定义）
    parser.addSynonymToParent('== curb', 4);

    // 添加子级到 curb
    parser.addPosToParent('vt. 抑制，控制');
    parser.addPosToParent('n. 限制');

    // 完成 pending
    parser.finalizePendingSynonymIfNeeded(0);

    // 验证父卡片只有 1 个 item
    assertEqual(parser.pendingSynonymOriginalParent.items.length, 1, 'parent items count');
    assertEqual(parser.pendingSynonymOriginalParent.items[0].cn, '抑制', 'parent item cn');

    // 验证同义词有 2 个 items
    assertEqual(parser.pendingSynonymOriginalParent.synonyms[0].items.length, 2, 'synonym items count');
  });

  test('场景: 反义词 + 子级 → 父卡片不受影响', () => {
    const parser = createParser();
    parser.parentCard = { word: 'collaborative', type: 'word', items: [{ en: 'adj.', cn: '合作的' }], antonyms: [] };

    // 添加反义词 solitary（无内联定义）
    parser.addAntonymToParent('Opposite: solitary [ˈsɑːləteri]', 4);

    // 添加子级到 solitary
    parser.addPosToParent('adj. 独自的');
    parser.addPosToParent('n. 独居者');

    // 完成 pending
    parser.finalizePendingAntonymIfNeeded(0);

    // 验证父卡片只有 1 个 item
    assertEqual(parser.pendingAntonymOriginalParent.items.length, 1, 'parent items count');
    assertEqual(parser.pendingAntonymOriginalParent.items[0].cn, '合作的', 'parent item cn');

    // 验证反义词有 2 个 items
    assertEqual(parser.pendingAntonymOriginalParent.antonyms[0].items.length, 2, 'antonym items count');
  });
}

// ==================== Main ====================

export function runAllTests() {
  console.log('\n' + '═'.repeat(50));
  console.log('  Parser Unit Tests');
  console.log('═'.repeat(50));

  passCount = 0;
  failCount = 0;
  results.length = 0;

  test_addSynonymToParent();
  test_addAntonymToParent();
  test_addPosToParent();
  test_finalizePendingSynonymIfNeeded();
  test_finalizePendingAntonymIfNeeded();
  test_integrationScenarios();

  console.log('\n' + '─'.repeat(50));
  results.forEach(r => {
    const icon = r.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${r.name}`);
    if (r.error) {
      console.log(`   Error: ${r.error}`);
    }
  });

  console.log('─'.repeat(50));
  console.log(`Results: ${passCount} passed, ${failCount} failed`);
  console.log('═'.repeat(50));

  return { passCount, failCount, results };
}

// Export for browser
if (typeof window !== 'undefined') {
  window.runUnitTests = runAllTests;
  console.log('Unit tests loaded. Run with: runUnitTests()');
}
