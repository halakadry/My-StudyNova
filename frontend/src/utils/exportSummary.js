import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

// Hebrew or Arabic letters → right-to-left document
const RTL_CHARS = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F]/;
export const isRtlText = (text) => RTL_CHARS.test(text || '');

function safeFileName(title) {
  const clean = String(title || 'summary').replace(/[\\/:*?"<>|]+/g, '').trim().slice(0, 60);
  return clean || 'summary';
}

function triggerDownload(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function paragraphsOf(text) {
  return String(text || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/* ---------- Word (.docx) ---------- */

export async function downloadSummaryWord(result, labels) {
  const rtl = isRtlText(result.title + result.summary);

  const p = (text, { heading, bullet, bold } = {}) =>
    new Paragraph({
      bidirectional: rtl,
      heading,
      bullet: bullet ? { level: 0 } : undefined,
      spacing: { after: 120 },
      children: [new TextRun({ text, bold, rightToLeft: rtl })],
    });

  const children = [
    p(result.title, { heading: HeadingLevel.TITLE }),
    p(labels.summary, { heading: HeadingLevel.HEADING_1 }),
    ...paragraphsOf(result.summary).map((text) => p(text)),
  ];

  if (result.keyPoints.length) {
    children.push(p(labels.keyPoints, { heading: HeadingLevel.HEADING_1 }));
    result.keyPoints.forEach((point) => children.push(p(point, { bullet: true })));
  }

  if (result.questions.length) {
    children.push(p(labels.practiceQuestions, { heading: HeadingLevel.HEADING_1 }));
    result.questions.forEach((q, i) => {
      children.push(p(`${i + 1}. ${q.question}`, { bold: true }));
      children.push(p(`${labels.answer}: ${q.answer}`));
    });
  }

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  triggerDownload(blob, `${safeFileName(result.title)}.docx`);
}

/* ---------- PDF (via the browser's "Save as PDF") ---------- */

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function printSummaryPdf(result, labels) {
  const rtl = isRtlText(result.title + result.summary);
  const fileName = safeFileName(result.title);

  const html = `<!doctype html>
<html dir="${rtl ? 'rtl' : 'ltr'}">
<head>
<meta charset="utf-8">
<title>${escapeHtml(fileName)}</title>
<style>
  @page { margin: 18mm; }
  body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; color: #1b2a3a; line-height: 1.6; font-size: 13px; }
  .brand { color: #5c6b4a; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; margin-bottom: 6px; }
  h1 { font-size: 22px; margin: 0 0 16px; }
  h2 { font-size: 15px; color: #5c6b4a; margin: 22px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #e7dfd2; }
  p { margin: 0 0 10px; }
  ul { margin: 0; padding-inline-start: 20px; }
  li { margin-bottom: 4px; }
  .q { margin-bottom: 12px; break-inside: avoid; }
  .q-text { font-weight: 700; }
  .q-answer { color: #555; }
</style>
</head>
<body>
  <div class="brand">StudyNova</div>
  <h1>${escapeHtml(result.title)}</h1>
  <h2>${escapeHtml(labels.summary)}</h2>
  ${paragraphsOf(result.summary).map((text) => `<p>${escapeHtml(text)}</p>`).join('')}
  ${
    result.keyPoints.length
      ? `<h2>${escapeHtml(labels.keyPoints)}</h2><ul>${result.keyPoints
          .map((point) => `<li>${escapeHtml(point)}</li>`)
          .join('')}</ul>`
      : ''
  }
  ${
    result.questions.length
      ? `<h2>${escapeHtml(labels.practiceQuestions)}</h2>${result.questions
          .map(
            (q, i) =>
              `<div class="q"><div class="q-text">${i + 1}. ${escapeHtml(q.question)}</div><div class="q-answer">${escapeHtml(
                labels.answer
              )}: ${escapeHtml(q.answer)}</div></div>`
          )
          .join('')}`
      : ''
  }
</body>
</html>`;

  // Print from a hidden frame so no popup is needed
  const frame = document.createElement('iframe');
  frame.style.position = 'fixed';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  frame.setAttribute('aria-hidden', 'true');
  document.body.appendChild(frame);

  const frameDoc = frame.contentWindow.document;
  frameDoc.open();
  frameDoc.write(html);
  frameDoc.close();

  setTimeout(() => {
    const oldTitle = document.title;
    document.title = fileName; // suggested PDF file name
    frame.contentWindow.focus();
    frame.contentWindow.print();
    document.title = oldTitle;
    setTimeout(() => frame.remove(), 1000);
  }, 300);
}