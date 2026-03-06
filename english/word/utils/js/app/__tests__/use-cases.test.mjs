import test from 'node:test';
import assert from 'node:assert/strict';

import { STATE } from '../../config.js';
import { createUseCases } from '../../application/use-cases.js';

function createMockApp() {
  return {
    setModeCalls: [],
    saveStateCalls: 0,
    renderCalls: 0,
    updateStatsUICalls: 0,
    toasts: [],
    toggled: [],
    setMode(mode) { this.setModeCalls.push(mode); },
    saveState() { this.saveStateCalls += 1; },
    render() { this.renderCalls += 1; },
    updateStatsUI() { this.updateStatsUICalls += 1; },
    showToast(msg) { this.toasts.push(msg); },
    toggleShortcuts() { this.toggled.push('shortcuts'); },
    toggleFiles() { this.toggled.push('files'); },
    toggleStats() { this.toggled.push('stats'); },
    uiPort: {
      isShortcutsOpen: () => false,
      isFilesOpen: () => false,
      isStatsOpen: () => false
    }
  };
}

test('toggleMode switches from input to recall', () => {
  STATE.mode = 'input';
  const app = createMockApp();
  const useCases = createUseCases(app);

  useCases.toggleMode();

  assert.deepEqual(app.setModeCalls, ['recall']);
});

test('jumpToFirst updates index and triggers render pipeline', () => {
  STATE.currentIndex = 3;
  const app = createMockApp();
  const useCases = createUseCases(app);

  const changed = useCases.jumpToFirst();

  assert.equal(changed, true);
  assert.equal(STATE.currentIndex, 0);
  assert.equal(app.saveStateCalls, 1);
  assert.equal(app.renderCalls, 1);
  assert.equal(app.updateStatsUICalls, 1);
  assert.deepEqual(app.toasts, ['已跳转到第一张']);
});

test('jumpToLast updates index to final position', () => {
  STATE.displayOrder = [5, 1, 9];
  STATE.currentIndex = 0;
  const app = createMockApp();
  const useCases = createUseCases(app);

  const changed = useCases.jumpToLast();

  assert.equal(changed, true);
  assert.equal(STATE.currentIndex, 2);
  assert.deepEqual(app.toasts, ['已跳转到最后一张']);
});

test('closeOverlaysByPriority closes shortcuts first', () => {
  const app = createMockApp();
  const useCases = createUseCases(app);
  app.uiPort.isShortcutsOpen = () => true;

  const handled = useCases.closeOverlaysByPriority();
  assert.equal(handled, true);
  assert.deepEqual(app.toggled, ['shortcuts']);
});

test('closeOverlaysByPriority closes files when shortcuts is closed', () => {
  const app = createMockApp();
  const useCases = createUseCases(app);
  app.uiPort.isShortcutsOpen = () => false;
  app.uiPort.isFilesOpen = () => true;
  app.uiPort.isStatsOpen = () => true;

  const handled = useCases.closeOverlaysByPriority();
  assert.equal(handled, true);
  assert.deepEqual(app.toggled, ['files']);
});
