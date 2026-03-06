export function createFileUseCases(deps) {
  const {
    state,
    stateManager,
    uiRenderer,
    gitHubApi,
    ParserClass,
    renderRootFileList,
    renderFolderFileList,
    renderFileListError,
    getApp,
    getUi
  } = deps;

  async function loadRootFolders(forceRefresh = false, ui = null) {
    const targetUi = getUi(ui);
    try {
      targetUi.fileListContainer.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--secondary);">正在加载文件列表...</div>';
      const { folders, files } = await gitHubApi.fetchFolderContents('', forceRefresh);
      targetUi.fileListContainer.innerHTML = renderRootFileList({ folders, files });
    } catch (e) {
      targetUi.fileListContainer.innerHTML = renderFileListError(e.message, '重试');
    }
  }

  async function loadFolder(path, forceRefresh = false, ui = null) {
    const targetUi = getUi(ui);
    try {
      targetUi.fileListContainer.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--secondary);">正在加载文件列表...</div>';
      const { folders, files } = await gitHubApi.fetchFolderContents(path, forceRefresh);
      targetUi.fileListContainer.innerHTML = renderFolderFileList({ path, folders, files });
    } catch (e) {
      targetUi.fileListContainer.innerHTML = renderFileListError(e.message, '返回根目录');
    }
  }

  async function toggleFiles(forceOpen = null, ui = null) {
    const targetUi = getUi(ui);
    const isOpening = forceOpen === true || (forceOpen === null && !targetUi.filePanel.classList.contains('open'));

    if (forceOpen === true) targetUi.filePanel.classList.add('open');
    else if (forceOpen === false) targetUi.filePanel.classList.remove('open');
    else targetUi.filePanel.classList.toggle('open');

    if (!isOpening) return;

    const currentContent = targetUi.fileListContainer.innerHTML;
    if (!currentContent ||
      currentContent.includes('加载中') ||
      currentContent.includes('加载文件夹') ||
      currentContent.includes('正在加载文件列表')) {
      await loadRootFolders(false, targetUi);
    }
  }

  async function loadFile(path, ui = null) {
    const targetUi = getUi(ui);
    try {
      targetUi.loader.classList.remove('hidden');
      targetUi.loader.innerHTML = '<div class="spinner"></div><p>正在下载文件...</p>';
      targetUi.card.classList.add('hidden');

      const relativePath = path.startsWith('english/word/') ? path.substring('english/word/'.length) : path;
      const text = await gitHubApi.fetchFileContent(relativePath);
      if (!text || text.trim().length === 0) throw new Error('数据为空');

      targetUi.loader.innerHTML = '<div class="spinner"></div><p>正在解析内容...</p>';

      const parser = new ParserClass(text);
      state.cards = parser.parse();

      // Debug: 打印生成的每一个 Card
      console.log('=== 生成的 Cards ===');
      console.log(`共 ${state.cards.length} 张卡片`);
      state.cards.forEach((card, index) => {
        console.log(`\n--- Card ${index + 1} ---`);
        console.log(JSON.stringify(card, null, 2));
      });
      console.log('=== Cards 打印结束 ===');

      if (state.cards.length === 0) throw new Error('解析后没有生成任何卡片，请检查数据格式');

      state.currentPath = relativePath;
      stateManager.loadStatsForFile(relativePath);
      stateManager.startSession();
      stateManager.saveState();
      uiRenderer.updateOrderModeSelect(targetUi);

      targetUi.loader.classList.add('hidden');
      targetUi.card.classList.remove('hidden');

      if (state.currentIndex === 0 && !document.getElementById('displayWord')) {
        uiRenderer.updateCurrentFileDisplay(targetUi, relativePath);
        getApp().restart();
      } else {
        uiRenderer.updateCurrentFileDisplay(targetUi, relativePath);
        getApp().render();
      }

      uiRenderer.updateStatsUI(targetUi);
      uiRenderer.showToast(targetUi, `解析完成：${state.cards.length} 张卡片`);
    } catch (e) {
      const errorMsg = e.name === 'AbortError' ? '请求超时，请检查网络连接' : e.message;
      targetUi.loader.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
          <p style="color:red; font-size: 1.1rem; margin-bottom: 1rem;">加载失败: ${errorMsg}</p>
          <p style="color: #666; font-size: 0.9rem; margin-bottom: 1rem;">请检查网络连接或数据源</p>
          <p style="color: #999; font-size: 0.8rem; margin-bottom: 1rem;">路径: ${path}</p>
          <button class="btn-primary" data-action="reload-page" style="margin-top: 1rem;">重新加载</button>
        </div>
      `;
    }
  }

  async function confirmSwitchFile(path, ui = null) {
    const targetUi = getUi(ui);
    try {
      targetUi.filePanel.classList.remove('open');
      targetUi.loader.classList.remove('hidden');
      targetUi.loader.innerHTML = '<div class="spinner"></div><p>正在加载文件...</p>';

      if (state.currentPath && state.cards.length > 0) {
        stateManager.saveState();
      }

      state.cards = [];
      state.currentIndex = 0;
      await loadFile(path, targetUi);

      const fileInfo = document.querySelector('.current-file-info');
      if (fileInfo) {
        fileInfo.innerHTML = `<span>📄</span><span>当前文件: <strong>${state.currentPath}</strong></span>`;
      }
    } catch (e) {
      uiRenderer.showToast(targetUi, `切换文件失败: ${e.message}`);
      targetUi.filePanel.classList.add('open');
    }
  }

  function selectFile(path, name) {
    if (path === state.currentPath) {
      toggleFiles();
      return;
    }

    const hasStarted = state.cards.length > 0 && state.currentIndex > 0;
    let message = `确定要切换到文件 <span class="highlight">${name}</span> 吗？`;
    if (hasStarted) {
      message += '<br><br>当前文件的学习进度将被保存。';
    }
    getApp().confirmDialog.show(message, () => confirmSwitchFile(path));
  }

  async function refreshFileList() {
    try {
      gitHubApi.clearCache();
      const currentPath = stateManager.getCurrentFolderPath();
      if (currentPath === null) await loadRootFolders(true);
      else await loadFolder(currentPath, true);
      uiRenderer.showToast(getApp().ui, '✅ 列表已刷新');
    } catch (e) {
      uiRenderer.showToast(getApp().ui, `❌ 刷新失败: ${e.message}`);
    }
  }

  return {
    toggleFiles,
    loadRootFolders,
    loadFolder,
    selectFile,
    confirmSwitchFile,
    loadFile,
    refreshFileList
  };
}
