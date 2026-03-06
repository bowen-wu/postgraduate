import { STATE } from '../../config.js';

export function updateCurrentFileDisplay(ui, path) {
  const pathParts = path.split('/');
  const fileName = pathParts.pop().replace('.md', '');
  const directory = pathParts.length > 0 ? pathParts[0].charAt(0).toUpperCase() + pathParts[0].slice(1) : '';
  const displayText = directory ? `${directory} / ${fileName}` : fileName;

  ui.currentFileDisplay.textContent = displayText;
  const fileTitleText = document.getElementById('fileTitleText');
  if (fileTitleText) fileTitleText.textContent = displayText;
}

export function updateAutoPlayButton(ui) {
  if (STATE.autoPlay) {
    ui.btnAutoPlay.classList.add('active');
    ui.iconAutoPlayOff.classList.add('hidden');
    ui.iconAutoPlayOn.classList.remove('hidden');
  } else {
    ui.btnAutoPlay.classList.remove('active');
    ui.iconAutoPlayOff.classList.remove('hidden');
    ui.iconAutoPlayOn.classList.add('hidden');
  }
}

export function updateModeButtons(ui) {
  if (STATE.mode === 'input') {
    ui.btnInput.classList.add('active');
    ui.btnRecall.classList.remove('active');
  } else {
    ui.btnInput.classList.remove('active');
    ui.btnRecall.classList.add('active');
  }
}

export function updateBodyModeClass() {
  if (STATE.mode === 'recall') {
    document.body.classList.add('mode-recall');
  } else {
    document.body.classList.remove('mode-recall');
  }
}

export function updateOrderModeSelect() {
  const select = document.getElementById('orderModeSelect');
  const label = document.getElementById('orderModeLabel');
  if (!select || !label) return;

  const options = select.querySelectorAll('.custom-select-option');
  const activeOption = select.querySelector(`[data-value="${STATE.orderMode}"]`);
  if (!activeOption) return;

  label.textContent = activeOption.textContent;
  options.forEach((opt) => opt.classList.remove('selected'));
  activeOption.classList.add('selected');
}
