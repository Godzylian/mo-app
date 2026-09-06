import { useState, useEffect, useMemo } from 'react';
import {
  Home, Users, Briefcase, Calendar, Bell, MessageSquare,
  Settings as SettingsIcon, Music, Search, Heart, MessageCircle, Share2,
  MoreHorizontal, MapPin, Star, LogOut, Mic2, Send, Image as ImageIcon,
  Trash2, Loader2, Check, AlertCircle, X, Sparkles, Globe, ExternalLink,
  FileText, Film, Download
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import PostMediaRenderer from '../components/PostMediaRenderer';

// Sample seed posts to keep feed vibrant if DB has no posts yet
const SEED_POSTS = [
  {
    id: 'seed-post-1',
    user_id: 'sample-venue-id',
    content: "Opening Act Needed for Friday Night! 🎸\nWe had a last-minute cancellation for this Friday's indie rock showcase. Looking for an acoustic or indie band to fill a 45-minute slot. Paid gig. Message for details!",
    post_type: 'booking',
    media_url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1000&auto=format&fit=crop',
    likes_count: 24,
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    profiles: {
      id: 'sample-venue-id',
      full_name: 'The Echo Room',
      role: 'Live Venue & Lounge',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop',
      location: 'Austin, TX'
    }
  },
  {
    id: 'seed-post-2',
    user_id: 'sample-director-id',
    content: "Extremely excited to announce open auditions for our upcoming winter musical showcase! 🎹✨ Accepting submissions for 2 intermediate-to-advanced piano/synth players and backing vocalists.",
    post_type: 'audition',
    media_url: '',
    likes_count: 112,
    created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    profiles: {
      id: 'sample-director-id',
      full_name: 'Sarah Jenkins',
      role: 'Vocal Coach & Casting Director',
      avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=200&auto=format&fit=crop',
      location: 'Chicago, IL'
    }
  }
];

export default function HomePage() {
  const { user, profile, signOut } = useAuth();

  // Posts State
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [feedTab, setFeedTab] = useState('all'); // 'all' | 'bookings' | 'auditions'

  // Create Post Composer State
  const [isComposerExpanded, setIsComposerExpanded] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [postType, setPostType] = useState('general'); // 'general' | 'booking' | 'audition'
  const [mediaUrl, setMediaUrl] = useState('');
  const [showMediaInput, setShowMediaInput] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [postError, setPostError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [likedPostIds, setLikedPostIds] = useState(new Set());
  const [showSqlGuide, setShowSqlGuide] = useState(false);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Fetch Live Posts from Supabase
  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          user_id,
          content,
          post_type,
          media_url,
          likes_count,
          created_at,
          profiles:user_id (
            id,
            full_name,
            role,
            avatar_url,
            location
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        // If table doesn't exist yet in Supabase, flag guide
        if (error.message.includes('relation "public.posts" does not exist') || error.message.includes('schema cache')) {
          console.warn('Posts table not yet created in Supabase SQL editor. Using fallback display.');
          setShowSqlGuide(true);
        } else {
          console.warn('Could not fetch posts:', error.message);
        }
        setPosts(SEED_POSTS);
      } else if (data && data.length > 0) {
        // Merge Supabase posts with seed posts if needed
        setPosts(data);
        setShowSqlGuide(false);
      } else {
        setPosts(SEED_POSTS);
      }
    } catch (err) {
      console.error('Error in fetchPosts:', err);
      setPosts(SEED_POSTS);
    } finally {
      setLoadingPosts(false);
    }
  };

  useEffect(() => {
    fetchPosts();

    // Listen for real-time posts from other users
    const channel = supabase
      .channel('public:posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        fetchPosts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Handle Creating a New Live Post
  const handleCreatePost = async (e) => {
    e.preventDefault();
    const cleanContent = postContent.trim();
    if (!cleanContent) return;

    if (!user) {
      setPostError('You must be signed in to create a post.');
      return;
    }

    setIsPosting(true);
    setPostError('');

    const newPostPayload = {
      user_id: user.id,
      content: cleanContent,
      post_type: postType,
      media_url: mediaUrl.trim() || null,
      likes_count: 0
    };

    try {
      const { data, error } = await supabase
        .from('posts')
        .insert([newPostPayload])
        .select(`
          id,
          user_id,
          content,
          post_type,
          media_url,
          likes_count,
          created_at,
          profiles:user_id (
            id,
            full_name,
            role,
            avatar_url,
            location
          )
        `)
        .single();

      if (error) {
        // If table does not exist yet in Supabase
        if (error.message.includes('relation "public.posts" does not exist') || error.message.includes('schema cache')) {
          setShowSqlGuide(true);
          // Optimistic local post for immediate preview
          const localPost = {
            id: `local-post-${Date.now()}`,
            user_id: user.id,
            content: cleanContent,
            post_type: postType,
            media_url: mediaUrl.trim() || null,
            likes_count: 0,
            created_at: new Date().toISOString(),
            profiles: {
              id: user.id,
              full_name: profile?.full_name || user.email || 'You',
              role: profile?.role || 'Musician',
              avatar_url: profile?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop',
              location: profile?.location || ''
            }
          };
          setPosts(prev => [localPost, ...prev]);
          triggerToast('Posted locally! (Run the SQL snippet to persist to database)');
        } else {
          setPostError(error.message || 'Failed to publish post.');
          return;
        }
      } else if (data) {
        // If profiles join returned null initially (e.g. trigger delay), attach active profile
        const postWithAuthor = {
          ...data,
          profiles: data.profiles || {
            id: user.id,
            full_name: profile?.full_name || 'Member',
            role: profile?.role || 'Musician',
            avatar_url: profile?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop',
            location: profile?.location || ''
          }
        };

        setPosts(prev => [postWithAuthor, ...prev]);
        triggerToast('Your post is live on the feed!');
      }

      // Reset form
      setPostContent('');
      setMediaUrl('');
      setIsComposerExpanded(false);
      setShowMediaInput(false);
    } catch (err) {
      console.error('Error submitting post:', err);
      setPostError('An unexpected error occurred while posting.');
    } finally {
      setIsPosting(false);
    }
  };

  // Handle Deleting a Post (Author only)
  const handleDeletePost = async (postId) => {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', user.id);

      if (!error) {
        setPosts(prev => prev.filter(p => p.id !== postId));
        triggerToast('Post deleted successfully.');
      } else {
        // If local or failed
        setPosts(prev => prev.filter(p => p.id !== postId));
        triggerToast('Post removed.');
      }
    } catch (err) {
      console.error('Error deleting post:', err);
    }
  };

  // Handle Liking a Post
  const handleLikePost = (postId) => {
    setLikedPostIds(prev => {
      const next = new Set(prev);
      const isLiked = next.has(postId);
      if (isLiked) {
        next.delete(postId);
      } else {
        next.add(postId);
      }

      setPosts(currentPosts => currentPosts.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            likes_count: isLiked ? Math.max(0, (p.likes_count || 1) - 1) : (p.likes_count || 0) + 1
          };
        }
        return p;
      }));

      return next;
    });
  };

  // Format Relative Timestamp
  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return 'Just now';
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / (60 * 1000));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  // Filtered Posts based on Feed Filter Tab
  const filteredPosts = useMemo(() => {
    return posts.filter(p => {
      if (feedTab === 'bookings') return p.post_type === 'booking';
      if (feedTab === 'auditions') return p.post_type === 'audition';
      return true;
    });
  }, [posts, feedTab]);

  return (
    <>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--accent-gradient)',
            color: 'white',
            padding: '0.65rem 1.25rem',
            borderRadius: 'var(--radius-full)',
            boxShadow: '0 8px 24px rgba(139, 92, 246, 0.4)',
            zIndex: 9999,
            fontSize: '0.875rem',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <Check size={16} /> {toastMessage}
        </div>
      )}

      {/* Navbar */}
      <nav className="glass-panel flex items-center justify-between p-4 mb-4" style={{ position: 'sticky', top: 0, zIndex: 50, borderRadius: '0 0 var(--radius-lg) var(--radius-lg)', margin: '0 1rem 1.5rem 1rem' }}>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--accent-gradient)' }}>
            <Music size={20} color="white" />
          </div>
          <h1 className="text-gradient" style={{ margin: 0, fontSize: '1.5rem' }}>M.O.</h1>
        </div>

        <div className="flex items-center gap-4 w-full" style={{ maxWidth: '400px' }}>
          <div className="w-full" style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={18} />
            <input
              type="text"
              placeholder="Search for musicians, venues, or bookings..."
              className="w-full"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-full)',
                padding: '0.5rem 1rem 0.5rem 2.5rem',
                color: 'var(--text-primary)',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link
            to="/create-post"
            className="btn-primary flex items-center gap-2"
            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', textDecoration: 'none' }}
            title="Create and publish a post in the studio"
          >
            <Briefcase size={16} /> Post MO
          </Link>
          <Bell size={20} className="text-muted" style={{ cursor: 'pointer' }} />
          <Link to="/network" title="Messages & Network">
            <MessageSquare size={20} className="text-muted" style={{ cursor: 'pointer' }} />
          </Link>
          <div className="w-8 h-8 rounded-full bg-gray-500 flex-shrink-0 overflow-hidden" style={{ cursor: 'pointer' }}>
            <Link to="/settings">
              <img src={profile?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop'} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Layout */}
      <main className="app-container">

        {/* LEFT PANEL */}
        <aside className="left-panel flex-col gap-4" style={{ display: 'flex' }}>
          <div className="glass-panel p-4 flex-col items-center" style={{ textAlign: 'center', display: 'flex' }}>
            <div className="w-20 h-20 rounded-full flex-shrink-0 overflow-hidden mb-2" style={{ border: '2px solid var(--accent-primary)' }}>
              <img src={profile?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop'} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <h2 className="text-lg font-bold m-0" style={{ fontSize: '1.125rem' }}>{profile?.full_name || 'Loading...'}</h2>
            <p className="text-sm text-muted mb-1">{profile?.role || 'No Info'}</p>

            {profile?.location && (
              <p className="text-xs text-muted flex items-center justify-center gap-1 mb-2" style={{ color: 'var(--accent-secondary)' }}>
                <MapPin size={12} /> {profile.location}
              </p>
            )}

            {profile?.bio && (
              <p className="text-xs text-muted mb-3 px-2" style={{ lineHeight: '1.4', wordBreak: 'break-word' }}>
                {profile.bio}
              </p>
            )}

            <div className="flex justify-between w-full border-b pb-4 mb-4" style={{ borderBottomColor: 'var(--border-color)' }}>
              <Link to="/network" style={{ textDecoration: 'none', color: 'inherit' }}>
                <p className="font-bold m-0">{profile?.connections_count || 0}</p>
                <p className="text-xs text-muted m-0">Connections</p>
              </Link>
              <Link to="/bookings" style={{ textDecoration: 'none', color: 'inherit' }}>
                <p className="font-bold m-0">{profile?.gigs_count || 0}</p>
                <p className="text-xs text-muted m-0">Gigs</p>
              </Link>
            </div>

            <nav className="flex-col w-full text-left gap-2" style={{ display: 'flex' }}>
              <Link to="/" className="flex items-center gap-3 p-2 rounded-md" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <Home size={18} className="text-muted" /> Home
              </Link>
              <Link to="/network" className="flex items-center gap-3 p-2 rounded-md hover-bg" style={{ transition: 'background 0.2s', ':hover': { background: 'rgba(255,255,255,0.05)' } }}>
                <Users size={18} className="text-muted" /> My Network
              </Link>
              <Link to="/bookings" className="flex items-center gap-3 p-2 rounded-md hover-bg" style={{ transition: 'background 0.2s', ':hover': { background: 'rgba(255,255,255,0.05)' } }}>
                <Calendar size={18} color="var(--accent-secondary)" /> Active Bookings
              </Link>
              <Link to="/auditions" className="flex items-center gap-3 p-2 rounded-md hover-bg" style={{ transition: 'background 0.2s', ':hover': { background: 'rgba(255,255,255,0.05)' } }}>
                <Mic2 size={18} color="#10b981" /> Active Auditions
              </Link>
              <Link to="/settings" className="flex items-center gap-3 p-2 rounded-md hover-bg" style={{ transition: 'background 0.2s', ':hover': { background: 'rgba(255,255,255,0.05)' } }}>
                <SettingsIcon size={18} className="text-muted" /> Settings
              </Link>
              <button
                onClick={signOut}
                className="flex items-center gap-3 p-2 rounded-md hover-bg"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', width: '100%', textAlign: 'left', marginTop: '0.5rem', padding: '0.5rem' }}
              >
                <LogOut size={18} color="#ef4444" /> Sign Out
              </button>
            </nav>
          </div>
        </aside>

        {/* MIDDLE PANEL */}
        <section className="middle-panel flex-col gap-4" style={{ display: 'flex' }}>

          {/* Database Guide Alert (Shown if table not yet migrated) */}
          {showSqlGuide && (
            <div
              className="glass-panel p-3.5"
              style={{
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8rem'
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold flex items-center gap-1.5" style={{ color: 'var(--accent-secondary)' }}>
                  <Sparkles size={14} /> Enable Supabase Posts Table
                </span>
                <button
                  onClick={() => setShowSqlGuide(false)}
                  className="text-muted"
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <X size={14} />
                </button>
              </div>
              <p className="m-0 text-muted">
                To have posts permanently shared across both accounts, run the SQL script in your <strong>Supabase SQL Editor</strong>. (We added the <code>posts</code> table definition into <code>supabase/schema.sql</code>).
              </p>
            </div>
          )}

          {/* MINIMALISTIC POSTING PANEL */}
          <div className="glass-panel p-3.5 flex-col gap-2.5" style={{ display: 'flex' }}>
            <textarea
              placeholder={
                postType === 'booking'
                  ? "Describe your gig or booking needs (venue, date, compensation)..."
                  : postType === 'audition'
                  ? "Describe the role, audition requirements, and dates..."
                  : "What's happening in your music world? Share a quick update, gig, or audition call..."
              }
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              rows={2}
              maxLength={600}
              className="w-full"
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '0.65rem 0.85rem',
                color: 'var(--text-primary)',
                outline: 'none',
                resize: 'none',
                fontSize: '0.875rem',
                fontFamily: 'inherit',
                boxSizing: 'border-box'
              }}
            />

            {postError && (
              <p className="text-xs m-0 flex items-center gap-1" style={{ color: '#ef4444' }}>
                <AlertCircle size={12} /> {postError}
              </p>
            )}

            {/* Optional Media Input */}
            {showMediaInput && (
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  placeholder="Paste image/media link (https://...)"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  className="w-full text-xs"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.45rem 0.75rem',
                    color: 'white',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => { setShowMediaInput(false); setMediaUrl(''); }}
                  className="text-muted"
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Bottom Controls: Minimalist Category Pills, Media, and Actions */}
            <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setPostType('general')}
                  style={{
                    padding: '0.25rem 0.6rem',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.75rem',
                    border: '1px solid var(--border-color)',
                    background: postType === 'general' ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.04)',
                    color: postType === 'general' ? 'white' : 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  Update
                </button>

                <button
                  type="button"
                  onClick={() => setPostType('booking')}
                  style={{
                    padding: '0.25rem 0.6rem',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.75rem',
                    border: '1px solid var(--border-color)',
                    background: postType === 'booking' ? 'var(--accent-secondary)' : 'rgba(255,255,255,0.04)',
                    color: postType === 'booking' ? 'white' : 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  Gig
                </button>

                <button
                  type="button"
                  onClick={() => setPostType('audition')}
                  style={{
                    padding: '0.25rem 0.6rem',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.75rem',
                    border: '1px solid var(--border-color)',
                    background: postType === 'audition' ? '#10b981' : 'rgba(255,255,255,0.04)',
                    color: postType === 'audition' ? 'white' : 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  Audition
                </button>

                <button
                  type="button"
                  onClick={() => setShowMediaInput(!showMediaInput)}
                  className="btn-secondary flex items-center gap-1"
                  style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                  title="Attach image or media link"
                >
                  <ImageIcon size={13} /> Media
                </button>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  to="/create-post"
                  className="text-xs flex items-center gap-1"
                  style={{ color: 'var(--accent-secondary)', textDecoration: 'none', marginRight: '0.25rem' }}
                  title="Open full upload studio with advanced fields"
                >
                  Full Studio <ExternalLink size={12} />
                </Link>

                <button
                  type="button"
                  onClick={() => { setPostContent(''); setShowMediaInput(false); setPostError(''); }}
                  className="btn-secondary"
                  style={{ padding: '0.35rem 0.7rem', fontSize: '0.75rem' }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={isPosting || !postContent.trim()}
                  onClick={handleCreatePost}
                  className="btn-primary flex items-center gap-1"
                  style={{
                    padding: '0.35rem 0.9rem',
                    fontSize: '0.75rem',
                    opacity: isPosting || !postContent.trim() ? 0.6 : 1,
                    cursor: isPosting || !postContent.trim() ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isPosting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  {isPosting ? 'Posting...' : 'Post'}
                </button>
              </div>
            </div>
          </div>

          {/* Feed Filter / Calendar Quick Nav */}
          <div className="flex gap-4 border-b" style={{ borderBottomColor: 'var(--border-color)', paddingBottom: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={() => setFeedTab('all')}
              className="text-sm font-bold"
              style={{
                color: feedTab === 'all' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                borderBottom: feedTab === 'all' ? '2px solid var(--accent-primary)' : 'none',
                paddingBottom: '0.5rem',
                background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer'
              }}
            >
              All Updates ({posts.length})
            </button>

            <button
              onClick={() => setFeedTab('bookings')}
              className="text-sm font-medium"
              style={{
                color: feedTab === 'bookings' ? 'var(--accent-secondary)' : 'var(--text-secondary)',
                borderBottom: feedTab === 'bookings' ? '2px solid var(--accent-secondary)' : 'none',
                paddingBottom: '0.5rem',
                background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer'
              }}
            >
              Bookings Feed
            </button>

            <button
              onClick={() => setFeedTab('auditions')}
              className="text-sm font-medium"
              style={{
                color: feedTab === 'auditions' ? '#10b981' : 'var(--text-secondary)',
                borderBottom: feedTab === 'auditions' ? '2px solid #10b981' : 'none',
                paddingBottom: '0.5rem',
                background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer'
              }}
            >
              Auditions Feed
            </button>

          </div>

          {/* DYNAMIC POSTS LIST */}
          {loadingPosts ? (
            <div className="glass-panel p-6 text-center">
              <Loader2 size={24} className="animate-spin text-muted" style={{ margin: '0 auto 0.5rem auto' }} />
              <p className="text-xs text-muted m-0">Loading community feed...</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="glass-panel p-6 text-center">
              <Music size={32} className="text-muted" style={{ margin: '0 auto 0.5rem auto', opacity: 0.5 }} />
              <h4 className="text-sm font-bold m-0">No posts in this category</h4>
              <p className="text-xs text-muted mt-1">Be the first to share an update above!</p>
            </div>
          ) : (
            filteredPosts.map((post) => {
              const author = post.profiles || {};
              const isMyPost = user && post.user_id === user.id;
              const isLiked = likedPostIds.has(post.id);

              return (
                <div key={post.id} className="glass-panel p-4 flex-col gap-3" style={{ display: 'flex' }}>

                  {/* Post Header: Author info & options */}
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3 items-center">
                      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0" style={{ border: '1px solid var(--border-color)' }}>
                        <img
                          src={author.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop'}
                          alt={author.full_name || 'Member'}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm m-0">{author.full_name || 'Member'}</h3>

                          {/* Post Type Badge */}
                          {post.post_type === 'booking' && (
                            <Link
                              to="/bookings"
                              className="text-xs font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: 'rgba(59, 130, 246, 0.2)', color: 'var(--accent-secondary)', textDecoration: 'none' }}
                            >
                              Booking (Gig)
                            </Link>
                          )}
                          {post.post_type === 'audition' && (
                            <Link
                              to="/auditions"
                              className="text-xs font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', textDecoration: 'none' }}
                            >
                              Audition Call
                            </Link>
                          )}
                          {(!post.post_type || post.post_type === 'general') && author.role && (
                            <span className="text-xs font-normal text-muted px-2 py-0.5 rounded-full" style={{ background: 'rgba(255, 255, 255, 0.06)' }}>
                              {author.role}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-muted m-0">
                          {formatTimeAgo(post.created_at)} {author.location && `• ${author.location}`}
                        </p>
                      </div>
                    </div>

                    {/* Author Controls */}
                    {isMyPost && (
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        title="Delete your post"
                        className="text-muted hover-text-primary"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
                      >
                        <Trash2 size={16} color="#ef4444" />
                      </button>
                    )}
                  </div>

                  {/* Post Content */}
                  <div className="mt-1">
                    <p className="text-sm m-0" style={{ lineHeight: '1.5', whiteSpace: 'pre-line', color: 'var(--text-primary)' }}>
                      {post.content}
                    </p>
                  </div>

                  {/* Multi-Format Media Attachment (PDF, Audio, Video, Image) */}
                  {post.media_url && (
                    <PostMediaRenderer mediaUrl={post.media_url} />
                  )}

                  {/* Contextual Link depending on post type */}
                  {post.post_type === 'booking' && (
                    <div className="flex justify-end pt-1">
                      <Link to="/bookings" className="btn-secondary text-xs" style={{ padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-full)' }}>
                        View in Bookings Calendar →
                      </Link>
                    </div>
                  )}

                  {post.post_type === 'audition' && (
                    <div className="flex justify-end pt-1">
                      <Link to="/auditions" className="btn-secondary text-xs" style={{ padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-full)' }}>
                        View in Auditions Calendar →
                      </Link>
                    </div>
                  )}

                  {/* Post Footer Actions (Like, Comment, Share) */}
                  <div className="flex gap-4 mt-2 border-t pt-3" style={{ borderTopColor: 'var(--border-color)', borderTopStyle: 'solid', borderTopWidth: '1px' }}>
                    <button
                      onClick={() => handleLikePost(post.id)}
                      className="flex items-center gap-2 text-sm text-muted"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: isLiked ? '#ef4444' : 'var(--text-secondary)',
                        transition: 'color 0.2s'
                      }}
                    >
                      <Heart size={16} color={isLiked ? '#ef4444' : 'currentColor'} fill={isLiked ? '#ef4444' : 'none'} />
                      {post.likes_count || 0}
                    </button>

                    <Link
                      to="/network"
                      className="flex items-center gap-2 text-sm text-muted hover-text-primary"
                      style={{ textDecoration: 'none', color: 'var(--text-secondary)', transition: 'color 0.2s' }}
                    >
                      <MessageCircle size={16} /> Connect
                    </Link>

                    <button
                      onClick={() => triggerToast('Post link copied to clipboard!')}
                      className="flex items-center gap-2 text-sm text-muted ml-auto hover-text-primary"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }}
                    >
                      <Share2 size={16} />
                    </button>
                  </div>

                </div>
              );
            })
          )}

        </section>

        {/* RIGHT PANEL */}
        <aside className="right-panel flex-col gap-4" style={{ display: 'flex' }}>

          <div className="glass-panel p-4">
            <h3 className="text-sm font-bold mb-4 flex items-center justify-between m-0" style={{ marginBottom: '1rem' }}>Suggested Connections <Users size={14} className="text-muted" /></h3>

            <div className="flex-col gap-4" style={{ display: 'flex' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                    <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop" alt="Record Label" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold m-0">Vibe Records</h4>
                    <p className="text-xs text-muted m-0 flex items-center gap-1"><MapPin size={10} /> Los Angeles</p>
                  </div>
                </div>
                <Link to="/network" className="w-8 h-8 rounded-full flex items-center justify-center btn-secondary" style={{ padding: 0 }}><Users size={14} /></Link>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                    <img src="https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=200&auto=format&fit=crop" alt="Teacher" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold m-0">Dr. Eva Kim</h4>
                    <p className="text-xs text-muted m-0 flex items-center gap-1"><Star size={10} /> Juilliard Faculty</p>
                  </div>
                </div>
                <Link to="/network" className="w-8 h-8 rounded-full flex items-center justify-center btn-secondary" style={{ padding: 0 }}><Users size={14} /></Link>
              </div>
            </div>
          </div>

          <div className="glass-panel p-4">
            <h3 className="text-sm font-bold mb-4 flex items-center justify-between m-0" style={{ marginBottom: '1rem' }}>Upcoming Events <Calendar size={14} className="text-muted" /></h3>

            <div className="flex-col gap-3" style={{ display: 'flex' }}>
              <div className="flex gap-3">
                <div className="w-12 h-12 rounded-lg bg-gray-800 flex-shrink-0" style={{ background: 'url(https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?q=80&w=200&auto=format&fit=crop) center/cover' }}></div>
                <div>
                  <h4 className="text-sm font-bold m-0">Berklee Workshop</h4>
                  <p className="text-xs text-muted m-0">Jan 13 • 8:00 PM</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-12 h-12 rounded-lg bg-gray-800 flex-shrink-0" style={{ background: 'url(https://images.unsplash.com/photo-1540039155732-d682d153282c?q=80&w=200&auto=format&fit=crop) center/cover' }}></div>
                <div>
                  <h4 className="text-sm font-bold m-0">LA Music Mixer</h4>
                  <p className="text-xs text-muted m-0">Mar 7 • 7:00 PM</p>
                </div>
              </div>
            </div>

            <Link to="/bookings" className="w-full mt-4 text-sm font-medium p-2 rounded-md flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', textDecoration: 'none', transition: 'background 0.2s' }}>
              View All Gigs on Calendar
            </Link>
          </div>
        </aside>

      </main>
    </>
  );
}
