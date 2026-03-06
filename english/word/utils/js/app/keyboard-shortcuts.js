import { CONFIG, STATE } from '../config.js';
import { getCurrentCardFromState } from '../domain/selectors.js';

function shouldIgnoreShortcut(e) {
  return e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';
}

function debouncePassed(lastPlayTime, key, intervalMs) {
  const now = Date.now();
  if (lastPlayTime[key] && now - lastPlayTime[key] < intervalMs) {
    return false;
  }
  lastPlayTime[key] = now;
  return true;
}

function createHandlers({ app, useCases, keyboardState, resetCardLocalState, currentCard }) {
  const isRecallMode = STATE.mode === 'recall';

  const plainHandlers = {
    Enter: (e) => {
      e.preventDefault();
      app.nextCard();
      resetCardLocalState();
    },
    ArrowRight: (e) => {
      e.preventDefault();
      app.nextCard();
      resetCardLocalState();
    },
    Backspace: (e) => {
      e.preventDefault();
      app.prevCard();
      resetCardLocalState();
    },
    ArrowLeft: (e) => {
      e.preventDefault();
      app.prevCard();
      resetCardLocalState();
    },
    Escape: (e) => {
      e.preventDefault();
      useCases.closeOverlaysByPriority();
    },
    '?': (e) => {
      e.preventDefault();
      app.toggleShortcuts();
    },
    Home: (e) => {
      e.preventDefault();
      useCases.jumpToFirst();
    },
    End: (e) => {
      e.preventDefault();
      useCases.jumpToLast();
    },
    ' ': (e) => {
      e.preventDefault();
      const debounceTime = CONFIG.audio?.debounce?.[currentCard.type] || 500;
      if (!debouncePassed(keyboardState.lastPlayTime, 'space', debounceTime)) return;

      let playBtnId = 'play-btn-main';
      if (currentCard.type === 'phrase') playBtnId = 'play-btn-phrase';
      else if (currentCard.type === 'sentence') playBtnId = 'play-btn-sentence';

      const audioText = currentCard.type === 'sentence' && currentCard.items?.[0]?.en
        ? currentCard.items[0].en
        : currentCard.word;
      app.playWord(audioText, playBtnId, false, false);
    }
  };

  const letterHandlers = {
    s: (e) => {
      e.preventDefault();
      if (!debouncePassed(keyboardState.lastPlayTime, 's', CONFIG.audio?.debounce?.word || 500)) return;
      if (!currentCard.synonyms || currentCard.synonyms.length === 0) return;

      const syn = currentCard.synonyms[keyboardState.synonymPlayIndex];
      const synWord = syn.word;
      const synBtnId = `play-btn-syn-${synWord.replace(/[^a-zA-Z0-9]/g, '-')}`;
      app.playWord(synWord, synBtnId, false, false);
      keyboardState.synonymPlayIndex = (keyboardState.synonymPlayIndex + 1) % currentCard.synonyms.length;
    },
    a: (e) => {
      e.preventDefault();
      const debounceTime = CONFIG.audio?.debounce?.[currentCard.type] || 500;
      if (!debouncePassed(keyboardState.lastPlayTime, 'a', debounceTime)) return;
      if (!currentCard.antonyms || currentCard.antonyms.length === 0) return;

      const ant = currentCard.antonyms[keyboardState.antonymPlayIndex];
      const antWord = ant.word;
      const antBtnId = `play-btn-ant-${antWord.replace(/[^a-zA-Z0-9]/g, '-')}`;
      app.playWord(antWord, antBtnId, false, false);
      keyboardState.antonymPlayIndex = (keyboardState.antonymPlayIndex + 1) % currentCard.antonyms.length;
    },
    t: (e) => {
      e.preventDefault();
      if (!debouncePassed(keyboardState.lastPlayTime, 't', 1000)) return;
      if (currentCard.type === 'phrase') app.translatePhrase();
      else if (currentCard.type === 'sentence') app.translateSentence();
    },
    y: (e) => {
      if (!isRecallMode) return;
      e.preventDefault();
      if (keyboardState.isConfirming) {
        app.confirmRecall(true);
        keyboardState.isConfirming = false;
      } else {
        app.handleRecall(true);
        keyboardState.isConfirming = true;
      }
    },
    '1': (e) => {
      if (!isRecallMode) return;
      e.preventDefault();
      if (keyboardState.isConfirming) {
        app.confirmRecall(true);
        keyboardState.isConfirming = false;
      } else {
        app.handleRecall(true);
        keyboardState.isConfirming = true;
      }
    },
    n: (e) => {
      if (!isRecallMode) return;
      e.preventDefault();
      if (keyboardState.isConfirming) {
        app.confirmRecall(false);
        keyboardState.isConfirming = false;
      } else {
        app.handleRecall(false);
      }
    },
    '2': (e) => {
      if (!isRecallMode) return;
      e.preventDefault();
      if (keyboardState.isConfirming) {
        app.confirmRecall(false);
        keyboardState.isConfirming = false;
      } else {
        app.handleRecall(false);
      }
    },
    m: (e) => {
      e.preventDefault();
      useCases.toggleMode();
    },
    p: (e) => {
      e.preventDefault();
      app.toggleAutoPlay();
    },
    l: (e) => {
      e.preventDefault();
      app.toggleStats();
    },
    f: (e) => {
      if (e.metaKey || e.ctrlKey) return;
      e.preventDefault();
      app.toggleFiles();
    }
  };

  return { plainHandlers, letterHandlers };
}

export function createKeyboardShortcutHandler(deps) {
  const { app, useCases, keyboardState, resetCardLocalState } = deps;

  return function handleKeyboardShortcuts(e) {
    if (shouldIgnoreShortcut(e)) return;

    const currentCard = getCurrentCardFromState(STATE);
    if (!currentCard) return;

    const { plainHandlers, letterHandlers } = createHandlers({
      app,
      useCases,
      keyboardState,
      resetCardLocalState,
      currentCard
    });

    const plainHandler = plainHandlers[e.key];
    if (plainHandler) {
      plainHandler(e);
      return;
    }

    const letterHandler = letterHandlers[e.key.toLowerCase()];
    if (letterHandler) {
      letterHandler(e);
    }
  };
}
