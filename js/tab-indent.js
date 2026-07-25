/**
 * 给 Markdown 中用 Tab 键缩进的段落添加首行缩进
 * Hexo 渲染后 Tab 会变成零宽空格 U+200B
 */
(() => {
  const ZWSP = '​';

  function applyIndent(container) {
    if (!container) return;
    const paragraphs = container.querySelectorAll('p');
    paragraphs.forEach(p => {
      // 只对以零宽空格（Tab 产物）开头的段落加缩进
      if (p.textContent.startsWith(ZWSP)) {
        p.style.textIndent = '2em';
      }
    });
  }

  // 文章详情页
  applyIndent(document.getElementById('article-container'));

  // 首页摘要（Butterfly 用的 .content）
  document.querySelectorAll('.recent-post-info .content').forEach(applyIndent);
})();
