import { STATE } from '../../config.js';

export function reveal(el) {
  if (STATE.mode === 'recall') {
    el.classList.add('revealed');
  }
}

export function revealAll() {
  document.querySelectorAll('.cn-text, .en-text, .blur-target').forEach((el) => el.classList.add('revealed'));
  const synonymsSection = document.querySelector('.synonyms-section');
  if (synonymsSection) synonymsSection.classList.add('revealed');
  const itemList = document.querySelector('.item-list');
  if (itemList) itemList.classList.add('revealed');
}

export function showSentenceTranslation(ui, mode, rerenderActions) {
  const cnDiv = document.getElementById('sentenceCn');
  if (cnDiv) {
    cnDiv.style.display = 'block';
    cnDiv.classList.add('revealed');
  }
  rerenderActions(mode, ui);
}

export function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}

export function triggerConfetti() {
  const emojis = ['🎉', '🎊', '✨', '⭐', '🌟', '💫', '🎈', '🎁'];
  const container = document.querySelector('main');
  if (!container) return;

  for (let i = 0; i < 30; i++) {
    setTimeout(() => {
      const confetti = document.createElement('div');
      confetti.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      confetti.style.cssText = `
        position: absolute;
        font-size: ${Math.random() * 20 + 15}px;
        left: ${Math.random() * 100}%;
        top: 0px;
        animation: fall-new ${Math.random() * 2 + 2}s linear forwards;
        pointer-events: none;
        z-index: 1000;
      `;
      container.appendChild(confetti);
      setTimeout(() => confetti.remove(), 4000);
    }, i * 50);
  }

  if (!document.getElementById('confetti-style-fixed')) {
    const style = document.createElement('style');
    style.id = 'confetti-style-fixed';
    style.textContent = `
      @keyframes fall-new {
        0% { transform: translateY(0) rotate(0deg); opacity: 1; }
        100% { transform: translateY(80vh) rotate(720deg); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
}
