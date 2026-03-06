import { STATE } from '../config.js';
import { reduceSession } from '../domain/session-reducer.js';
import { getLastDisplayIndex } from '../domain/selectors.js';

function commitSessionPatch(nextState) {
  Object.assign(STATE, nextState);
}

export function createUseCases(app) {
  const uiPort = app.uiPort || {
    isShortcutsOpen: () => false,
    isFilesOpen: () => false,
    isStatsOpen: () => false
  };

  return {
    toggleMode() {
      const nextMode = STATE.mode === 'input' ? 'recall' : 'input';
      commitSessionPatch(reduceSession(STATE, { type: 'SET_MODE', payload: nextMode }));
      app.setMode(STATE.mode);
    },

    jumpToFirst() {
      if (STATE.currentIndex === 0) return false;
      commitSessionPatch(reduceSession(STATE, { type: 'SET_CURRENT_INDEX', payload: 0 }));
      app.saveState();
      app.render();
      app.updateStatsUI();
      app.showToast('已跳转到第一张');
      return true;
    },

    jumpToLast() {
      const lastIndex = getLastDisplayIndex(STATE);
      if (lastIndex < 0 || STATE.currentIndex === lastIndex) return false;
      commitSessionPatch(reduceSession(STATE, { type: 'SET_CURRENT_INDEX', payload: lastIndex }));
      app.saveState();
      app.render();
      app.updateStatsUI();
      app.showToast('已跳转到最后一张');
      return true;
    },

    closeOverlaysByPriority() {
      if (uiPort.isShortcutsOpen()) {
        app.toggleShortcuts();
        return true;
      }

      if (uiPort.isFilesOpen()) {
        app.toggleFiles();
        return true;
      }

      if (uiPort.isStatsOpen()) {
        app.toggleStats();
        return true;
      }

      return false;
    }
  };
}
