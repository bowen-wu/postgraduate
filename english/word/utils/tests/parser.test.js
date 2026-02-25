/**
 * Parser Test Cases
 * Run in browser console: import('./tests/parser.test.js').then(m => m.runTests())
 */

import { MarkdownParser } from '../parser/index.js';

const testCases = [
  // Test 1: Synonym with inline definition (simple)
  {
    name: 'Synonym with inline definition',
    markdown: `
## dampen
- dampen [ˈdæmpən]
    - vt. 抑制
    - == restrain vt. 抑制
`,
    expected: {
      word: 'dampen',
      synonymCount: 1,
      synonym0: {
        word: 'restrain',
        pos: 'vt.',
        cn: '抑制',
        hasItems: false
      }
    }
  },

  // Test 2: Synonym with child items (complex)
  {
    name: 'Synonym with child items',
    markdown: `
## dampen
- dampen [ˈdæmpən]
    - vt. 抑制
    - == curb
        - vt. 抑制，控制
        - n. 限制，控制；路源；勒马绳
`,
    expected: {
      word: 'dampen',
      synonymCount: 1,
      synonym0: {
        word: 'curb',
        hasItems: true,
        itemCount: 2,
        item0Cn: '抑制，控制',
        item1Cn: '限制，控制；路源；勒马绳'
      }
    }
  },

  // Test 3: Multiple synonyms (one simple, one complex)
  {
    name: 'Multiple synonyms (mixed)',
    markdown: `
## dampen
- dampen [ˈdæmpən]
    - vt. 抑制
    - == restrain vt. 抑制
    - == curb
        - vt. 抑制，控制
        - n. 限制，控制；路源；勒马绳
`,
    expected: {
      word: 'dampen',
      synonymCount: 2,
      synonym0: {
        word: 'restrain',
        pos: 'vt.',
        cn: '抑制',
        hasItems: false
      },
      synonym1: {
        word: 'curb',
        hasItems: true,
        itemCount: 2
      }
    }
  },

  // Test 4: Antonym with child items
  {
    name: 'Antonym with child items',
    markdown: `
## collaborative
- collaborative
    - adj. 合作的
    - Opposite: solitary [ˈsɑːləteri]
        - adj. 独自的，独立的; 单个的; 唯一的; 隐居的
        - n. 独居者，隐士; 单独禁闭
`,
    expected: {
      word: 'collaborative',
      antonymCount: 1,
      antonym0: {
        word: 'solitary',
        ipa: '[ˈsɑːləteri]',
        hasItems: true,
        itemCount: 2,
        item0Cn: '独自的，独立的; 单个的; 唯一的; 隐居的',
        item1Cn: '独居者，隐士; 单独禁闭'
      }
    }
  },

  // Test 5: Antonym with inline definition (simple)
  {
    name: 'Antonym with inline definition',
    markdown: `
## hot
- hot [hɒt]
    - adj. 热的
    - Opposite: cold adj. 冷的
`,
    expected: {
      word: 'hot',
      antonymCount: 1,
      antonym0: {
        word: 'cold',
        pos: 'adj.',
        cn: '冷的',
        hasItems: false
      }
    }
  },

  // Test 6: Parent items should not be affected by synonym child items
  {
    name: 'Parent items not affected by synonym children',
    markdown: `
## dampen
- dampen [ˈdæmpən]
    - vt. 抑制
    - == curb
        - vt. 抑制，控制
        - n. 限制，控制；路源；勒马绳
`,
    expected: {
      word: 'dampen',
      // Parent should only have 1 item (vt. 抑制), not 3 items
      parentItemCount: 1,
      parentItem0Cn: '抑制'
    }
  },

  // Test 7: Parent items should not be affected by antonym child items
  {
    name: 'Parent items not affected by antonym children',
    markdown: `
## collaborative
- collaborative
    - adj. 合作的
    - Opposite: solitary [ˈsɑːləteri]
        - adj. 独自的，独立的
        - n. 独居者
`,
    expected: {
      word: 'collaborative',
      // Parent should only have 1 item, not 3 items
      parentItemCount: 1,
      parentItem0Cn: '合作的'
    }
  }
];

