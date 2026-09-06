import { useState } from 'react';
import { Music, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72;

export default function SignIn() {
  const { signIn, signUp } = useAuth();
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const validateInputs = () => {
    const cleanEmail = email.trim();
    const cleanName = fullName.trim();

    if (!cleanEmail) {
      return 'Please enter your email address.';
    }

    if (!EMAIL_REGEX.test(cleanEmail)) {
      return 'Please provide a valid email address.';
    }

    if (!password) {
      return 'Please enter your password.';
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`;
    }

    if (password.length > MAX_PASSWORD_LENGTH) {
      return `Password cannot exceed ${MAX_PASSWORD_LENGTH} characters.`;
    }

    if (isRegistering) {
      if (!cleanName || cleanName.length < 2) {
        return 'Please enter your full name (at least 2 characters).';
      }
      if (cleanName.length > 70) {
        return 'Full name cannot exceed 70 characters.';
      }
    }

    return null;
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    const validationError = validateInputs();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const cleanEmail = email.trim();
      const cleanName = fullName.trim();

      if (isRegistering) {
        const { error: signUpError } = await signUp(cleanEmail, password, cleanName);
        if (signUpError) {
          setError(signUpError.message);
        } else {
          setMessage('Account created! Please check your email to confirm or sign in directly.');
        }
      } else {
        const { error: signInError } = await signIn(cleanEmail, password);
        if (signInError) {
          setError(signInError.message);
        }
      }
    } catch (err) {
      // Safe error handling to prevent leaking internal stack traces or URLs
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Unable to reach the authentication service. Please verify your connection or Supabase status.');
      } else {
        setError('An unexpected error occurred during authentication. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setIsRegistering(!isRegistering);
    setError('');
    setMessage('');
  };

  return (
    <div className="flex items-center justify-center w-full" style={{ minHeight: '100vh', padding: '2rem' }}>
      
      <div className="glass-panel p-4 flex-col items-center w-full" style={{ maxWidth: '420px', padding: '3rem 2rem', textAlign: 'center' }}>
        
        {/* Logo */}
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'var(--accent-gradient)', margin: '0 auto 1rem auto' }}>
          <Music size={32} color="white" />
        </div>
        
        <h1 className="text-gradient" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>M.O.</h1>
        <p className="text-muted text-sm mb-4" style={{ marginBottom: '2rem' }}>
          {isRegistering ? 'Create an account to join the network.' : 'Sign in to connect with the music industry.'}
        </p>

        {error && (
          <div 
            role="alert"
            style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#ef4444', 
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              marginBottom: '1.25rem', 
              fontSize: '0.875rem',
              textAlign: 'left'
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div 
            role="status"
            style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#22c55e', 
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.2)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              marginBottom: '1.25rem', 
              fontSize: '0.875rem',
              textAlign: 'left'
            }}
          >
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            <span>{message}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleAuth} className="flex-col gap-4 w-full" style={{ display: 'flex', marginBottom: '1.5rem' }} noValidate>
          
          {isRegistering && (
            <div style={{ textAlign: 'left' }}>
              <label htmlFor="fullName" className="text-xs text-muted" style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                Full Name
              </label>
              <input 
                id="fullName"
                type="text" 
                placeholder="Alex Chen" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                maxLength={70}
                autoComplete="name"
                disabled={loading}
                className="w-full"
                style={{ 
                  background: 'rgba(255,255,255,0.05)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: 'var(--radius-md)', 
                  padding: '0.75rem 1rem',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          )}

          <div style={{ textAlign: 'left' }}>
            <label htmlFor="email" className="text-xs text-muted" style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
              Email Address
            </label>
            <input 
              id="email"
              type="email" 
              placeholder="alex@example.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={120}
              autoComplete="email"
              disabled={loading}
              className="w-full"
              style={{ 
                background: 'rgba(255,255,255,0.05)', 
                border: '1px solid var(--border-color)', 
                borderRadius: 'var(--radius-md)', 
                padding: '0.75rem 1rem',
                color: 'var(--text-primary)',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ textAlign: 'left' }}>
            <label htmlFor="password" className="text-xs text-muted" style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
              Password {isRegistering && <span style={{ opacity: 0.7 }}>(min 8 characters)</span>}
            </label>
            <input 
              id="password"
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={MAX_PASSWORD_LENGTH}
              autoComplete={isRegistering ? 'new-password' : 'current-password'}
              disabled={loading}
              className="w-full"
              style={{ 
                background: 'rgba(255,255,255,0.05)', 
                border: '1px solid var(--border-color)', 
                borderRadius: 'var(--radius-md)', 
                padding: '0.75rem 1rem',
                color: 'var(--text-primary)',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="btn-primary w-full flex items-center justify-center gap-2" 
            style={{ 
              marginTop: '0.5rem', 
              opacity: loading ? 0.7 : 1, 
              cursor: loading ? 'not-allowed' : 'pointer' 
            }}
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading 
              ? (isRegistering ? 'Creating Account...' : 'Signing In...') 
              : (isRegistering ? 'Sign Up' : 'Sign In')}
          </button>
        </form>

        <button 
          type="button"
          onClick={toggleAuthMode}
          disabled={loading}
          className="text-sm font-medium text-muted mt-2" 
          style={{ background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }}
          onMouseOver={e => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseOut={e => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          {isRegistering ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
        </button>

      </div>
    </div>
  );
}
