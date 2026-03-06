export function setupOrderModeSelect(app) {
  const customSelect = document.getElementById('orderModeSelect');
  if (!customSelect) return;

  const trigger = customSelect.querySelector('.custom-select-trigger');
  const label = document.getElementById('orderModeLabel');
  const options = customSelect.querySelectorAll('.custom-select-option');

  trigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    customSelect.classList.toggle('open');
  });

  options.forEach((option) => {
    option.addEventListener('click', () => {
      const value = option.dataset.value;
      if (!value) return;

      label.textContent = option.textContent;
      options.forEach((opt) => opt.classList.remove('selected'));
      option.classList.add('selected');
      customSelect.classList.remove('open');
      app.setOrderMode(value);
    });
  });

  document.addEventListener('click', () => {
    customSelect.classList.remove('open');
  });

  customSelect.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      customSelect.classList.toggle('open');
    } else if (e.key === 'Escape') {
      customSelect.classList.remove('open');
    }
  });
}
