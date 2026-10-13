import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-left">
        <a href="/" className="wordmark" aria-label="FIT_BRO home">
          FIT_<span className="wordmark-accent">BRO</span>
        </a>
        <p>© {new Date().getFullYear()} FIT_BRO. All rights reserved.</p>
      </div>

      <div className="footer-credit">
        <span>CREATED BY</span>
        <strong>Baibhaw<span aria-label="love">❤️</span></strong>
      </div>

      <div className="footer-right">
        <span>BUILT FOR STRENGTH. MADE FOR PROGRESS.</span>
      </div>
    </footer>
  );
}
