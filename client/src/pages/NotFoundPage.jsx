import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="page-shell text-center py-5">
      <h1>404</h1>
      <p className="text-muted">Page not found.</p>
      <Link to="/dashboard" className="btn btn-primary">Back to dashboard</Link>
    </div>
  );
}
