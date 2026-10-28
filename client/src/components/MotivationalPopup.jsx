import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import motivationalQuotes from '../data/motivationalQuotes';

let lastShownQuoteIndex = -1;

const getRandomDelay = () => 45000 + Math.floor(Math.random() * 75001);

export default function MotivationalPopup() {
  const [quote, setQuote] = useState(null);
  const timerRef = useRef(null);
  const remainingRef = useRef(getRandomDelay());
  const startedAtRef = useRef(0);
  const lastQuoteIndexRef = useRef(lastShownQuoteIndex);
  const quoteRef = useRef(null);

  const showRandomQuote = () => {
    let index = Math.floor(Math.random() * motivationalQuotes.length);
    if (motivationalQuotes.length > 1 && index === lastQuoteIndexRef.current) {
      index = (index + 1 + Math.floor(Math.random() * (motivationalQuotes.length - 1))) % motivationalQuotes.length;
    }
    lastQuoteIndexRef.current = index;
    lastShownQuoteIndex = index;
    setQuote(motivationalQuotes[index]);
  };

  useEffect(() => {
    if (!quote) return undefined;
    const previouslyFocused = document.activeElement;
    quoteRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setQuote(null);
      }
      if (event.key === 'Tab') {
        const buttons = document.querySelectorAll('.motivation-dialog button:not([disabled])');
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, [quote]);

  useEffect(() => {
    let mounted = true;

    const schedule = (delay = remainingRef.current) => {
      if (!mounted || document.hidden || quoteRef.current) return;
      clearTimeout(timerRef.current);
      remainingRef.current = delay;
      startedAtRef.current = Date.now();
      timerRef.current = setTimeout(() => {
        remainingRef.current = getRandomDelay();
        showRandomQuote();
      }, delay);
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
          remainingRef.current = Math.max(0, remainingRef.current - (Date.now() - startedAtRef.current));
        }
      } else if (!quoteRef.current) {
        schedule();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    if (Math.random() < 0.25) {
      showRandomQuote();
    } else {
      schedule();
    }

    return () => {
      mounted = false;
      clearTimeout(timerRef.current);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  const dismiss = () => {
    setQuote(null);
    remainingRef.current = getRandomDelay();
    if (!document.hidden) {
      clearTimeout(timerRef.current);
      startedAtRef.current = Date.now();
      timerRef.current = setTimeout(() => {
        remainingRef.current = getRandomDelay();
        showRandomQuote();
      }, remainingRef.current);
    }
  };

  if (!quote) return null;

  return (
    <div className="motivation-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) dismiss();
    }}>
      <section
        className="motivation-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="motivation-title"
        aria-describedby="motivation-quote"
      >
        <button
          ref={quoteRef}
          type="button"
          className="motivation-close"
          aria-label="Close motivational message"
          onClick={dismiss}
        >
          <X size={18} />
        </button>
        <div className="motivation-emoji" aria-hidden="true">🌱</div>
        <h2 id="motivation-title">A little encouragement</h2>
        <blockquote id="motivation-quote">{quote.text}</blockquote>
        <p className="motivation-attribution">{quote.attribution}</p>
        <button type="button" className="btn btn-primary rounded-pill px-4" onClick={dismiss}>
          Keep Going
        </button>
      </section>
    </div>
  );
}
