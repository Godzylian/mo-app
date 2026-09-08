import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, MapPin, CheckCircle2, AlertCircle, Loader2, User, Users, Sparkles, X } from 'lucide-react';

const PRESET_AVATARS = [
  { label: 'Studio Producer', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop' },
  { label: 'Guitarist', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop' },
  { label: 'Vocalist', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=200&auto=format&fit=crop' },
  { label: 'DJ / Beatmaker', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=200&auto=format&fit=crop' },
  { label: 'Songwriter', url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=200&auto=format&fit=crop' },
];

const CONNECTION_REQUESTS_SQL = `-- Run this in your Supabase SQL Editor:

-- 1. Add privacy toggle column to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS require_connection_request BOOLEAN DEFAULT FALSE;

-- 2. Create connection_requests table
CREATE TABLE IF NOT EXISTS public.connection_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sender_id, receiver_id)
);

-- 3. If columns were previously named requester_id or target_id, rename them
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='connection_requests' AND column_name='requester_id'
  ) THEN
    ALTER TABLE public.connection_requests RENAME COLUMN requester_id TO sender_id;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='connection_requests' AND column_name='target_id'
  ) THEN
    ALTER TABLE public.connection_requests RENAME COLUMN target_id TO receiver_id;
  END IF;
END $$;

-- 4. Enable Row Level Security and Policies
ALTER TABLE public.connection_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Connection requests viewable by sender or receiver" ON public.connection_requests;
CREATE POLICY "Connection requests viewable by sender or receiver" ON public.connection_requests
  FOR SELECT TO authenticated USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can send connection requests" ON public.connection_requests;
CREATE POLICY "Users can send connection requests" ON public.connection_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users can update received connection requests" ON public.connection_requests;
CREATE POLICY "Users can update received connection requests" ON public.connection_requests
  FOR UPDATE TO authenticated USING (auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can delete their connection requests" ON public.connection_requests;
CREATE POLICY "Users can delete their connection requests" ON public.connection_requests
  FOR DELETE TO authenticated USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- 5. Enable Realtime on connection_requests
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.connection_requests;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
`;

export default function Settings() {
  const { profile, updateProfile } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [requireConnectionRequest, setRequireConnectionRequest] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showSqlGuide, setShowSqlGuide] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const handleCopySql = () => {
    navigator.clipboard.writeText(CONNECTION_REQUESTS_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  // Populate form fields when profile state loads
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setRole(profile.role || '');
      setBio(profile.bio || '');
      setLocation(profile.location || '');
      setAvatarUrl(profile.avatar_url || PRESET_AVATARS[0].url);
      setRequireConnectionRequest(Boolean(profile.require_connection_request));
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
      const { error: updateError, missingColumns } = await updateProfile({
        full_name: cleanName,
        role: cleanRole || 'Musician',
        bio: cleanBio,
        location: cleanLocation,
        avatar_url: cleanAvatar || PRESET_AVATARS[0].url,
        require_connection_request: requireConnectionRequest
      });

      if (missingColumns && missingColumns.includes('require_connection_request')) {
        setShowSqlGuide(true);
        setError('⚠️ Profile updated, but your Supabase database is missing the require_connection_request column. Run the SQL migration below in your Supabase SQL Editor to save this privacy setting.');
        return;
      }

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

        {/* Database Migration Guide Alert */}
        {showSqlGuide && (
          <div
            className="glass-panel p-4 mb-4"
            style={{
              background: 'rgba(139, 92, 246, 0.12)',
              border: '1px solid rgba(139, 92, 246, 0.4)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem'
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold flex items-center gap-1.5" style={{ color: 'var(--accent-secondary)' }}>
                <Sparkles size={16} /> Supabase Setup Required for Connection Privacy
              </span>
              <button
                type="button"
                onClick={() => setShowSqlGuide(false)}
                className="text-muted hover-text-primary"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem' }}
              >
                <X size={16} />
              </button>
            </div>
            <p className="m-0 text-muted mb-3" style={{ lineHeight: 1.5 }}>
              To save your <strong>Connection Approval</strong> setting and enable incoming connection requests, your Supabase database needs the <code>require_connection_request</code> column and <code>connection_requests</code> table. Copy and run the script below in your <strong>Supabase SQL Editor</strong>.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleCopySql}
                className="btn-primary flex items-center gap-1.5 text-xs font-bold"
                style={{ padding: '0.45rem 1rem', borderRadius: 'var(--radius-full)' }}
              >
                {copiedSql ? '✓ Copied to Clipboard!' : 'Copy Supabase SQL Script'}
              </button>
              <span className="text-xs text-muted" style={{ opacity: 0.8 }}>
                Paste into Supabase SQL Editor & click Run
              </span>
            </div>
          </div>
        )}

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

          {/* Networking & Connection Privacy */}
          <div 
            className="p-4 rounded-xl flex-col gap-3" 
            style={{ 
              display: 'flex', 
              background: 'rgba(139, 92, 246, 0.07)', 
              border: '1px solid rgba(139, 92, 246, 0.25)',
              borderRadius: 'var(--radius-md)'
            }}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-secondary)' }}
                >
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold m-0" style={{ color: 'var(--text-primary)' }}>
                    Require Connection Requests
                  </h3>
                  <p className="text-xs text-muted m-0 mt-0.5" style={{ lineHeight: 1.4 }}>
                    When enabled, other musicians cannot connect with you directly. They must send a request that you can approve or ignore in <strong>My Network</strong>.
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={requireConnectionRequest}
                onClick={() => setRequireConnectionRequest(prev => !prev)}
                style={{
                  width: '48px',
                  height: '26px',
                  borderRadius: '13px',
                  background: requireConnectionRequest ? 'var(--accent-gradient)' : 'rgba(255, 255, 255, 0.15)',
                  position: 'relative',
                  border: 'none',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'background 0.25s ease',
                  padding: '2px'
                }}
                title={requireConnectionRequest ? 'Connection approval required (Click to disable)' : 'Direct connections allowed (Click to enable)'}
              >
                <div
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: 'white',
                    position: 'absolute',
                    top: '2px',
                    left: requireConnectionRequest ? '24px' : '2px',
                    transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
                  }}
                />
              </button>
            </div>

            <div className="flex items-center gap-2 pt-1 text-xs" style={{ color: requireConnectionRequest ? 'var(--accent-secondary)' : 'var(--text-secondary)' }}>
              <span 
                style={{ 
                  display: 'inline-block', 
                  width: '7px', 
                  height: '7px', 
                  borderRadius: '50%', 
                  background: requireConnectionRequest ? '#10b981' : '#64748b' 
                }} 
              />
              <span>
                {requireConnectionRequest 
                  ? 'Active: Connection requests will appear in your "Connection Requests" queue in My Network.' 
                  : 'Open Network: Other users can connect with you immediately without manual approval.'}
              </span>
            </div>
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
