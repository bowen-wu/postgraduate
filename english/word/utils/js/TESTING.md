# Testing Guide

## 1. Test Goals

Testing in this project protects:
1. Parser correctness
2. State transition correctness
3. Use-case workflow correctness
4. Regression safety after bug fixes

## 2. Test Layout

App/domain/application tests:
- `/Users/mozhenghong/bowen/user/postgraduate/postgraduate/english/word/utils/js/app/__tests__/`

Parser tests:
- `/Users/mozhenghong/bowen/user/postgraduate/postgraduate/english/word/utils/js/parser/__tests__/`

## 3. Run Tests

From:
- `/Users/mozhenghong/bowen/user/postgraduate/postgraduate/english/word/utils/js`

Command:
```bash
npm test
```

Full quality gate:
```bash
npm run verify
```

Current script:
- `node --test "app/__tests__/**/*.test.mjs" "infrastructure/__tests__/**/*.test.mjs" "parser/__tests__/*.test.mjs"`

Lint script:
- `node --check config.js api/github.js app/*.js app/presenters/*.js app/renderers/*.js app/services/*.js app/state/*.js application/*.js domain/*.js infrastructure/*.js parser/*.js`

## 4. Test Strategy

### A. Domain tests (fast, pure)
Target:
- reducers
- selectors
- pure transformations

Rules:
1. No DOM
2. No network
3. No time randomness without explicit control

### B. Application/use-case tests
Target:
- workflow branching
- state mutation intent
- side-effect triggers via mocks/stubs

Rules:
1. Mock UI adapter and infra dependencies
2. Assert behavior, not implementation details

### C. Parser fixture tests
Target:
- markdown parsing contract

Rules:
1. Every parser behavior change must update/add fixture pair:
   - `*.md`
   - `*.expected.json`
2. Keep fixture names task-oriented and readable

## 5. Bug-Driven Workflow (Mandatory)

For every bug:
1. Create a failing test that reproduces it
2. Confirm the test fails before fix
3. Implement fix
4. Run full test suite
5. Keep the new test as permanent regression guard

Do not:
1. Fix bug without test
2. Update snapshots blindly without reviewing semantic impact

## 6. Writing New Tests

Naming:
1. File: `*.test.mjs`
2. Test description: behavior-focused sentence

Preferred style:
1. Arrange
2. Act
3. Assert

Example checklist for new use case test:
1. Minimal initial state
2. Minimal mock dependencies
3. Explicit expected state changes
4. Explicit expected UI/side-effect calls

## 7. Parser Fixture Update Procedure

When parser logic intentionally changes:
1. Add/modify fixture markdown under `parser/__tests__/fixtures/`
2. Regenerate expected output using:
   - `/Users/mozhenghong/bowen/user/postgraduate/postgraduate/english/word/utils/js/parser/__tests__/update-fixtures.mjs`
3. Review diff in expected JSON manually
4. Run `npm test`

## 8. Quality Gates for Merge

Must pass:
1. `npm test` green
2. No removed regression tests unless justified
3. New functionality includes corresponding tests

Should pass:
1. Critical paths covered by at least one workflow test
2. Parser behavior changes documented in PR notes

## 9. What to Test by Module (Extension Spec)

When extending `domain/`:
1. Add pure unit tests per new function

When extending `application/`:
1. Add use-case tests with mocked dependencies

When extending `infrastructure/`:
1. Test normalization/formatting/error handling logic
2. Keep external API calls mockable

When extending `app/`:
1. Test delegated action routing behavior
2. Avoid moving core business logic here

When extending `parser/`:
1. Add fixture tests first
2. Keep rule changes explicit and documented

## 10. Fast Troubleshooting

If tests fail:
1. Verify current working directory is `.../english/word/utils/js`
2. Run `npm test` again
3. Inspect first failing test only, fix root cause, rerun
4. For parser failures, inspect fixture diff before code changes

## 11. Refactor 1-4 Regression Checklist

Constraints:
1. Do not edit any CSS file
2. Keep DOM semantic compatibility (`class`/`id` unchanged)

Step 1 (UI renderer modularization):
1. Open file list, choose one word/phrase/sentence file
2. Verify card, badges, synonyms/antonyms and action buttons render correctly
3. Verify keyboard shortcuts still work (`space`, `Enter`, `Backspace`, `m`, `p`)
4. Capture screenshot or record manual pass for:
   - file panel
   - normal card
   - completion screen

Step 2 (application layer DOM decoupling):
1. Verify `Esc` closes overlays in order:
   - shortcuts
   - file panel
   - stats panel
2. Verify sentence/phrase translation still updates card and action area
3. Run `npm test` and ensure translation/use-case tests are green

Step 3 (global entry cleanup):
1. Verify app boots without relying on `window.app`
2. Verify delegated click actions still dispatch correctly
3. Verify no console errors during load and first file switch

Step 4 (test and regression hardening):
1. `npm test` must be all green
2. New or changed workflows must have corresponding tests
3. Attach screenshot evidence or checklist result in the task record
