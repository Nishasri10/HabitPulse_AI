import { useMemo, useState } from 'react';
import axios from 'axios';

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
  const [prompt, setPrompt] = useState('');
  const [conversation, setConversation] = useState([]);
  const [loading, setLoading] = useState(false);

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
