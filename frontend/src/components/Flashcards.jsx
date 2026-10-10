import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../i18n/useLanguage';

function Flashcards({ questions, onFinish, onClose }) {
  const { t } = useLanguage();
  const total = questions.length;
  const allCards = () => questions.map((_, i) => i);

  const [queue, setQueue] = useState(allCards);       // cards still to go, first = current
  const [missed, setMissed] = useState(() => new Set()); // cards not known on the first try
  const [flipped, setFlipped] = useState(false);
  const [finished, setFinished] = useState(false);
  const [saved, setSaved] = useState(false);
  const cardRef = useRef(null);

  const current = queue[0];

  // Focus the card so Space / Enter flips it right away
  useEffect(() => {
    if (!finished && cardRef.current) cardRef.current.focus();
  }, [current, finished]);

  const answer = async (knewIt) => {
    let nextMissed = missed;
    let nextQueue = queue.slice(1);

    if (!knewIt) {
      nextMissed = new Set(missed);
      nextMissed.add(current);
      nextQueue = [...nextQueue, current]; // see it again at the end
      setMissed(nextMissed);
    }

    setFlipped(false);
    setQueue(nextQueue);

    if (nextQueue.length === 0) {
      setFinished(true);
      try {
        await onFinish?.(total - nextMissed.size, total);
        setSaved(true);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const restart = () => {
    setQueue(allCards());
    setMissed(new Set());
    setFlipped(false);
    setFinished(false);
    setSaved(false);
  };

  if (finished) {
    const known = total - missed.size;
    return (
      <div className="db-flashcards">
        <h3 className="db-subheading" style={{ textAlign: 'center' }}>
          {t('quizDone')}
        </h3>
        <div className="db-quiz-score">
          {known}/{total}
        </div>
        <p className="db-subtle" style={{ textAlign: 'center', margin: '4px 0 0' }}>
          {t('quizScore', { a: known, b: total })}
        </p>
        {saved && (
          <p className="db-success" style={{ textAlign: 'center' }}>
            {t('quizSaved')}
          </p>
        )}
        <div className="db-flashcard-actions">
          <button type="button" className="db-btn db-btn-primary" onClick={restart}>
            {t('practiceAgain')}
          </button>
          <button type="button" className="db-btn" onClick={onClose}>
            {t('backToSummary')}
          </button>
        </div>
      </div>
    );
  }

  const q = questions[current];
  const position = total - queue.length + 1;
  const toReview = queue.filter((i) => missed.has(i)).length;

  return (
    <div className="db-flashcards">
      <div className="db-flashcard-top">
        <span>{t('cardOf', { a: Math.min(position, total), b: total })}</span>
        {toReview > 0 && <span>{t('reviewLeft', { n: toReview })}</span>}
        <button type="button" className="db-btn db-btn-small db-btn-ghost" onClick={onClose}>
          {t('backToSummary')}
        </button>
      </div>

      <button
        ref={cardRef}
        type="button"
        className={`db-flashcard ${flipped ? 'flipped' : ''}`}
        onClick={() => setFlipped((f) => !f)}
        aria-label={flipped ? `${t('answerSide')}: ${q.answer}` : `${t('questionSide')}: ${q.question}`}
      >
        <span className="db-flashcard-inner">
          <span className="db-flashcard-face front" dir="auto" aria-hidden={flipped}>
            <span className="db-flashcard-label">{t('questionSide')}</span>
            <span className="db-flashcard-text">{q.question}</span>
          </span>
          <span className="db-flashcard-face back" dir="auto" aria-hidden={!flipped}>
            <span className="db-flashcard-label">{t('answerSide')}</span>
            <span className="db-flashcard-text">{q.answer}</span>
          </span>
        </span>
      </button>

      {!flipped && <p className="db-flashcard-hint">{t('tapToFlip')}</p>}

      <div className="db-flashcard-actions">
        <button type="button" className="db-btn" onClick={() => answer(false)} disabled={!flipped}>
          {t('reviewAgain')}
        </button>
        <button type="button" className="db-btn db-btn-primary" onClick={() => answer(true)} disabled={!flipped}>
          {t('knewIt')}
        </button>
      </div>
    </div>
  );
}

export default Flashcards;