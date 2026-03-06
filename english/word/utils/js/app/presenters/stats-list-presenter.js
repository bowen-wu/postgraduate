export function buildStatsRows({ cards, displayOrder, currentIndex, stats }) {
  const currentCardIndex = displayOrder[currentIndex];

  return cards.map((card, idx) => {
    const itemStats = stats[card.id];
    const errorCount = itemStats && itemStats.errors ? itemStats.errors : 0;
    let icon = '📝';
    if (card.type === 'phrase') icon = '🔗';
    if (card.type === 'sentence') icon = '💬';

    return {
      index: idx,
      isActive: idx === currentCardIndex,
      errorCount,
      icon,
      word: card.word.length > 18 ? `${card.word.substring(0, 18)}...` : card.word
    };
  });
}

export function renderStatsRows(rows) {
  return rows.map((row) => {
    const err = row.errorCount > 0 ? `(${row.errorCount})` : '';
    return `
      <div class="stat-row ${row.isActive ? 'active' : ''}" data-action="jump-to-original" data-index="${row.index}">
        <span class="stat-word"><span class="tag-pill">${row.icon}</span>${row.word}</span>
        <span class="stat-val" style="color:${row.errorCount > 0 ? 'var(--danger)' : 'inherit'}">${err}</span>
      </div>
    `;
  }).join('');
}
