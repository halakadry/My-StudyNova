import { useState } from 'react';
import api from '../services/api';
import { useLanguage } from '../i18n/useLanguage';
import { downloadSummaryWord, printSummaryPdf } from '../utils/exportSummary';

function Summarizer() {
  const { t } = useLanguage();
  const [file, setFile] = useState(null);
  const [language, setLanguage] = useState('auto');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showPdfHint, setShowPdfHint] = useState(false);

  // Section titles used inside the downloaded files
  const exportLabels = {
    summary: t('summaryHeading'),
    keyPoints: t('keyPoints'),
    practiceQuestions: t('practiceQuestions'),
    answer: t('answerLabel'),
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError('');
    setResult(null);
    setShowPdfHint(false);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('language', language);
      const res = await api.post('/summarize', form);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || t('errSummarize'));
    } finally {
      setLoading(false);
    }
  };

  const copySummary = async () => {
    const text = [
      result.title,
      '',
      result.summary,
      '',
      `${t('keyPoints')}:`,
      ...result.keyPoints.map((p) => `- ${p}`),
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError(t('errCopy'));
    }
  };

  const handleWord = async () => {
    setExporting(true);
    setError('');
    try {
      await downloadSummaryWord(result, exportLabels);
    } catch (err) {
      console.error(err);
      setError(t('errExport'));
    } finally {
      setExporting(false);
    }
  };

  const handlePdf = () => {
    setError('');
    setShowPdfHint(true);
    try {
      printSummaryPdf(result, exportLabels);
    } catch (err) {
      console.error(err);
      setError(t('errExport'));
    }
  };

  return (
    <>
      <div className="db-panel" style={{ marginBottom: 24 }}>
        <h2 className="db-section-title">{t('summarizeLecture')}</h2>
        <p className="db-subtle" style={{ marginBottom: 0 }}>
          {t('uploadHint')}
        </p>

        <form className="db-summarize-form" onSubmit={handleSubmit}>
          <label className="db-file-drop">
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={(e) => {
                setFile(e.target.files[0] || null);
                setError('');
              }}
            />
            <span dir="auto">{file ? file.name : t('chooseFile')}</span>
          </label>

          <select
            className="db-select"
            style={{ width: 'auto' }}
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            aria-label={t('summaryLanguage')}
          >
            <option value="auto">{t('sameLanguage')}</option>
            <option value="English">{t('langEnglish')}</option>
            <option value="Hebrew">{t('langHebrew')}</option>
            <option value="Arabic">{t('langArabic')}</option>
          </select>

          <button type="submit" className="db-btn db-btn-primary" disabled={!file || loading}>
            {loading ? t('readingFile') : t('summarizeBtn')}
          </button>
        </form>

        {loading && <p className="db-subtle" style={{ margin: '12px 0 0' }}>{t('longFiles')}</p>}
        {error && (
          <div className="db-error" style={{ margin: '12px 0 0' }}>
            {error}
          </div>
        )}
      </div>

      {result && (
        <div className="db-panel">
          <div className="db-panel-head" style={{ flexWrap: 'wrap' }}>
            <h2 className="db-section-title" dir="auto">
              {result.title}
            </h2>
            <div className="db-item-actions" style={{ flexWrap: 'wrap' }}>
              <button className="db-btn db-btn-small" onClick={copySummary}>
                {copied ? t('copied') : t('copySummary')}
              </button>
              <button className="db-btn db-btn-small" onClick={handlePdf}>
                {t('downloadPdf')}
              </button>
              <button className="db-btn db-btn-small db-btn-primary" onClick={handleWord} disabled={exporting}>
                {exporting ? t('preparingFile') : t('downloadWord')}
              </button>
            </div>
          </div>

          {showPdfHint && (
            <p className="db-item-meta" style={{ margin: '-6px 0 14px' }}>
              {t('pdfHint')}
            </p>
          )}

          <div className="db-summary-text" dir="auto">
            {result.summary
              .split(/\n\s*\n/)
              .filter((p) => p.trim())
              .map((p, i) => (
                <p key={i}>{p.trim()}</p>
              ))}
          </div>

          {result.keyPoints.length > 0 && (
            <>
              <h3 className="db-subheading">{t('keyPoints')}</h3>
              <ul className="db-keypoints" dir="auto">
                {result.keyPoints.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
            </>
          )}

          {result.questions.length > 0 && (
            <>
              <h3 className="db-subheading">{t('practiceQuestions')}</h3>
              {result.questions.map((q, i) => (
                <details key={i} className="db-question" dir="auto">
                  <summary>
                    {i + 1}. {q.question}
                  </summary>
                  <p>{q.answer}</p>
                </details>
              ))}
            </>
          )}
        </div>
      )}
    </>
  );
}

export default Summarizer;