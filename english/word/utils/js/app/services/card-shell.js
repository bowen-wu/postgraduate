export function hasCardShell() {
  return Boolean(document.getElementById('displayWord'));
}

export function buildCardShellHtml() {
  return `
    <header class="card-header">
      <div class="word-title-group">
        <span class="main-word" id="displayWord">Loading...</span>
        <span class="pronunciation" id="displayPronunciation"></span>
      </div>
      <div class="badges" id="displayBadges"></div>
    </header>
    <div class="card-body">
      <ul class="item-list" id="itemList"></ul>
    </div>
    <footer class="card-footer">
      <button class="btn-ghost" data-action="prev-card" id="btnPrev">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
        上一个
      </button>
      <span class="progress-indicator" id="progressText">0 / 0</span>
      <div class="action-area" id="actionArea"></div>
    </footer>
  `;
}

export function refreshCardUiRefs(ui) {
  ui.word = document.getElementById('displayWord');
  ui.ipa = document.getElementById('displayPronunciation');
  ui.badges = document.getElementById('displayBadges');
  ui.list = document.getElementById('itemList');
  ui.progress = document.getElementById('progressText');
  ui.actionArea = document.getElementById('actionArea');
  ui.btnPrev = document.getElementById('btnPrev');
}
