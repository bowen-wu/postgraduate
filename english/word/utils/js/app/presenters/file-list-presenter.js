export function renderRootFileList({ folders, files }) {
  let html = '<div style="padding: 0.5rem;"><strong>📚 选择文件夹:</strong></div>';

  if (folders.length > 0) {
    html += folders.map((folder) => `
      <div class="file-item" data-action="load-folder" data-path="${folder.name}">
        <span class="file-icon">📁</span>
        <span class="file-name">${folder.name}</span>
      </div>
    `).join('');
  }

  if (files.length > 0) {
    html += '<div style="padding: 0.5rem; margin-top: 0.5rem; border-top: 1px solid #e2e8f0;"><strong>📄 文件:</strong></div>';
    html += files.map((file) => `
      <div class="file-item" data-action="select-file" data-path="${file.name}" data-name="${file.name}">
        <span class="file-icon">📄</span>
        <span class="file-name">${file.name}</span>
      </div>
    `).join('');
  }

  return html;
}

export function renderFolderFileList({ path, folders, files }) {
  let html = `
    <div class="file-item" data-action="load-root-folders" style="color: var(--primary);">
      <span class="file-icon">⬅️</span>
      <span class="file-name">返回根目录</span>
    </div>
  `;

  if (path.includes('/')) {
    const parentPath = path.split('/').slice(0, -1).join('/');
    html += `
      <div class="file-item" data-action="load-folder" data-path="${parentPath}" style="color: var(--primary);">
        <span class="file-icon">⬆️</span>
        <span class="file-name">上级目录</span>
      </div>
    `;
  }

  html += `<div style="padding: 0.5rem;"><strong>📁 ${path}</strong></div>`;

  if (folders.length > 0) {
    html += folders.map((folder) => `
      <div class="file-item" data-action="load-folder" data-path="${path}/${folder.name}">
        <span class="file-icon">📁</span>
        <span class="file-name">${folder.name}</span>
      </div>
    `).join('');
  }

  if (files.length > 0) {
    html += '<div style="padding: 0.5rem; margin-top: 0.5rem; border-top: 1px solid #e2e8f0;"><strong>📄 文件:</strong></div>';
    html += files.map((file) => `
      <div class="file-item" data-action="select-file" data-path="${path}/${file.name}" data-name="${file.name}">
        <span class="file-icon">📄</span>
        <span class="file-name">${file.name}</span>
      </div>
    `).join('');
  }

  if (folders.length === 0 && files.length === 0) {
    html += `
      <div style="padding: 1rem; text-align: center; color: var(--secondary);">
        此文件夹为空
      </div>
    `;
  }

  return html;
}

export function renderFileListError(message, buttonText = '重试') {
  return `
    <div style="padding: 1rem; text-align: center; color: var(--danger);">
      <p>加载失败: ${message}</p>
      <button class="btn-primary" data-action="load-root-folders" style="margin-top: 1rem;">${buttonText}</button>
    </div>
  `;
}
