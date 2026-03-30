import { marked } from 'marked'

/**
 * 마크다운 문자열을 스타일이 적용된 A4 PDF Buffer로 변환합니다.
 * puppeteer는 이 함수가 호출될 때만 불러옵니다(서버 기동 시 메모리·로딩 부담 감소).
 */
export async function markdownToPdf(markdown: string): Promise<Buffer> {
  const html = marked.parse(markdown) as string

  const headerTemplate = `
    <div style="
      width: 100%;
      padding: 0 16mm;
      box-sizing: border-box;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-family: -apple-system, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
      font-size: 7pt;
      border-bottom: 0.5px solid #e2e8f0;
      padding-bottom: 5px;
    ">
      <div style="display:flex; align-items:center; gap:6px;">
        <div style="width:14px; height:14px; background:linear-gradient(135deg,#1e3a8a,#3b82f6); border-radius:3px;"></div>
        <span style="font-weight:700; color:#1e3a8a; letter-spacing:2px; font-size:6.5pt;">TESTPLANNER</span>
      </div>
      <span style="color:#94a3b8;">QA 테스트케이스 보고서</span>
    </div>
  `

  const footerTemplate = `
    <div style="
      width: 100%;
      padding: 0 16mm;
      box-sizing: border-box;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-family: -apple-system, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
      font-size: 7pt;
      color: #94a3b8;
      border-top: 0.5px solid #e2e8f0;
      padding-top: 5px;
    ">
      <span>AI 기반 자동 생성 · TestPlanner</span>
      <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
    </div>
  `

  const styledHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    :root {
      --primary:       #1e3a8a;
      --primary-mid:   #2563eb;
      --primary-light: #3b82f6;
      --accent:        #f59e0b;
      --text:          #0f172a;
      --text-muted:    #64748b;
      --border:        #e2e8f0;
      --bg-light:      #f8fafc;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, 'Apple SD Gothic Neo', 'Noto Sans CJK KR',
                   'Malgun Gothic', 'Nanum Gothic', sans-serif;
      font-size: 10pt;
      line-height: 1.75;
      color: var(--text);
      background: #ffffff;
      /* @page 좌우 마진을 0으로 두고, 여기서 패딩으로 처리 → h1 full-width 음수마진이 동작함 */
      padding: 0 16mm;
    }

    /* ─────────────────────────────
       COVER — H1
    ───────────────────────────── */
    h1 {
      position: relative;
      background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #1d4ed8 100%);
      color: white;
      font-size: 23pt;
      font-weight: 800;
      letter-spacing: -0.6pt;
      padding: 34pt 28pt 30pt;
      /* 상단은 0 유지 (헤더와 겹침 방지), 좌우만 마진 밖으로 확장 */
      margin: 0 -16mm 30pt;
      overflow: hidden;
    }

    /* "QA TEST REPORT" 서브레이블 */
    h1::before {
      content: 'QA TEST REPORT';
      display: block;
      font-size: 6.5pt;
      font-weight: 600;
      letter-spacing: 4pt;
      color: rgba(255, 255, 255, 0.45);
      margin-bottom: 10pt;
      text-transform: uppercase;
    }

    /* 우상단 장식 원 */
    h1::after {
      content: '';
      position: absolute;
      right: -30pt;
      top: -30pt;
      width: 160pt;
      height: 160pt;
      border-radius: 50%;
      border: 25pt solid rgba(255, 255, 255, 0.05);
    }

    /* 하단 황금 라인 */
    h1 > * { position: relative; z-index: 1; }

    /* ─────────────────────────────
       SECTION HEADERS — H2
    ───────────────────────────── */
    h2 {
      font-size: 12pt;
      font-weight: 700;
      color: #ffffff;
      padding: 9pt 16pt 9pt 14pt;
      margin: 24pt 0 13pt;
      background: linear-gradient(90deg, var(--primary) 0%, var(--primary-light) 100%);
      border-radius: 5pt;
      letter-spacing: -0.2pt;
      page-break-after: avoid;
    }

    /* ─────────────────────────────
       SUB HEADERS — H3
    ───────────────────────────── */
    h3 {
      font-size: 10.5pt;
      font-weight: 700;
      color: var(--primary);
      padding: 0 0 5pt;
      margin: 16pt 0 9pt;
      border-bottom: 2pt solid #dbeafe;
      page-break-after: avoid;
    }

    /* ─────────────────────────────
       TESTCASE CARDS — H4
    ───────────────────────────── */
    h4 {
      font-size: 9.5pt;
      font-weight: 700;
      color: var(--text);
      margin: 13pt 0 5pt;
      padding: 8pt 12pt 8pt 14pt;
      background: linear-gradient(90deg, #f0f9ff, #f8fafc);
      border-left: 3.5pt solid var(--primary-light);
      border-radius: 0 4pt 4pt 0;
      page-break-after: avoid;
    }

    /* ─────────────────────────────
       TABLES
    ───────────────────────────── */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10pt 0 16pt;
      font-size: 9pt;
      border-radius: 7pt;
      overflow: hidden;
      /* 외곽 그림자 효과 */
      box-shadow:
        0 0 0 1pt #e2e8f0,
        0 2pt 6pt rgba(0, 0, 0, 0.07);
      page-break-inside: auto;
    }

    thead tr {
      background: linear-gradient(90deg, var(--primary), var(--primary-mid));
    }

    th {
      color: #ffffff;
      font-weight: 600;
      padding: 8pt 11pt;
      text-align: left;
      font-size: 8.5pt;
      letter-spacing: 0.15pt;
    }

    td {
      padding: 7pt 11pt;
      border-bottom: 0.75pt solid #f1f5f9;
      vertical-align: top;
      line-height: 1.55;
    }

    tbody tr:nth-child(even) td { background: #f8fafc; }
    tbody tr:last-child td { border-bottom: none; }
    tr { page-break-inside: avoid; }

    /* ─────────────────────────────
       RISK / STATUS BADGES
    ───────────────────────────── */
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 3pt;
      padding: 2pt 8pt;
      border-radius: 20pt;
      font-size: 7.5pt;
      font-weight: 700;
      letter-spacing: 0.1pt;
      white-space: nowrap;
    }

    .badge-low      { background: #dcfce7; color: #166534; border: 0.75pt solid #86efac; }
    .badge-medium   { background: #fef3c7; color: #92400e; border: 0.75pt solid #fcd34d; }
    .badge-high     { background: #fee2e2; color: #991b1b; border: 0.75pt solid #fca5a5; }
    .badge-critical { background: #f3e8ff; color: #6b21a8; border: 0.75pt solid #d8b4fe; }

    .badge-added    { background: #dcfce7; color: #166534; border: 0.75pt solid #86efac; }
    .badge-modified { background: #fef3c7; color: #92400e; border: 0.75pt solid #fcd34d; }
    .badge-deleted  { background: #fee2e2; color: #991b1b; border: 0.75pt solid #fca5a5; }
    .badge-renamed  { background: #dbeafe; color: #1e40af; border: 0.75pt solid #93c5fd; }

    /* ─────────────────────────────
       STAT BAR (변경 통계용)
    ───────────────────────────── */
    .stat-row {
      display: flex;
      gap: 12pt;
      margin: 8pt 0 14pt;
    }
    .stat-card {
      flex: 1;
      background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
      border: 0.75pt solid #bae6fd;
      border-radius: 7pt;
      padding: 10pt 14pt;
    }
    .stat-label { font-size: 7.5pt; color: #0369a1; font-weight: 600; letter-spacing: 0.3pt; }
    .stat-value { font-size: 15pt; font-weight: 800; color: #0f172a; margin-top: 2pt; }

    /* ─────────────────────────────
       TEXT ELEMENTS
    ───────────────────────────── */
    p { margin-bottom: 6pt; }
    strong { font-weight: 700; }
    em { color: var(--text-muted); font-style: italic; }

    ul { padding-left: 14pt; margin: 5pt 0 8pt; list-style-type: disc; }
    ol { padding-left: 16pt; margin: 5pt 0 8pt; }
    li { margin-bottom: 4pt; }
    li > ul, li > ol { margin-top: 3pt; }

    /* ─────────────────────────────
       CODE
    ───────────────────────────── */
    code {
      font-family: 'SF Mono', 'Courier New', Courier, monospace;
      font-size: 8pt;
      background: #f1f5f9;
      padding: 1.5pt 4pt;
      border-radius: 3pt;
      color: #be123c;
      border: 0.5pt solid #e2e8f0;
    }

    pre {
      background: #0f172a;
      border-radius: 6pt;
      padding: 12pt 14pt;
      margin: 8pt 0;
      overflow: hidden;
    }
    pre code {
      background: none;
      border: none;
      color: #e2e8f0;
      font-size: 8pt;
      padding: 0;
      line-height: 1.6;
    }

    /* ─────────────────────────────
       BLOCKQUOTE
    ───────────────────────────── */
    blockquote {
      border-left: 3pt solid var(--primary-light);
      padding: 7pt 14pt;
      color: #475569;
      margin: 8pt 0;
      background: #f0f9ff;
      border-radius: 0 5pt 5pt 0;
    }

    /* ─────────────────────────────
       DIVIDER
    ───────────────────────────── */
    hr {
      border: none;
      height: 1pt;
      background: linear-gradient(90deg, var(--primary-light) 0%, #e2e8f0 50%, transparent 100%);
      margin: 18pt 0;
    }

    /* ─────────────────────────────
       PAGE
    ───────────────────────────── */
    @page {
      size: A4;
      /* 좌우 마진 0 → body padding이 좌우 여백 담당 → h1 음수마진 full-width 가능 */
      margin: 25mm 0 20mm;
    }
  </style>
</head>
<body>
  ${html}
</body>
</html>`

  const puppeteer = (await import('puppeteer')).default
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })

  try {
    const page = await browser.newPage()
    await page.setContent(styledHtml, { waitUntil: 'domcontentloaded' })

    /* ── DOM 후처리: 배지·스탯 카드 주입 ── */
    await page.evaluate(() => {
      const riskMap: Record<string, { cls: string; label: string }> = {
        '낮음 (Low)':        { cls: 'badge-low',      label: '낮음 · Low' },
        '보통 (Medium)':     { cls: 'badge-medium',   label: '보통 · Medium' },
        '높음 (High)':       { cls: 'badge-high',     label: '높음 · High' },
        '치명적 (Critical)': { cls: 'badge-critical', label: '치명적 · Critical' },
      }
      const statusMap: Record<string, { cls: string; label: string }> = {
        added:    { cls: 'badge-added',    label: '추가됨' },
        modified: { cls: 'badge-modified', label: '수정됨' },
        deleted:  { cls: 'badge-deleted',  label: '삭제됨' },
        renamed:  { cls: 'badge-renamed',  label: '이름변경' },
      }

      document.querySelectorAll<HTMLElement>('td').forEach((td) => {
        const text = td.textContent?.trim() ?? ''

        // 위험도 배지
        if (riskMap[text]) {
          const { cls, label } = riskMap[text]
          td.innerHTML = `<span class="badge ${cls}">${label}</span>`
          return
        }

        // 파일 상태 배지
        if (statusMap[text]) {
          const { cls, label } = statusMap[text]
          td.innerHTML = `<span class="badge ${cls}">${label}</span>`
          return
        }

        // 추가 라인(+N) 녹색, 삭제 라인(-N) 빨간색
        if (/^\+\d+$/.test(text)) {
          td.style.color = '#16a34a'
          td.style.fontWeight = '700'
        } else if (/^-\d+$/.test(text)) {
          td.style.color = '#dc2626'
          td.style.fontWeight = '700'
        }
      })

      // "전체 위험도" 셀 강조
      document.querySelectorAll<HTMLElement>('td').forEach((td) => {
        const prev = td.previousElementSibling as HTMLElement | null
        if (prev?.textContent?.trim() === '전체 위험도') {
          td.style.fontWeight = '700'
        }
      })

      // ### 파일 변경 통계 아래 li 들을 stat-card 형태로 교체
      const h3List = Array.from(document.querySelectorAll<HTMLElement>('h3'))
      const statH3 = h3List.find((h) => h.textContent?.includes('파일 변경 통계'))
      if (statH3) {
        const ul = statH3.nextElementSibling as HTMLElement | null
        if (ul && ul.tagName === 'UL') {
          const items = Array.from(ul.querySelectorAll('li'))
          const row = document.createElement('div')
          row.className = 'stat-row'
          items.forEach((li) => {
            const card = document.createElement('div')
            card.className = 'stat-card'
            // "변경된 파일 수: **3개**" → 레이블/값 분리
            const colonIdx = (li.textContent ?? '').indexOf(':')
            if (colonIdx !== -1) {
              const lbl = (li.textContent ?? '').slice(0, colonIdx).trim()
              const val = li.querySelector('strong')?.textContent ?? (li.textContent ?? '').slice(colonIdx + 1).trim()
              card.innerHTML = `<div class="stat-label">${lbl}</div><div class="stat-value">${val}</div>`
            } else {
              card.innerHTML = `<div class="stat-value">${li.innerHTML}</div>`
            }
            row.appendChild(card)
          })
          ul.replaceWith(row)
        }
      }
    })

    const pdfUint8Array = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate,
      footerTemplate,
      margin: { top: '25mm', right: '0', bottom: '20mm', left: '0' },
    })

    return Buffer.from(pdfUint8Array)
  } finally {
    await browser.close()
  }
}
