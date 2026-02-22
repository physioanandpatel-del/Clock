import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import './Auth.css';

export default function Register() {
  const { register } = useAuth();
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      return setError('Passwords do not match.');
    }
    if (password.length < 6) {
      return setError('Password must be at least 6 characters.');
    }

    setLoading(true);
    try {
      const cred = await register(email, password);

      // Create an employee record linked to this Firebase user
      dispatch({
        type: 'ADD_EMPLOYEE',
        payload: {
          id: cred.user.uid,
          name,
          email,
          phone: '',
          countryCode: '+1',
          timezone: 'America/Toronto',
          color: ['#2563eb', '#7c3aed', '#059669', '#dc2626', '#ea580c', '#0891b2', '#4f46e5', '#be185d'][Math.floor(Math.random() * 8)],
          roles: [state.positions?.[0] || 'Server'],
          locationIds: [state.currentLocationId],
          accessLevel: 'employee',
          hourlyRate: 0,
          hireDate: new Date().toISOString().split('T')[0],
        },
      });

      dispatch({ type: 'SET_CURRENT_USER', payload: cred.user.uid });
      navigate('/');
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Use at least 6 characters.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__brand">
          <Clock size={32} className="auth-card__logo" />
          <span className="auth-card__brand-name">Clock</span>
        </div>
        <p className="auth-card__subtitle">Create your account</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="auth-error">{error}</div>}

          <div className="auth-field">
            <label className="auth-field__label">Full Name</label>
            <input
              type="text"
              className="auth-field__input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Smith"
              required
              autoFocus
            />
          </div>

          <div className="auth-field">
            <label className="auth-field__label">Email</label>
            <input
              type="email"
              className="auth-field__input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="auth-field">
            <label className="auth-field__label">Password</label>
            <input
              type="password"
              className="auth-field__input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
            />
          </div>

          <div className="auth-field">
            <label className="auth-field__label">Confirm Password</label>
            <input
              type="password"
              className="auth-field__input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              required
            />
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
