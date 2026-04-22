import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';

export default function Settings() {
  const { profile, updateProfile } = useAuth();
  const navigate = useNavigate();
  
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Populate form when profile loads
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setRole(profile.role || '');
      setBio(profile.bio || '');
    }
  }, [profile]);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    const { error } = await updateProfile({
      full_name: fullName,
      role: role,
      bio: bio
    });

    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage('Profile updated successfully!');
    }
    setLoading(false);
  };

  return (
    <div className="app-container" style={{ display: 'flex', justifyContent: 'center' }}>
      <div className="w-full" style={{ maxWidth: '600px' }}>
        
        {/* Header */}
        <div className="glass-panel p-4 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="btn-secondary flex items-center justify-center" style={{ padding: '0.5rem', borderRadius: '8px' }}>
              <ArrowLeft size={18} />
            </Link>
            <h1 className="m-0" style={{ fontSize: '1.25rem' }}>Profile Settings</h1>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="glass-panel p-4 flex-col gap-4" style={{ display: 'flex' }}>
          
          {message && (
            <div style={{ padding: '1rem', borderRadius: '8px', background: message.includes('Error') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)', color: message.includes('Error') ? '#ef4444' : '#22c55e', fontSize: '0.875rem' }}>
              {message}
            </div>
          )}

          <div className="flex-col gap-2" style={{ display: 'flex' }}>
            <label className="text-sm font-bold text-muted">Full Name</label>
            <input 
              type="text" 
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
          </div>

          <div className="flex-col gap-2" style={{ display: 'flex' }}>
            <label className="text-sm font-bold text-muted">Professional Role</label>
            <input 
              type="text" 
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Producer, Venue, Guitar Teacher"
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

          <div className="flex-col gap-2" style={{ display: 'flex' }}>
            <label className="text-sm font-bold text-muted">Bio</label>
            <textarea 
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows="4"
              placeholder="Tell the network about yourself..."
              className="w-full"
              style={{ 
                background: 'rgba(255,255,255,0.05)', 
                border: '1px solid var(--border-color)', 
                borderRadius: 'var(--radius-md)', 
                padding: '0.75rem 1rem',
                color: 'var(--text-primary)',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
          </div>

          <div className="flex items-center justify-end mt-4">
            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
              <Save size={18} /> {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
