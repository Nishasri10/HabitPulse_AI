import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { getDateKeyForTimezone } from '../utils/habitPresentation';

const suggestedQuestions = [
  'How can I build a habit consistently?',
  'How can I stop procrastinating?',
  'What should I do if I miss a day?',
  'How can I stay motivated?',
  'How many habits should I start with?',
  'How can I build a morning routine?',
  'How can I track my progress effectively?',
  'How can I break a bad habit?',
  'How can I manage habits during exams or busy days?',
  'How can I maintain a habit when I have little time?',
  'How can I recover after losing motivation?',
  'How can I make a habit easier to complete?',
];

export default function CoachPage() {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [conversation, setConversation] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewDate, setReviewDate] = useState(getDateKeyForTimezone(new Date(), user?.timezone || 'UTC'));
  const [review, setReview] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState('');

  useEffect(() => {
    if (!reviewOpen) return undefined;
    const controller = new AbortController();
    const loadReview = async () => {
      setReviewLoading(true);
      setReview(null);
      setReviewError('');
      try {
        const { data } = await axios.get('/analytics/weekly-review', {
          params: { date: reviewDate },
          signal: controller.signal,
        });
        setReview(data);
      } catch (requestError) {
        if (!axios.isCancel(requestError)) {
          setReviewError(requestError.response?.data?.message || 'Unable to load your weekly review.');
        }
      } finally {
        if (!controller.signal.aborted) setReviewLoading(false);
      }
    };

    loadReview();
    return () => controller.abort();
  }, [reviewOpen, reviewDate]);

  const askCoach = async (question) => {
    const cleanPrompt = question?.trim();
    if (!cleanPrompt) {
      return;
    }

    const userEntry = { role: 'user', text: cleanPrompt };
    setConversation((prev) => [...prev, userEntry]);
    setPrompt('');
    setLoading(true);

    try {
      const { data } = await axios.post('/ai/coach', { prompt: cleanPrompt });
      const answer = data?.insight?.text || 'I could not generate an answer right now.';
      setConversation((prev) => [...prev, { role: 'assistant', text: answer }]);
    } catch (error) {
      const message = error.response?.data?.message || 'The AI coach is unavailable right now. Please try again in a moment.';
      setConversation((prev) => [...prev, { role: 'assistant', text: message }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await askCoach(prompt);
  };

  const suggestedRows = useMemo(() => {
    return suggestedQuestions.map((question) => ({
      id: question,
      question,
    }));
  }, []);

  return (
    <div className="page-shell">
      <div className="card p-4">
        <h3 className="mb-3">AI Coach</h3>

        <section className="weekly-review">
          <div className="weekly-review-toolbar">
            <div>
              <h4>Weekly review</h4>
              <p>Review saved completions and get practical next-week guidance.</p>
            </div>
            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={() => setReviewOpen((open) => !open)}
              aria-expanded={reviewOpen}
            >
              {reviewOpen ? 'Hide weekly review' : 'Review a week'}
            </button>
          </div>
          {reviewOpen && (
            <div className="weekly-review-content">
              <label className="weekly-review-date">
                <span>Choose a date in the week</span>
                <input
                  type="date"
                  className="form-control"
                  value={reviewDate}
                  max={getDateKeyForTimezone(new Date(), user?.timezone || 'UTC')}
                  onChange={(event) => setReviewDate(event.target.value)}
                />
              </label>
              {reviewError && <div className="alert alert-danger" role="alert">{reviewError}</div>}
              {reviewLoading ? (
                <div className="text-muted" role="status">Preparing your review...</div>
              ) : review && (
                <>
                  <div className="weekly-review-period">
                    Week of {review.weekStartKey} – {review.weekEndKey}
                  </div>
                  {review.activeHabits ? (
                    <>
                      <div className="weekly-review-stats">
                        <div><strong>{review.completedOccurrences}</strong><span>saved completions</span></div>
                        <div><strong>{review.completionRate === null ? '—' : `${review.completionRate}%`}</strong><span>
                          {review.completedScheduledOccurrences} of {review.scheduledOccurrences} scheduled habit-days
                        </span></div>
                        <div><strong>{review.mostConsistentHabit || '—'}</strong><span>
                          {review.mostConsistentHabit ? `Most consistent · ${review.mostConsistentRate}%` : 'Not enough scheduled history to compare'}
                        </span></div>
                      </div>
                      {review.needsAttentionHabit && (
                        <p className="weekly-review-attention">
                          <strong>Could use a smaller step:</strong> {review.needsAttentionHabit} was completed on fewer than half of its scheduled days (at least three scheduled days observed).
                        </p>
                      )}
                      <div className="weekly-review-guidance">
                        <div className="weekly-review-guidance-title">
                          <strong>Suggestions for next week</strong>
                          <span>{review.guidanceSource === 'gemini' ? 'Gemini guidance' : 'Local guidance'}</span>
                        </div>
                        <p>{review.guidance}</p>
                      </div>
                      <small className="weekly-review-caveat">
                        Completion rate uses scheduled days for currently active habits. Past schedule edits are not versioned.
                      </small>
                    </>
                  ) : (
                    <div className="analytics-empty-state compact">
                      <strong>No active habits to review</strong>
                      <p>Add or activate a habit to begin a useful weekly review.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </section>

        <div className="mb-4">
          <h6 className="mb-3">Suggested Questions</h6>
          <div className="d-flex flex-wrap gap-2">
            {suggestedRows.map((item) => (
              <button
                key={item.id}
                type="button"
                className="btn btn-outline-primary btn-sm"
                onClick={() => askCoach(item.question)}
                disabled={loading}
              >
                {item.question}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <textarea
            className="form-control mb-3"
            rows="4"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={250}
            placeholder="Ask your AI coach about habit consistency, motivation, routines, or setbacks..."
          />
          <div className="d-flex gap-2 align-items-center">
            <button className="btn btn-primary" type="submit" disabled={loading || !prompt.trim()}>
              {loading ? 'Thinking...' : 'Ask coach'}
            </button>
            {loading && <span className="text-muted small">Generating answer...</span>}
          </div>
        </form>

        <div className="mt-4 coach-chat">
          {conversation.length === 0 ? (
            <div className="alert alert-light border mb-0">
              Your personalized habit coaching insights will appear here.
            </div>
          ) : (
            conversation.map((entry, index) => (
              <div key={`${entry.role}-${index}`} className={`coach-message ${entry.role}`}>
                <div className="coach-label">{entry.role === 'user' ? 'You' : 'Coach'}</div>
                <div className="coach-bubble">{entry.text}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
