import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { apiMode, login, register } from '../services/api.js';

export default function Auth({ mode }) {
  const isRegister = mode === 'register';
  const navigate = useNavigate();
  const [isOn, setIsOn] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cordPull, setCordPull] = useState(0);
  const dragStartY = useRef(null);
  const pullDistance = useRef(0);
  const dragged = useRef(false);

  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const toggleLamp = () => setIsOn((current) => !current);

  function startPull(event) {
    event.preventDefault();
    dragStartY.current = event.clientY;
    dragged.current = false;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function movePull(event) {
    if (dragStartY.current === null) return;
    const distance = Math.max(0, Math.min(58, event.clientY - dragStartY.current));
    if (distance > 3) dragged.current = true;
    pullDistance.current = distance;
    setCordPull(distance);
  }

  function endPull() {
    if (dragStartY.current === null) return;
    if (pullDistance.current > 22) toggleLamp();
    dragStartY.current = null;
    pullDistance.current = 0;
    setCordPull(0);
  }

  function clickCord() {
    if (!dragged.current) toggleLamp();
    dragged.current = false;
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    const normalizedForm = { ...form, name: form.name.trim(), email: form.email.trim().toLowerCase() };
    if (isRegister && normalizedForm.name.length < 2) {
      setError('Enter your name (at least 2 characters).');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedForm.email)) {
      setError('Enter a valid email address.');
      return;
    }
    if (form.password.length < 8) {
      setError('Use a password with at least 8 characters.');
      return;
    }
    setBusy(true);
    try {
      const result = isRegister ? await register(normalizedForm) : await login(normalizedForm);
      if (result.token) localStorage.setItem('fitbro_token', result.token);
      if (result.user) localStorage.setItem('fitbro_user', JSON.stringify(result.user));
      window.dispatchEvent(new Event('fitbro-auth-change'));
      navigate('/sessions');
    } catch (err) {
      setError(err.message || 'Could not authenticate. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`lamp-login-page ${isOn ? 'lamp-is-on' : ''}`} data-on={String(isOn)}>
      <Link to="/" className="lamp-home-logo" aria-label="FIT_BRO home" title="Back to FIT_BRO home">
        <img src="/images/fitbro-logo-transparent.png" alt="FIT_BRO — Train with intent" />
      </Link>
      <div className="lamp-ambient" aria-hidden="true" />
      <div className="lamp-login-layout">
        <section className="lamp-side" aria-label="Interactive desk lamp">
          <div className="lamp-light-cone" aria-hidden="true" />
          <svg className="lamp-svg" viewBox="0 0 240 340" role="img" aria-label="A desk lamp. Pull its cord to turn on the light.">
            <defs>
              <radialGradient id="lampGlow">
                <stop offset="0%" stopColor="#fff2bd" stopOpacity=".95" />
                <stop offset="100%" stopColor="#f6d887" stopOpacity="0" />
              </radialGradient>
              <filter id="lampBlur"><feGaussianBlur stdDeviation="10" /></filter>
              <filter id="lampBloom"><feGaussianBlur stdDeviation="5" /></filter>
            </defs>
            <ellipse className="lamp-under-glow" cx="112" cy="105" rx="100" ry="72" fill="url(#lampGlow)" filter="url(#lampBlur)" />
            <rect className="lamp-metal" x="105" y="98" width="14" height="166" rx="3" />
            <rect className="lamp-metal" x="65" y="257" width="94" height="15" rx="7.5" />
            <ellipse className="lamp-bulb-glow" cx="112" cy="101" rx="70" ry="30" fill="#fff9d9" filter="url(#lampBloom)" />
            <path className="lamp-shade" d="M35 101 C35 48 189 48 189 101 C189 117 35 117 35 101 Z" />
            <g className="lamp-cord" role="button" tabIndex="0" aria-label={isOn ? "Pull cord to turn lamp off" : "Pull cord to turn lamp on"} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); toggleLamp(); } }} onPointerDown={startPull} onPointerMove={movePull} onPointerUp={endPull} onPointerCancel={endPull} onClick={clickCord}>
              <line className="lamp-cord-line" x1="151" y1="106" x2="151" y2={174 + cordPull} />
              <circle className="lamp-cord-bead" cx="151" cy={184 + cordPull} r="7" />
              <circle cx="151" cy={184 + cordPull} r="25" fill="transparent" className="lamp-cord-hit" />
            </g>
          </svg>
          <p className="lamp-instruction">{isOn ? 'LIGHT ON · WELCOME IN' : 'PULL THE CORD TO BEGIN'}</p>
        </section>

        <section className={`lamp-login-card ${isOn ? 'is-visible' : ''}`} aria-label={isRegister ? 'Create member account' : 'Member sign in'}>
          <h1>{isRegister ? 'Get started' : 'Welcome'}</h1>
          <p className="lamp-card-subtitle">{isRegister ? 'Create your member account.' : 'Your next session starts here.'}</p>

          {apiMode() === 'demo' && (
            <div className="lamp-preview-note">Preview mode · Any valid email and password works. Use admin@fitbro.local for the admin preview.</div>
          )}

          <form onSubmit={submit} noValidate>
            {isRegister && (
              <div className="lamp-form-group">
                <label htmlFor="member-name">Full name</label>
                <input id="member-name" name="name" value={form.name} onChange={change} autoComplete="name" placeholder="Enter your name" required minLength={2} />
              </div>
            )}
            <div className="lamp-form-group">
              <label htmlFor="member-email">Email address</label>
              <input id="member-email" name="email" type="email" value={form.email} onChange={change} autoComplete="email" placeholder="you@example.com" required />
            </div>
            <div className="lamp-form-group">
              <label htmlFor="member-password">Password</label>
              <div className="lamp-password-field">
                <input id="member-password" name="password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={change} autoComplete={isRegister ? 'new-password' : 'current-password'} placeholder={isRegister ? 'At least 8 characters' : 'Enter your password'} minLength={8} required />
                <button type="button" className="lamp-password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>
            {error && <p className="lamp-form-error" role="alert">{error}</p>}
            <button className="lamp-submit" type="submit" disabled={busy}>
              {busy ? 'PLEASE WAIT…' : isRegister ? 'Create Account' : 'Sign In'} <ArrowUpRight size={17} />
            </button>
          </form>

          <div className="lamp-security-note"><ShieldCheck size={15} /><span>{apiMode() === 'demo' ? 'Preview only · no real account security' : 'Requests are sent to your configured API.'}</span></div>
          <p className="lamp-auth-switch">
            {isRegister ? 'Already a member?' : 'New to FIT_BRO?'}{' '}
            <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Sign in' : 'Create account'} <ArrowUpRight size={13} /></Link>
          </p>
        </section>
      </div>
    </div>
  );
}
