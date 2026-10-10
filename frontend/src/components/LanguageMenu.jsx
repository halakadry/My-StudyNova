import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../i18n/useLanguage';

const LANGUAGES = [
  { code: 'he', tag: 'HE', name: 'עברית' },
  { code: 'en', tag: 'EN', name: 'English' },
  { code: 'ar', tag: 'AR', name: 'العربية' },
];

function Chevron({ open }) {
  return (
    <svg
      className={`db-lang-chevron ${open ? 'open' : ''}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function Check() {
  return (
    <svg
      className="db-lang-check"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function LanguageMenu() {
  const { lang, setLanguage, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close when clicking outside or pressing Esc
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const current = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[1];

  return (
    <div className="db-lang" ref={ref}>
      <button
        type="button"
        className="db-pill-btn"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${t('language')}: ${current.name}`}
        title={current.name}
      >
        <span className="db-lang-tag db-lang-tag-current">{current.tag}</span>
        <Chevron open={open} />
      </button>

      {open && (
        <ul className="db-lang-menu db-lang-menu-compact" role="listbox" aria-label={t('language')}>
          {LANGUAGES.map((l) => (
            <li key={l.code}>
              <button
                type="button"
                role="option"
                aria-selected={l.code === lang}
                aria-label={l.name}
                title={l.name}
                className={`db-lang-option ${l.code === lang ? 'active' : ''}`}
                onClick={() => {
                  setLanguage(l.code);
                  setOpen(false);
                }}
              >
                <span className="db-lang-tag">{l.tag}</span>
                {l.code === lang && <Check />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default LanguageMenu;