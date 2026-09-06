import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, MapPin, CheckCircle2, AlertCircle, Loader2, User } from 'lucide-react';

const PRESET_AVATARS = [
  { label: 'Studio Producer', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop' },
  { label: 'Guitarist', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop' },
  { label: 'Vocalist', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=200&auto=format&fit=crop' },
  { label: 'DJ / Beatmaker', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=200&auto=format&fit=crop' },
  { label: 'Songwriter', url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=200&auto=format&fit=crop' },
];

export default function Settings() {
  const { profile, updateProfile } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Populate form fields when profile state loads
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setRole(profile.role || '');
      setBio(profile.bio || '');
      setLocation(profile.location || '');
      setAvatarUrl(profile.avatar_url || PRESET_AVATARS[0].url);
    }
  }, [profile]);

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const cleanName = fullName.trim();
    const cleanRole = role.trim();
    const cleanBio = bio.trim();
    const cleanLocation = location.trim();
    const cleanAvatar = avatarUrl.trim();

    if (!cleanName) {
      setError('Full Name cannot be blank.');
      return;
    }

    if (cleanName.length < 2) {
      setError('Full Name must be at least 2 characters long.');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await updateProfile({
        full_name: cleanName,
        role: cleanRole || 'Musician',
        bio: cleanBio,
        location: cleanLocation,
        avatar_url: cleanAvatar || PRESET_AVATARS[0].url
      });

      if (updateError) {
        setError(updateError.message || 'Failed to update profile.');
      } else {
        setSuccessMessage('Profile updated successfully! All changes are now live across M.O.');
      }
    } catch (err) {
      setError('An unexpected error occurred while saving your profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container" style={{ display: 'flex', justifyContent: 'center', paddingBottom: '3rem' }}>
      <div className="w-full" style={{ maxWidth: '640px' }}>

        {/* Header */}
        <div className="glass-panel p-4 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="btn-secondary flex items-center justify-center" style={{ padding: '0.5rem', borderRadius: '8px' }}>
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="m-0" style={{ fontSize: '1.25rem' }}>Profile Settings</h1>
              <p className="text-xs text-muted m-0">Customize your public artist card and industry credentials</p>
            </div>
          </div>
          <Link to="/" className="text-xs text-muted" style={{ textDecoration: 'none' }}>
            Back to Feed
          </Link>
        </div>

        {/* Live Profile Card Preview */}
        <div className="glass-panel p-4 mb-4" style={{ textAlign: 'center', background: 'rgba(255,255,255,0.03)' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted flex items-center gap-1 font-bold" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <User size={14} color="var(--accent-primary)" /> Preview
            </span>
            <span className="text-xs text-muted">Public view</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              className="w-20 h-20 rounded-full flex-shrink-0 overflow-hidden mb-2"
              style={{ border: '2px solid var(--accent-primary)', boxShadow: '0 0 16px rgba(139, 92, 246, 0.3)' }}
            >
              <img
                src={avatarUrl || PRESET_AVATARS[0].url}
                alt="Profile Preview"
                onError={(e) => { e.currentTarget.src = PRESET_AVATARS[0].url; }}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <h2 className="text-lg font-bold m-0" style={{ fontSize: '1.125rem' }}>
              {fullName.trim() || 'Your Name'}
            </h2>
            <p className="text-sm text-muted mb-1">
              {role.trim() || 'Musician'}
            </p>
            {location.trim() && (
              <p className="text-xs flex items-center justify-center gap-1 mb-2" style={{ color: 'var(--accent-secondary)' }}>
                <MapPin size={12} /> {location.trim()}
              </p>
            )}
            {bio.trim() && (
              <p className="text-xs text-muted mt-1 px-4" style={{ maxWidth: '440px', lineHeight: 1.4, wordBreak: 'break-word' }}>
                "{bio.trim()}"
              </p>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="glass-panel p-4 flex-col gap-4" style={{ display: 'flex' }}>

          {error && (
            <div
              role="alert"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: '#ef4444',
                fontSize: '0.875rem'
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div
              role="status"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.2)',
                color: '#22c55e',
                fontSize: '0.875rem'
              }}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
                <span>{successMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="btn-secondary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', borderRadius: '6px', whiteSpace: 'nowrap' }}
              >
                View on Feed →
              </button>
            </div>
          )}

          {/* Avatar Selector */}
          <div className="flex-col gap-2" style={{ display: 'flex' }}>
            <label className="text-sm font-bold text-muted flex items-center justify-between">
              <span>Profile Avatar</span>
              <span className="text-xs font-normal">Select a preset or paste URL</span>
            </label>

            <div className="flex gap-2 mb-2" style={{ flexWrap: 'wrap' }}>
              {PRESET_AVATARS.map((preset, idx) => {
                const isSelected = avatarUrl === preset.url;
                return (
                  <button
                    key={idx}
                    type="button"
                    title={preset.label}
                    onClick={() => setAvatarUrl(preset.url)}
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      padding: 0,
                      border: isSelected ? '2px solid var(--accent-primary)' : '2px solid transparent',
                      boxShadow: isSelected ? '0 0 10px var(--accent-primary)' : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      background: 'none'
                    }}
                  >
                    <img src={preset.url} alt={preset.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </button>
                );
              })}
            </div>

            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="Or paste custom image URL (https://...)"
              maxLength={250}
              className="w-full"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '0.65rem 1rem',
                color: 'var(--text-primary)',
                outline: 'none',
                boxSizing: 'border-box',
                fontSize: '0.875rem'
              }}
            />
          </div>

          {/* Full Name */}
          <div className="flex-col gap-2" style={{ display: 'flex' }}>
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold text-muted">Full Name *</label>
              <span className="text-xs text-muted">{fullName.length}/70</span>
            </div>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              maxLength={70}
              placeholder="e.g. Alex Chen"
              required
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

          {/* Role */}
          <div className="flex-col gap-2" style={{ display: 'flex' }}>
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold text-muted">Professional Role</label>
              <span className="text-xs text-muted">{role.length}/100</span>
            </div>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Producer, Session Guitarist, Audio Engineer, Venue Manager"
              maxLength={100}
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

          {/* Location */}
          <div className="flex-col gap-2" style={{ display: 'flex' }}>
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold text-muted">Location</label>
              <span className="text-xs text-muted">{location.length}/80</span>
            </div>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Nashville, TN or Los Angeles, CA"
              maxLength={80}
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

          {/* Bio */}
          <div className="flex-col gap-2" style={{ display: 'flex' }}>
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold text-muted">Bio</label>
              <span className="text-xs text-muted">{bio.length}/500</span>
            </div>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows="4"
              placeholder="Tell the network about your music, gear, recent projects, or what you're looking for..."
              maxLength={500}
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

          {/* Actions */}
          <div className="flex items-center justify-between mt-4">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="btn-secondary"
              style={{ padding: '0.75rem 1.25rem' }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex items-center gap-2"
              style={{
                padding: '0.75rem 1.5rem',
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {loading ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
