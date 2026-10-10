import { useState, useEffect } from 'react';
import api from '../services/api';
import { useLanguage } from '../i18n/useLanguage';
import { downloadSummaryWord, printSummaryPdf } from '../utils/exportSummary';
import Flashcards from './Flashcards';

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

function toDateString(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function inDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return toDateString(d);
}

// "Review:" in the same language as the lecture title
function reviewPrefixFor(title, fallback) {
  if (/[\u0590-\u05FF]/.test(title || '')) return 'חזרה:';
  if (/[\u0600-\u06FF]/.test(title || '')) return 'مراجعة:';
  return fallback;
}

function Summarizer({ exams = [], onAddToExam, onCreateTask, onQuizFinished }) {
  const { t, locale } = useLanguage();
  const [file, setFile] = useState(null);
  const [language, setLanguage] = useState('auto');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showPdfHint, setShowPdfHint] = useState(false);
  const [practicing, setPracticing] = useState(false);

  // "Add to my study plan" form
  const today = toDateString(new Date());
  const upcomingExams = exams
    .filter((e) => toDateString(new Date(e.date)) >= today)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const [planMode, setPlanMode] = useState('exam'); // 'exam' or 'task'
  const [planExamId, setPlanExamId] = useState('');
  const [planHours, setPlanHours] = useState(4);
  const [planTitle, setPlanTitle] = useState('');
  const [planDeadline, setPlanDeadline] = useState(inDays(7));
  const [planDifficulty, setPlanDifficulty] = useState('Medium');
  const [planSaving, setPlanSaving] = useState(false);
  const [planDone, setPlanDone] = useState(false);
  const [planError, setPlanError] = useState('');

  // Reset the plan form + flashcards every time a new summary arrives
  useEffect(() => {
    if (!result) return;
    setPracticing(false);
    setPlanMode(upcomingExams.length ? 'exam' : 'task');
    setPlanExamId(upcomingExams[0]?._id || '');
    setPlanHours(result.studyHours || 4);
    setPlanTitle(`${reviewPrefixFor(result.title, t('reviewPrefix'))} ${result.title}`);
    setPlanDeadline(inDays(7));
    setPlanDifficulty('Medium');
    setPlanDone(false);
    setPlanError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

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

  const handleAddToPlan = async (e) => {
    e.preventDefault();
    const hours = Math.max(1, Math.round(Number(planHours) || 0));
    setPlanSaving(true);
    setPlanError('');
    try {
      if (planMode === 'exam') {
        await onAddToExam(planExamId, hours);
      } else {
        await onCreateTask({
          title: planTitle.trim() || `${reviewPrefixFor(result.title, t('reviewPrefix'))} ${result.title}`,
          deadline: planDeadline,
          difficulty: planDifficulty,
          hours,
        });
      }
      setPlanDone(true);
    } catch (err) {
      console.error(err);
      setPlanError(t('errPlan'));
    } finally {
      setPlanSaving(false);
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

          {practicing ? (
            <Flashcards
              questions={result.questions}
              onFinish={(known, total) => onQuizFinished?.({ title: result.title, total, known })}
              onClose={() => setPracticing(false)}
            />
          ) : (
            <>
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
                  <div className="db-panel-head" style={{ marginBottom: 10, marginTop: 22 }}>
                    <h3 className="db-subheading" style={{ margin: 0 }}>
                      {t('practiceQuestions')}
                    </h3>
                    <button className="db-btn db-btn-small db-btn-primary" onClick={() => setPracticing(true)}>
                      {t('practiceFlashcards')}
                    </button>
                  </div>
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

              {/* ---------- Summary → study plan ---------- */}
              <div className="db-plan-box">
                <h3 className="db-subheading" style={{ marginTop: 0 }}>
                  {t('addToPlan')}
                </h3>
                <p className="db-subtle" style={{ margin: '0 0 12px' }}>
                  {t('addToPlanHint')} {t('suggestedHours', { n: result.studyHours || 4 })}
                </p>

                {planDone ? (
                  <p className="db-success" style={{ margin: 0 }}>
                    {t('planAdded')}
                  </p>
                ) : (
                  <form onSubmit={handleAddToPlan}>
                    <div className="db-toggle" style={{ marginBottom: 14 }}>
                      <button
                        type="button"
                        className={planMode === 'exam' ? 'active' : ''}
                        onClick={() => setPlanMode('exam')}
                        disabled={!upcomingExams.length}
                      >
                        {t('toExam')}
                      </button>
                      <button
                        type="button"
                        className={planMode === 'task' ? 'active' : ''}
                        onClick={() => setPlanMode('task')}
                      >
                        {t('toTask')}
                      </button>
                    </div>

                    {!upcomingExams.length && (
                      <p className="db-item-meta" style={{ margin: '0 0 12px' }}>
                        {t('noExamsForPlan')}
                      </p>
                    )}

                    {planMode === 'exam' ? (
                      <div className="db-plan-grid">
                        <div className="db-field">
                          <label htmlFor="plan-exam">{t('chooseExam')}</label>
                          <select
                            id="plan-exam"
                            className="db-select"
                            value={planExamId}
                            onChange={(e) => setPlanExamId(e.target.value)}
                            required
                          >
                            {upcomingExams.map((exam) => (
                              <option key={exam._id} value={exam._id}>
                                {exam.subject} · {new Date(exam.date).toLocaleDateString(locale)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="db-field">
                          <label htmlFor="plan-hours-exam">{t('studyHoursLabel')}</label>
                          <input
                            id="plan-hours-exam"
                            className="db-input"
                            type="number"
                            min="1"
                            max="40"
                            value={planHours}
                            onChange={(e) => setPlanHours(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="db-plan-grid">
                        <div className="db-field" style={{ gridColumn: '1 / -1' }}>
                          <label htmlFor="plan-title">{t('taskName')}</label>
                          <input
                            id="plan-title"
                            className="db-input"
                            type="text"
                            dir="auto"
                            value={planTitle}
                            onChange={(e) => setPlanTitle(e.target.value)}
                            required
                          />
                        </div>
                        <div className="db-field">
                          <label htmlFor="plan-deadline">{t('deadlineLabel')}</label>
                          <input
                            id="plan-deadline"
                            className="db-input"
                            type="date"
                            min={today}
                            value={planDeadline}
                            onChange={(e) => setPlanDeadline(e.target.value)}
                            required
                          />
                        </div>
                        <div className="db-field">
                          <label htmlFor="plan-difficulty">{t('difficultyLabel')}</label>
                          <select
                            id="plan-difficulty"
                            className="db-select"
                            value={planDifficulty}
                            onChange={(e) => setPlanDifficulty(e.target.value)}
                          >
                            {DIFFICULTIES.map((d) => (
                              <option key={d} value={d}>
                                {t(d)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="db-field">
                          <label htmlFor="plan-hours-task">{t('studyHoursLabel')}</label>
                          <input
                            id="plan-hours-task"
                            className="db-input"
                            type="number"
                            min="1"
                            max="40"
                            value={planHours}
                            onChange={(e) => setPlanHours(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                    )}

                    {planError && (
                      <div className="db-error" style={{ margin: '12px 0 0' }}>
                        {planError}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="db-btn db-btn-primary"
                      style={{ marginTop: 14 }}
                      disabled={planSaving || (planMode === 'exam' && !planExamId)}
                    >
                      {planSaving ? t('saving') : planMode === 'exam' ? t('addToExamBtn') : t('createTaskBtn')}
                    </button>
                  </form>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

export default Summarizer;