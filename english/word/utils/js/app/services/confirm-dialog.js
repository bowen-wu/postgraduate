export function createConfirmDialog(ui) {
  return {
    confirmCallback: null,

    show(message, onConfirm, title = '切换文件') {
      const overlay = ui.confirmDialog;
      const msgEl = ui.dialogMessage;
      const confirmBtn = ui.dialogConfirmBtn;
      const titleEl = overlay.querySelector('.dialog-title span');

      msgEl.innerHTML = message;
      if (titleEl) titleEl.textContent = title;
      this.confirmCallback = onConfirm;

      confirmBtn.onclick = () => {
        if (this.confirmCallback) {
          const callback = this.confirmCallback;
          this.confirmCallback = null;
          callback();
        }
        this.hide();
      };

      overlay.classList.add('show');
    },

    hide() {
      ui.confirmDialog.classList.remove('show');
      this.confirmCallback = null;
    },

    cancel() {
      this.hide();
    }
  };
}
