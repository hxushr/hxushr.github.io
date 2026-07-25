/**
 * 首页大标题诗句循环展示
 * 只替换首页 hero #site-title，导航栏保持原样
 * 使用 localStorage 记录进度，跨页面连续切换
 */
(async () => {
  // ========== 可配置项 ==========
  const CONFIG = {
    interval: 10000,          // 自动切换间隔（毫秒）
    fadeDuration: 600,       // 淡入淡出时长（毫秒）
    dataUrl: '/data/verses.json',
    startIndex: 0,           // 首次访问从第几句开始（-1 = 随机）
  };
  const STORAGE_KEY = 'verse-cycle-index';

  // ========== 只在首页执行 ==========
  const heroTitle = document.querySelector('#site-title');
  if (!heroTitle) return;

  // ========== 加载诗句 ==========
  let verses = [];
  try {
    const resp = await fetch(CONFIG.dataUrl);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    verses = await resp.json();
    if (!Array.isArray(verses) || verses.length === 0) {
      console.warn('[verse-cycle] verses.json 为空，保留原始标题');
      return;
    }
  } catch (err) {
    console.warn('[verse-cycle] 加载失败，保留原始标题:', err.message);
    return;
  }

  // ========== 初始化下标 ==========
  // 优先从 localStorage 恢复，实现跨页面连续
  const savedIndex = parseInt(localStorage.getItem(STORAGE_KEY), 10);
  let index;
  if (!isNaN(savedIndex) && savedIndex >= 0 && savedIndex < verses.length) {
    index = savedIndex;
  } else if (CONFIG.startIndex >= 0) {
    index = CONFIG.startIndex % verses.length;
  } else {
    index = Math.floor(Math.random() * verses.length);
  }

  let timer = null;

  function showVerse(i) {
    heroTitle.textContent = verses[i];
  }

  function switchVerse(i) {
    // 带淡入淡出动画
    heroTitle.style.transition = `opacity ${CONFIG.fadeDuration}ms ease`;
    heroTitle.style.opacity = '0';
    setTimeout(() => {
      heroTitle.textContent = verses[i];
      heroTitle.style.opacity = '1';
    }, CONFIG.fadeDuration);
  }

  function next() {
    switchVerse(index);
    index = (index + 1) % verses.length;
    localStorage.setItem(STORAGE_KEY, index);
  }

  function resetTimer() {
    clearInterval(timer);
    timer = setInterval(next, CONFIG.interval);
  }

  // 初始显示当前句（无动画），然后指针前进
  showVerse(index);
  index = (index + 1) % verses.length;
  localStorage.setItem(STORAGE_KEY, index);

  // 启动定时器
  resetTimer();

  // ========== 点击导航菜单立即切下一句 ==========
  document.querySelectorAll('#menus .menus_item a, #sidebar-menus .menus_item a').forEach(link => {
    link.addEventListener('click', () => {
      next();
      resetTimer();
    });
  });
})();
