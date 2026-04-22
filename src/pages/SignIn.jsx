import { useState } from 'react';
import { Music } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function SignIn() {
  const { signIn, signUp, devBackdoorLogin } = useAuth();
  
  const [isRegistering, setIsRegistering] = useState(false);
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    if (!email || !password) {
      setError('Please enter email and password.');
      return;
    }

    if (isRegistering) {
      if (!fullName) {
        setError('Please enter your full name.');
        return;
      }
      const { error: signUpError } = await signUp(email, password, fullName);
      if (signUpError) {
        setError(signUpError.message);
      } else {
        setMessage('Account created! You are now signed in.');
      }
    } else {
      const { error: signInError } = await signIn(email, password);
      if (signInError) {
        setError(signInError.message);
      }
    }
  };

  return (
    <div className="flex items-center justify-center w-full" style={{ minHeight: '100vh', padding: '2rem' }}>
      
      <div className="glass-panel p-4 flex-col items-center w-full" style={{ maxWidth: '400px', padding: '3rem 2rem', textAlign: 'center' }}>
        
        {/* Logo */}
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'var(--accent-gradient)', margin: '0 auto 1rem auto' }}>
          <Music size={32} color="white" />
        </div>
        
        <h1 className="text-gradient" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>M.O.</h1>
        <p className="text-muted text-sm mb-4" style={{ marginBottom: '2rem' }}>
          {isRegistering ? 'Create an account to join the network.' : 'Sign in to connect with the music industry.'}
        </p>

        {error && (
          <div style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}
        {message && (
          <div style={{ color: '#22c55e', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {message}
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleAuth} className="flex-col gap-4 w-full" style={{ display: 'flex', marginBottom: '1.5rem' }}>
          
          {isRegistering && (
            <input 
              type="text" 
              placeholder="Full Name" 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
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
          )}

          <input 
            type="email" 
            placeholder="Email address" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
          <input 
            type="password" 
            placeholder="Password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
          <button type="submit" className="btn-primary w-full" style={{ marginTop: '0.5rem' }}>
            {isRegistering ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <button 
          type="button"
          onClick={() => setIsRegistering(!isRegistering)}
          className="text-sm font-medium text-muted mt-2 mb-4" 
          style={{ background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }}
          onMouseOver={e => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseOut={e => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          {isRegistering ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
        </button>

        {/* Divider */}
        <div className="flex items-center justify-center gap-3 w-full mb-4" style={{ marginBottom: '2rem', marginTop: '1rem' }}>
          <div className="w-full" style={{ height: '1px', background: 'var(--border-color)' }}></div>
          <span className="text-xs text-muted">OR</span>
          <div className="w-full" style={{ height: '1px', background: 'var(--border-color)' }}></div>
        </div>

        {/* Developer Backdoor */}
        <button 
          type="button"
          onClick={devBackdoorLogin}
          className="text-xs font-medium text-muted mt-2" 
          style={{ 
            background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', transition: 'color 0.2s' 
          }}
          onMouseOver={e => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseOut={e => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          [ Developer Backdoor: Bypass Login ]
        </button>

      </div>
    </div>
  );
}
