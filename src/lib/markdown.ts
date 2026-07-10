// 极简 Markdown -> HTML 渲染(不引入额外依赖)
// 支持:标题、段落、列表、代码块、行内代码、引用、链接、分隔线、粗体/斜体
// 转义 HTML 防注入

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function inline(text: string): string {
  let s = escapeHtml(text)
  // 行内代码
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>')
  // 粗体
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  // 斜体
  s = s.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
  // 链接 [text](url)
  s = s.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noreferrer">$1</a>',
  )
  return s
}

export function renderMarkdown(md: string): string {
  if (!md) return ''
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  const html: string[] = []
  let i = 0
  let inList: 'ul' | 'ol' | null = null

  const closeList = () => {
    if (inList) {
      html.push(`</${inList}>`)
      inList = null
    }
  }

  while (i < lines.length) {
    const line = lines[i]

    // 代码块
    if (line.trim().startsWith('```')) {
      closeList()
      const lang = line.trim().replace(/^```/, '').trim()
      const code: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        code.push(lines[i])
        i++
      }
      i++ // skip closing ```
      html.push(
        `<pre data-lang="${escapeHtml(lang)}"><code>${escapeHtml(code.join('\n'))}</code></pre>`,
      )
      continue
    }

    // 空行
    if (line.trim() === '') {
      closeList()
      i++
      continue
    }

    // 标题
    const h = line.match(/^(#{1,6})\s+(.*)$/)
    if (h) {
      closeList()
      const level = h[1].length
      html.push(`<h${level}>${inline(h[2])}</h${level}>`)
      i++
      continue
    }

    // 分隔线
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      closeList()
      html.push('<hr/>')
      i++
      continue
    }

    // 引用
    if (line.trim().startsWith('>')) {
      closeList()
      const quote = line.replace(/^\s*>\s?/, '')
      html.push(`<blockquote>${inline(quote)}</blockquote>`)
      i++
      continue
    }

    // 无序列表
    if (/^\s*[-*+]\s+/.test(line)) {
      if (inList !== 'ul') {
        closeList()
        html.push('<ul>')
        inList = 'ul'
      }
      html.push(`<li>${inline(line.replace(/^\s*[-*+]\s+/, ''))}</li>`)
      i++
      continue
    }

    // 有序列表
    if (/^\s*\d+\.\s+/.test(line)) {
      if (inList !== 'ol') {
        closeList()
        html.push('<ol>')
        inList = 'ol'
      }
      html.push(`<li>${inline(line.replace(/^\s*\d+\.\s+/, ''))}</li>`)
      i++
      continue
    }

    // 普通段落
    closeList()
    html.push(`<p>${inline(line)}</p>`)
    i++
  }
  closeList()
  return html.join('\n')
}