function runTest(testCase, index) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Test ${index + 1}: ${testCase.name}`);
  console.log('-'.repeat(60));

  const parser = new MarkdownParser(testCase.markdown);
  const cards = parser.parse();

  if (cards.length === 0) {
    console.error('❌ FAIL: No cards generated');
    return false;
  }

  const card = cards[0];
  let passed = true;

  // Check word
  if (testCase.expected.word && card.word !== testCase.expected.word) {
    console.error(`❌ word: expected "${testCase.expected.word}", got "${card.word}"`);
    passed = false;
  }

  // Check synonyms
  if (testCase.expected.synonymCount !== undefined) {
    if (!card.synonyms || card.synonyms.length !== testCase.expected.synonymCount) {
      console.error(`❌ synonymCount: expected ${testCase.expected.synonymCount}, got ${card.synonyms?.length || 0}`);
      passed = false;
    } else if (testCase.expected.synonym0) {
      const syn = card.synonyms[0];
      const exp = testCase.expected.synonym0;
      if (exp.word && syn.word !== exp.word) {
        console.error(`❌ synonym0.word: expected "${exp.word}", got "${syn.word}"`);
        passed = false;
      }
      if (exp.pos !== undefined && syn.pos !== exp.pos) {
        console.error(`❌ synonym0.pos: expected "${exp.pos}", got "${syn.pos}"`);
        passed = false;
      }
      if (exp.cn !== undefined && syn.cn !== exp.cn) {
        console.error(`❌ synonym0.cn: expected "${exp.cn}", got "${syn.cn}"`);
        passed = false;
      }
      if (exp.hasItems !== undefined) {
        const hasItems = syn.items && syn.items.length > 0;
        if (hasItems !== exp.hasItems) {
          console.error(`❌ synonym0.hasItems: expected ${exp.hasItems}, got ${hasItems}`);
          passed = false;
        }
        if (exp.itemCount !== undefined && (!syn.items || syn.items.length !== exp.itemCount)) {
          console.error(`❌ synonym0.itemCount: expected ${exp.itemCount}, got ${syn.items?.length || 0}`);
          passed = false;
        }
        if (exp.item0Cn && (!syn.items || syn.items[0]?.cn !== exp.item0Cn)) {
          console.error(`❌ synonym0.item0Cn: expected "${exp.item0Cn}", got "${syn.items?.[0]?.cn}"`);
          passed = false;
        }
        if (exp.item1Cn && (!syn.items || syn.items[1]?.cn !== exp.item1Cn)) {
          console.error(`❌ synonym0.item1Cn: expected "${exp.item1Cn}", got "${syn.items?.[1]?.cn}"`);
          passed = false;
        }
      }
    }
  }

  // Check second synonym
  if (testCase.expected.synonym1 && card.synonyms && card.synonyms[1]) {
    const syn = card.synonyms[1];
    const exp = testCase.expected.synonym1;
    if (exp.word && syn.word !== exp.word) {
      console.error(`❌ synonym1.word: expected "${exp.word}", got "${syn.word}"`);
      passed = false;
    }
    if (exp.hasItems !== undefined) {
      const hasItems = syn.items && syn.items.length > 0;
      if (hasItems !== exp.hasItems) {
        console.error(`❌ synonym1.hasItems: expected ${exp.hasItems}, got ${hasItems}`);
        passed = false;
      }
      if (exp.itemCount !== undefined && (!syn.items || syn.items.length !== exp.itemCount)) {
        console.error(`❌ synonym1.itemCount: expected ${exp.itemCount}, got ${syn.items?.length || 0}`);
        passed = false;
      }
    }
  }

  // Check antonyms
  if (testCase.expected.antonymCount !== undefined) {
    if (!card.antonyms || card.antonyms.length !== testCase.expected.antonymCount) {
      console.error(`❌ antonymCount: expected ${testCase.expected.antonymCount}, got ${card.antonyms?.length || 0}`);
      passed = false;
    } else if (testCase.expected.antonym0) {
      const ant = card.antonyms[0];
      const exp = testCase.expected.antonym0;
      if (exp.word && ant.word !== exp.word) {
        console.error(`❌ antonym0.word: expected "${exp.word}", got "${ant.word}"`);
        passed = false;
      }
      if (exp.ipa !== undefined && ant.ipa !== exp.ipa) {
        console.error(`❌ antonym0.ipa: expected "${exp.ipa}", got "${ant.ipa}"`);
        passed = false;
      }
      if (exp.pos !== undefined && ant.pos !== exp.pos) {
        console.error(`❌ antonym0.pos: expected "${exp.pos}", got "${ant.pos}"`);
        passed = false;
      }
      if (exp.cn !== undefined && ant.cn !== exp.cn) {
        console.error(`❌ antonym0.cn: expected "${exp.cn}", got "${ant.cn}"`);
        passed = false;
      }
      if (exp.hasItems !== undefined) {
        const hasItems = ant.items && ant.items.length > 0;
        if (hasItems !== exp.hasItems) {
          console.error(`❌ antonym0.hasItems: expected ${exp.hasItems}, got ${hasItems}`);
          passed = false;
        }
        if (exp.itemCount !== undefined && (!ant.items || ant.items.length !== exp.itemCount)) {
          console.error(`❌ antonym0.itemCount: expected ${exp.itemCount}, got ${ant.items?.length || 0}`);
          passed = false;
        }
        if (exp.item0Cn && (!ant.items || ant.items[0]?.cn !== exp.item0Cn)) {
          console.error(`❌ antonym0.item0Cn: expected "${exp.item0Cn}", got "${ant.items?.[0]?.cn}"`);
          passed = false;
        }
        if (exp.item1Cn && (!ant.items || ant.items[1]?.cn !== exp.item1Cn)) {
          console.error(`❌ antonym1Cn: expected "${exp.item1Cn}", got "${ant.items?.[1]?.cn}"`);
          passed = false;
        }
      }
    }
  }

  // Check parent items
  if (testCase.expected.parentItemCount !== undefined) {
    if (!card.items || card.items.length !== testCase.expected.parentItemCount) {
      console.error(`❌ parentItemCount: expected ${testCase.expected.parentItemCount}, got ${card.items?.length || 0}`);
      console.error(`   Parent items: ${JSON.stringify(card.items)}`);
      passed = false;
    }
    if (testCase.expected.parentItem0Cn && (!card.items || card.items[0]?.cn !== testCase.expected.parentItem0Cn)) {
      console.error(`❌ parentItem0Cn: expected "${testCase.expected.parentItem0Cn}", got "${card.items?.[0]?.cn}"`);
      passed = false;
    }
  }

  if (passed) {
    console.log('✅ PASS');
  } else {
    console.log('\nGenerated card:');
    console.log(JSON.stringify(card, null, 2));
  }

  return passed;
}

export function runTests() {
  console.log('\n' + '█'.repeat(60));
  console.log('  Parser Test Suite');
  console.log('█'.repeat(60));

  let passed = 0;
  let failed = 0;

  testCases.forEach((testCase, index) => {
    if (runTest(testCase, index)) {
      passed++;
    } else {
      failed++;
    }
  });

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(60));

  return { passed, failed };
}

// Auto-run if loaded directly
if (typeof window !== 'undefined') {
  window.runParserTests = runTests;
  console.log('Parser tests loaded. Run with: runParserTests()');
}
