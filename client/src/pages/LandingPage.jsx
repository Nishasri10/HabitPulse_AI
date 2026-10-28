import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, BarChart3, Sparkles } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="landing-page">
      <nav className="landing-nav container py-3 d-flex justify-content-between align-items-center">
        <div className="brand-wrap">
          <div className="brand-mark">H</div>
          <span className="brand-name">HabitPulseAI</span>
        </div>
        <div className="d-flex align-items-center gap-3">
          <Link to="/login" className="btn btn-link text-dark">Login</Link>
          <Link to="/register" className="btn btn-primary rounded-pill">Get started</Link>
        </div>
      </nav>

      <header className="hero container py-5">
        <div className="row align-items-center g-5">
          <div className="col-lg-6">
            <span className="eyebrow">AI-powered wellness</span>
            <h1>Build habits that last with a smarter routine.</h1>
            <p className="lead text-muted">Track daily progress, visualize momentum, and get actionable suggestions from your AI coach.</p>
            <div className="d-flex gap-3 flex-wrap">
              <Link to="/register" className="btn btn-primary btn-lg rounded-pill">Create account <ArrowRight size={18} /></Link>
              <Link to="/login" className="btn btn-outline-secondary btn-lg rounded-pill">Login</Link>
            </div>
            <div className="mt-4 d-flex gap-4 flex-wrap text-muted small">
              <span><CheckCircle2 size={16} /> 7-day streak focus</span>
              <span><BarChart3 size={16} /> Insights built in</span>
              <span><Sparkles size={16} /> AI suggestions</span>
            </div>
          </div>
          <div className="col-lg-6">
            <div className="hero-card card shadow-sm border-0 p-4">
              <div className="d-flex justify-content-between">
                <span className="badge bg-soft">Today</span>
                <span className="text-muted">86% completion</span>
              </div>
              <div className="mt-4">
                <div className="d-flex justify-content-between mb-2"><span>Morning walk</span><strong>Done</strong></div>
                <div className="progress mb-3"><div className="progress-bar" style={{ width: '100%' }} /></div>
                <div className="d-flex justify-content-between mb-2"><span>Read 20 pages</span><strong>Done</strong></div>
                <div className="progress mb-3"><div className="progress-bar" style={{ width: '100%' }} /></div>
                <div className="d-flex justify-content-between mb-2"><span>Deep work session</span><strong>In progress</strong></div>
                <div className="progress"><div className="progress-bar bg-secondary" style={{ width: '65%' }} /></div>
              </div>
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}
