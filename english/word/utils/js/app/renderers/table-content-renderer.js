function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderTableItems(ui, card) {
  const headers = Array.isArray(card.headers) ? card.headers : [];
  const rows = Array.isArray(card.rows) ? card.rows : [];
  const li = document.createElement('li');
  li.className = 'item table-card-item';
  li.innerHTML = `
    <div class="sentence-table-wrapper">
      <table class="sentence-table">
        <thead>
          <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr>${headers.map((_header, index) => `<td>${escapeHtml(row[index] || '')}</td>`).join('')}</tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  ui.list.appendChild(li);
}
