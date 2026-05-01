import test from 'node:test';
import assert from 'node:assert/strict';

import { createFileUseCases } from '../../application/file-use-cases.js';

function createDeps(overrides = {}) {
  const state = {
    cards: [],
    currentIndex: 0,
    currentPath: null
  };

  const calls = {
    loadRoot: 0,
    loadFolder: 0,
    toast: []
  };

  const deps = {
    state,
    stateManager: {
      getCurrentFolderPath: () => null,
      loadStatsForFile: () => {},
      startSession: () => {},
      saveState: () => {}
    },
    uiRenderer: {
      updateOrderModeSelect: () => {},
      updateCurrentFileDisplay: () => {},
      updateStatsUI: () => {},
      showToast: (_ui, msg) => { calls.toast.push(msg); }
    },
    gitHubApi: {
      fetchFolderContents: async (path) => {
        if (path) calls.loadFolder += 1;
        else calls.loadRoot += 1;
        return { folders: [], files: [] };
      },
      fetchFileContent: async () => '- test',
      clearCache: () => {}
    },
    ParserClass: class {
      parse() { return [{ id: '1', word: 'a', type: 'word', items: [] }]; }
    },
    renderRootFileList: () => '<div>root</div>',
    renderFolderFileList: () => '<div>folder</div>',
    renderFileListError: () => '<div>error</div>',
    buildWritingCardForUnit: async () => null,
    getApp: () => ({
      ui: {
        filePanel: { classList: { contains: () => false, add: () => {}, remove: () => {}, toggle: () => {} } }
      },
      confirmDialog: { show: () => {} },
      restart: () => {},
      render: () => {}
    }),
    getUi: () => ({
      filePanel: { classList: { contains: () => false, add: () => {}, remove: () => {}, toggle: () => {} } },
      fileListContainer: { innerHTML: '' },
      loader: { classList: { remove: () => {}, add: () => {} }, innerHTML: '' },
      card: { classList: { add: () => {}, remove: () => {} } }
    }),
    ...overrides
  };

  return { calls, state, useCases: createFileUseCases(deps) };
}

test('refreshFileList loads root when current folder is null', async () => {
  const { calls, useCases } = createDeps();
  await useCases.refreshFileList();
  assert.equal(calls.loadRoot, 1);
  assert.equal(calls.loadFolder, 0);
});

test('refreshFileList loads current folder when path exists', async () => {
  const { calls, useCases } = createDeps({
    stateManager: {
      getCurrentFolderPath: () => 'core',
      loadStatsForFile: () => {},
      startSession: () => {},
      saveState: () => {}
    }
  });
  await useCases.refreshFileList();
  assert.equal(calls.loadRoot, 0);
  assert.equal(calls.loadFolder, 1);
});

test('loadFile appends writing card when assignment exists', async () => {
  const { state, useCases } = createDeps({
    gitHubApi: {
      fetchFolderContents: async () => ({ folders: [], files: [] }),
      fetchFileContent: async () => '- test',
      clearCache: () => {}
    },
    buildWritingCardForUnit: async () => ({
      id: 'writing_W001',
      word: 'Writing W001',
      type: 'sentence',
      items: [{ type: 'sentence', en: 'EN', cn: 'CN' }]
    })
  });

  await useCases.loadFile('core/Unit1-1.md');
  assert.equal(state.cards.length, 2);
  assert.equal(state.cards[1].id, 'writing_W001');
});
