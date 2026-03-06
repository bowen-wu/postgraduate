export function renderCompletionScreen(ui, deps) {
  const { state, stateManager, triggerConfetti } = deps;

  state.completed = true;
  stateManager.saveState();
  stateManager.endSession();
  const stats = stateManager.getSessionStats();

  const formatTime = (timestamp) => {
    if (!timestamp) return '--';
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!document.getElementById('completion-mobile-style')) {
    const style = document.createElement('style');
    style.id = 'completion-mobile-style';
    style.textContent = `
      @media (max-width: 480px) {
        .completion-container { padding: 1rem !important; }
        .completion-emoji { font-size: 2.5rem !important; }
        .completion-title { font-size: 1.25rem !important; }
        .completion-stats-grid { grid-template-columns: repeat(3, 1fr) !important; gap: 0.5rem !important; }
        .completion-stats-value { font-size: 1.25rem !important; }
        .completion-stats-label { font-size: 0.7rem !important; }
        .completion-progress-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 0.75rem !important; }
        .completion-progress-value { font-size: 1.1rem !important; }
        .completion-time-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 0.75rem !important; }
        .completion-time-value { font-size: 1.1rem !important; }
        .completion-time-detail { font-size: 0.65rem !important; flex-direction: row !important; justify-content: space-between !important; gap: 0.5rem !important; }
        .completion-buttons { flex-direction: column !important; align-items: center !important; }
        .completion-buttons button { width: auto !important; min-width: 140px !important; padding: 0.6rem 1.5rem !important; }
      }
    `;
    document.head.appendChild(style);
  }

  ui.card.innerHTML = `
    <div class="completion-container" style="height: 100%; overflow-y: auto; padding: 1.5rem;">
      <div class="completion-header" style="text-align: center; padding-bottom: 1rem;">
        <div class="completion-emoji" style="font-size: 3rem; margin-bottom: 0.5rem;">🎉</div>
        <h2 class="completion-title" style="font-size: 1.5rem; color: var(--primary); margin-bottom: 0.5rem;">完结撒花！</h2>
        <p style="font-size: 1rem; color: var(--text-sub); margin-bottom: 1.5rem;">恭喜你完成了本单元学习！</p>
      </div>
      <div style="background: var(--card-bg); padding: 1rem; border-radius: 12px; margin-bottom: 1rem;">
        <div class="completion-stats-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem;">
          <div style="text-align: center;"><div class="completion-stats-value" style="font-size: 1.5rem; font-weight: 700; color: var(--primary);">${stats.totalCards}</div><div class="completion-stats-label" style="font-size: 0.75rem; color: var(--text-sub);">总卡片</div></div>
          <div style="text-align: center;"><div class="completion-stats-value" style="font-size: 1.5rem; font-weight: 700; color: var(--danger);">${stats.totalErrors}</div><div class="completion-stats-label" style="font-size: 0.75rem; color: var(--text-sub);">错误次数</div></div>
          <div style="text-align: center;"><div class="completion-stats-value" style="font-size: 1.5rem; font-weight: 700; color: var(--success);">${stats.accuracy}%</div><div class="completion-stats-label" style="font-size: 0.75rem; color: var(--text-sub);">正确率</div></div>
        </div>
      </div>
      <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding: 1rem 1.25rem; border-radius: 12px; margin-bottom: 1rem; border: 1px solid #bbf7d0;">
        <div class="completion-progress-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
          <div style="text-align: left;"><div style="font-size: 0.75rem; color: #166534; margin-bottom: 0.25rem; font-weight: 600;">✅ 一次掌握</div><div class="completion-progress-value" style="font-size: 1.25rem; font-weight: 700; color: #16a34a;">${stats.cardsMastered}</div></div>
          <div style="text-align: left;"><div style="font-size: 0.75rem; color: #991b1b; margin-bottom: 0.25rem; font-weight: 600;">🔄 需复习</div><div class="completion-progress-value" style="font-size: 1.25rem; font-weight: 700; color: #dc2626;">${stats.cardsNeedingReview}</div></div>
        </div>
      </div>
      <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 1rem 1.25rem; border-radius: 12px; margin-bottom: 1rem; border: 1px solid #fcd34d;">
        <div class="completion-time-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
          <div style="text-align: left;"><div style="font-size: 0.75rem; color: #92400e; margin-bottom: 0.25rem; font-weight: 600;">⏱️ 学习时长</div><div class="completion-time-value" style="font-size: 1.25rem; font-weight: 700; color: #d97706;">${stateManager.formatDuration(stats.duration)}</div></div>
          <div style="text-align: left;"><div style="font-size: 0.75rem; color: #92400e; margin-bottom: 0.25rem; font-weight: 600;">📊 平均每卡</div><div class="completion-time-value" style="font-size: 1.25rem; font-weight: 700; color: #d97706;">${stateManager.formatDuration(stats.avgTimePerCard)}</div></div>
        </div>
        <div class="completion-time-detail" style="margin-top: 0.75rem; padding-top: 0.5rem; border-top: 1px dashed #fbbf24; font-size: 0.7rem; color: #78350f; display: flex; justify-content: space-between;">
          <span>🕐 ${formatTime(stats.startTime)}</span><span>🏁 ${formatTime(stats.endTime)}</span>
        </div>
      </div>
      <div class="completion-buttons" style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; padding-top: 0.5rem;">
        <button class="btn-primary" data-action="restart" style="font-size: 1rem; padding: 0.6rem 1.5rem;">🔄 重新开始</button>
        <button class="btn-ghost" data-action="clear-data-reload" style="font-size: 1rem; padding: 0.6rem 1.5rem;">🗑️ 清除进度</button>
      </div>
    </div>
  `;

  ui.actionArea.innerHTML = '';
  ui.progress.textContent = `${stats.totalCards} / ${stats.totalCards}`;
  triggerConfetti();
}
