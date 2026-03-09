import puppeteer from 'puppeteer'
import { marked } from 'marked'

/**
 * 마크다운 문자열을 스타일이 적용된 A4 PDF Buffer로 변환합니다.
 */
export async function markdownToPdf(markdown: string): Promise<Buffer> {
  const html = marked.parse(markdown) as string

  const styledHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'system-ui', -apple-system, 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans CJK KR', sans-serif;
      font-size: 10pt;
      line-height: 1.8;
      color: #1d1d1f;
      background: #fff;
    }

    h1 {
      font-size: 22pt;
      font-weight: 700;
      margin-bottom: 16pt;
      color: #1d1d1f;
      letter-spacing: -0.5pt;
      padding-bottom: 10pt;
      border-bottom: 2.5px solid #1d1d1f;
    }

    h2 {
      font-size: 14pt;
      font-weight: 700;
      margin: 22pt 0 10pt;
      color: #1d1d1f;
      letter-spacing: -0.3pt;
      padding-bottom: 6pt;
      border-bottom: 1px solid #d2d2d7;
    }

    h3 {
      font-size: 11pt;
      font-weight: 600;
      margin: 16pt 0 8pt;
      color: #0071e3;
      background: #f0f6ff;
      padding: 6pt 10pt;
      border-radius: 5pt;
      border-left: 3pt solid #0071e3;
    }

    h4 {
      font-size: 10pt;
      font-weight: 600;
      margin: 10pt 0 4pt;
      color: #1d1d1f;
    }

    p { margin-bottom: 7pt; }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10pt 0;
      font-size: 9.5pt;
    }
    th {
      background: #f5f5f7;
      font-weight: 600;
      padding: 7pt 10pt;
      border: 1px solid #d2d2d7;
      text-align: left;
    }
    td {
      padding: 6pt 10pt;
      border: 1px solid #d2d2d7;
      vertical-align: top;
    }
    tr:nth-child(even) td { background: #fafafa; }

    code {
      font-family: 'SF Mono', 'Courier New', Courier, monospace;
      font-size: 8.5pt;
      background: #f5f5f7;
      padding: 1pt 4pt;
      border-radius: 3pt;
      color: #c7001e;
    }

    pre {
      background: #f5f5f7;
      border-radius: 7pt;
      padding: 12pt;
      margin: 8pt 0;
      overflow: hidden;
      font-size: 8pt;
      line-height: 1.6;
      border: 1px solid #e8e8ed;
    }
    pre code { background: none; padding: 0; color: #1d1d1f; }

    ul { padding-left: 16pt; margin: 5pt 0; list-style-type: disc; }
    ol { padding-left: 18pt; margin: 5pt 0; }
    li { margin-bottom: 4pt; }
    li > ul, li > ol { margin-top: 3pt; }

    strong { font-weight: 600; }
    em { font-style: italic; color: #6e6e73; }

    hr {
      border: none;
      border-top: 1px solid #d2d2d7;
      margin: 18pt 0;
    }

    blockquote {
      border-left: 3pt solid #0071e3;
      padding: 5pt 12pt;
      color: #6e6e73;
      margin: 8pt 0;
      background: #f5f9ff;
      border-radius: 0 5pt 5pt 0;
    }

    /* 체크박스 (테스트 실행 체크리스트) */
    input[type="checkbox"] {
      margin-right: 5pt;
      accent-color: #0071e3;
    }

    /* 페이지 나눔 */
    h1, h2 { page-break-after: avoid; }
    h3 { page-break-after: avoid; page-break-inside: avoid; }
    table { page-break-inside: auto; }
    tr { page-break-inside: avoid; }

    @page {
      size: A4;
      margin: 18mm 16mm;
    }
  </style>
</head>
<body>
  ${html}
</body>
</html>`

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })

  try {
    const page = await browser.newPage()
    await page.setContent(styledHtml, { waitUntil: 'domcontentloaded' })
    const pdfUint8Array = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '18mm', right: '16mm', bottom: '18mm', left: '16mm' },
    })
    return Buffer.from(pdfUint8Array)
  } finally {
    await browser.close()
  }
}
