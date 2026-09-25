/**
 * 独立搜索页：顶栏只保留入口，搜索交互全部在 /search/ 中完成。
 */
(() => {
  const SEARCH_PATH = '/search/'
  let searchEntriesPromise

  function createNavSearchLink () {
    const menus = document.getElementById('menus')
    if (!menus || menus.querySelector('.nav-search-link')) return

    const link = document.createElement('a')
    link.className = 'site-page nav-search-link'
    link.href = SEARCH_PATH
    link.setAttribute('aria-label', '进入搜索页')

    const icon = document.createElement('i')
    icon.className = 'fas fa-search fa-fw'
    icon.setAttribute('aria-hidden', 'true')

    const label = document.createElement('span')
    label.textContent = ' 搜索'
    link.append(icon, label)

    const menuItems = menus.querySelector('.menus_items')
    menus.insertBefore(link, menuItems || menus.firstChild)
  }

  function htmlToText (html) {
    const doc = new DOMParser().parseFromString(html || '', 'text/html')
    return (doc.body.textContent || '').replace(/\s+/g, ' ').trim()
  }

  async function loadSearchEntries () {
    if (!searchEntriesPromise) {
      searchEntriesPromise = fetch('/search.xml')
        .then(response => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`)
          return response.text()
        })
        .then(text => {
          const xml = new DOMParser().parseFromString(text, 'application/xml')
          if (xml.querySelector('parsererror')) throw new Error('搜索索引解析失败')

          return Array.from(xml.querySelectorAll('entry')).map(entry => ({
            title: entry.querySelector('title')?.textContent?.trim() || '无标题',
            content: htmlToText(entry.querySelector('content')?.textContent || ''),
            url: entry.querySelector('url')?.textContent?.trim() || '#'
          }))
        })
    }

    return searchEntriesPromise
  }

  function countMatches (text, keyword) {
    let count = 0
    let fromIndex = 0
    while ((fromIndex = text.indexOf(keyword, fromIndex)) !== -1) {
      count += 1
      fromIndex += keyword.length
    }
    return count
  }

  function makeSnippet (content, keywords) {
    const lowerContent = content.toLowerCase()
    const positions = keywords
      .map(keyword => lowerContent.indexOf(keyword))
      .filter(position => position >= 0)
    const firstMatch = positions.length ? Math.min(...positions) : 0
    const start = Math.max(0, firstMatch - 55)
    const end = Math.min(content.length, start + 190)
    return `${start > 0 ? '……' : ''}${content.slice(start, end)}${end < content.length ? '……' : ''}`
  }

  function appendHighlightedText (element, text, keywords) {
    if (!keywords.length) {
      element.textContent = text
      return
    }

    const pattern = new RegExp(`(${keywords.map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'ig')
    const parts = text.split(pattern)
    for (const part of parts) {
      if (keywords.some(keyword => part.toLowerCase() === keyword)) {
        const mark = document.createElement('mark')
        mark.textContent = part
        element.append(mark)
      } else {
        element.append(document.createTextNode(part))
      }
    }
  }

  function updateQueryString (query) {
    const url = new URL(window.location.href)
    if (query) url.searchParams.set('q', query)
    else url.searchParams.delete('q')
    window.history.replaceState({}, '', url)
  }

  async function renderResults (query) {
    const resultsContainer = document.getElementById('standalone-search-results')
    const summary = document.getElementById('standalone-search-summary')
    if (!resultsContainer || !summary) return

    resultsContainer.replaceChildren()
    const normalizedQuery = query.trim()
    updateQueryString(normalizedQuery)

    if (!normalizedQuery) {
      summary.textContent = '输入关键词，即可搜索文章标题和正文。'
      return
    }

    summary.textContent = '正在搜索……'

    try {
      const entries = await loadSearchEntries()
      const keywords = normalizedQuery.toLowerCase().split(/\s+/).filter(Boolean)
      const results = entries.map(entry => {
        const titleLower = entry.title.toLowerCase()
        const contentLower = entry.content.toLowerCase()
        const matched = keywords.every(keyword => titleLower.includes(keyword) || contentLower.includes(keyword))
        const score = keywords.reduce((total, keyword) => {
          return total + countMatches(titleLower, keyword) * 10 + countMatches(contentLower, keyword)
        }, 0)
        return { ...entry, matched, score }
      }).filter(item => item.matched).sort((a, b) => b.score - a.score)

      summary.textContent = `找到 ${results.length} 篇与“${normalizedQuery}”相关的文章`

      results.slice(0, 30).forEach(result => {
        const article = document.createElement('article')
        article.className = 'standalone-search-result'

        const heading = document.createElement('h2')
        const link = document.createElement('a')
        link.href = result.url
        appendHighlightedText(link, result.title, keywords)

        const snippet = document.createElement('p')
        appendHighlightedText(snippet, makeSnippet(result.content, keywords), keywords)

        heading.append(link)
        article.append(heading, snippet)
        resultsContainer.append(article)
      })
    } catch (error) {
      summary.textContent = `搜索加载失败：${error.message}`
    }
  }

  function initializeSearchPage () {
    const input = document.getElementById('standalone-search-input')
    const clearButton = document.getElementById('standalone-search-clear')
    if (!input || !clearButton) return

    const initialQuery = new URLSearchParams(window.location.search).get('q') || ''
    input.value = initialQuery

    let timer
    input.addEventListener('input', () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => renderResults(input.value), 160)
    })

    clearButton.addEventListener('click', () => {
      input.value = ''
      input.focus()
      renderResults('')
    })

    renderResults(initialQuery)
    window.setTimeout(() => input.focus(), 0)
  }

  createNavSearchLink()
  initializeSearchPage()
})()
