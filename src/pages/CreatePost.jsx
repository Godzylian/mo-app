import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Briefcase, Mic2, MessageSquare, Image as ImageIcon,
  Send, Sparkles, AlertCircle, Check, Loader2, X, Lock, Globe,
  MapPin, DollarSign, Calendar as CalendarIcon, Eye,
  UploadCloud, FileText, Music, Film, Clock, ChevronDown
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { storeLocalMedia } from '../lib/mediaStorage';

const PRESET_MEDIA = [
  { label: 'Live Concert Stage', url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1000&auto=format&fit=crop' },
  { label: 'Recording Studio Console', url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=1000&auto=format&fit=crop' },
  { label: 'Acoustic Guitar Rehearsal', url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=1000&auto=format&fit=crop' },
  { label: 'Festival Crowd Lights', url: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?q=80&w=1000&auto=format&fit=crop' },
  { label: 'Synthesizers & Drum Machines', url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1000&auto=format&fit=crop' }
];

export default function CreatePostPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Form State
  const [postType, setPostType] = useState('general'); // 'general' | 'booking' | 'audition'
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');

  // File Upload State (PDF, Audio, Video up to 60min, Image)
  const [attachedFile, setAttachedFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState('');
  const [fileType, setFileType] = useState(''); // 'pdf' | 'audio' | 'video' | 'image'
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [mediaDuration, setMediaDuration] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [fileError, setFileError] = useState('');
  const [showExternalOptions, setShowExternalOptions] = useState(false);

  // Specific Metadata for Bookings
  const [bookingVenue, setBookingVenue] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingPay, setBookingPay] = useState('');
  const [bookingVisibility, setBookingVisibility] = useState('public'); // 'public' | 'private'

  // Specific Metadata for Auditions
  const [auditionRole, setAuditionRole] = useState('');
  const [auditionProduction, setAuditionProduction] = useState('');
  const [auditionComp, setAuditionComp] = useState('');
  const [auditionVisibility, setAuditionVisibility] = useState('public'); // 'public' | 'private'

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds)) return '';
    const totalSecs = Math.floor(seconds);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const clearAttachedFile = () => {
    if (filePreviewUrl && filePreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setAttachedFile(null);
    setFilePreviewUrl('');
    setFileType('');
    setFileName('');
    setFileSize('');
    setMediaDuration('');
    setFileError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processFile = (file) => {
    if (!file) return;
    setFileError('');

    const lowerName = file.name.toLowerCase();

    // 1. PDF Documents (Lead sheets, riders, contracts, stage plots)
    if (file.type === 'application/pdf' || lowerName.endsWith('.pdf')) {
      const url = URL.createObjectURL(file);
      setAttachedFile(file);
      setFilePreviewUrl(url);
      setFileType('pdf');
      setFileName(file.name);
      setFileSize(formatFileSize(file.size));
      setMediaDuration('');
      setMediaUrl('');
      return;
    }

    // 2. Audio files (Tracks, podcasts, voice memos, live rehearsals)
    if (file.type.startsWith('audio/') || /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(lowerName)) {
      const audio = document.createElement('audio');
      audio.preload = 'metadata';
      const url = URL.createObjectURL(file);
      audio.src = url;
      audio.onloadedmetadata = () => {
        if (audio.duration > 3600) {
          const durationMins = Math.ceil(audio.duration / 60);
          setFileError(`Audio track is ${durationMins} minutes long. The maximum allowed media duration is 60 minutes.`);
          URL.revokeObjectURL(url);
          return;
        }
        setAttachedFile(file);
        setFilePreviewUrl(url);
        setFileType('audio');
        setFileName(file.name);
        setFileSize(formatFileSize(file.size));
        setMediaDuration(formatDuration(audio.duration));
        setMediaUrl('');
      };
      audio.onerror = () => {
        // Allow file even if metadata cannot be decoded in head
        setAttachedFile(file);
        setFilePreviewUrl(url);
        setFileType('audio');
        setFileName(file.name);
        setFileSize(formatFileSize(file.size));
        setMediaDuration('');
        setMediaUrl('');
      };
      return;
    }

    // 3. Video files (Performance footage, reels, auditions up to 60 min)
    if (file.type.startsWith('video/') || /\.(mp4|mov|webm|m4v|mkv)$/i.test(lowerName)) {
      const video = document.createElement('video');
      video.preload = 'metadata';
      const url = URL.createObjectURL(file);
      video.src = url;
      video.onloadedmetadata = () => {
        if (video.duration > 3600) {
          const durationMins = Math.ceil(video.duration / 60);
          setFileError(`Video is ${durationMins} minutes long. The maximum allowed media duration is 60 minutes.`);
          URL.revokeObjectURL(url);
          return;
        }
        setAttachedFile(file);
        setFilePreviewUrl(url);
        setFileType('video');
        setFileName(file.name);
        setFileSize(formatFileSize(file.size));
        setMediaDuration(formatDuration(video.duration));
        setMediaUrl('');
      };
      video.onerror = () => {
        setAttachedFile(file);
        setFilePreviewUrl(url);
        setFileType('video');
        setFileName(file.name);
        setFileSize(formatFileSize(file.size));
        setMediaDuration('');
        setMediaUrl('');
      };
      return;
    }

    // 4. Image files (Flyers, posters, concert photos)
    if (file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(lowerName)) {
      const url = URL.createObjectURL(file);
      setAttachedFile(file);
      setFilePreviewUrl(url);
      setFileType('image');
      setFileName(file.name);
      setFileSize(formatFileSize(file.size));
      setMediaDuration('');
      setMediaUrl('');
      return;
    }

    setFileError('Unsupported file type. Please upload a PDF document, or audio/video/image media up to 60 minutes.');
  };

  const handlePublish = async (e) => {
    e.preventDefault();
    const cleanContent = content.trim();

    if (!cleanContent) {
      setError('Please provide some content for your post.');
      return;
    }

    if (!user) {
      setError('You must be signed in to create a post.');
      return;
    }

    setLoading(true);
    setError('');

    // Compile contextual details into formatted content if booking/audition
    let finalContent = cleanContent;

    if (postType === 'booking' && bookingVenue.trim()) {
      finalContent = `[GIG BOOKING: ${bookingVenue.trim()}${bookingPay.trim() ? ` • ${bookingPay.trim()}` : ''}${bookingDate ? ` • ${bookingDate}` : ''}]\n\n${cleanContent}`;
    } else if (postType === 'audition' && auditionRole.trim()) {
      finalContent = `[AUDITION CALL: ${auditionRole.trim()}${auditionProduction.trim() ? ` for ${auditionProduction.trim()}` : ''}${auditionComp.trim() ? ` • ${auditionComp.trim()}` : ''}]\n\n${cleanContent}`;
    }

    let finalMediaUrl = mediaUrl.trim() || null;

    // Handle File Upload if an attached file exists
    if (attachedFile) {
      let uploadedToStorage = false;

      // 1. First attempt: Supabase Storage bucket 'post-media'
      try {
        const fileExt = attachedFile.name.split('.').pop() || (fileType === 'video' ? 'mp4' : 'bin');
        const filePath = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('post-media')
          .upload(filePath, attachedFile, {
            cacheControl: '3600',
            upsert: true
          });

        if (!uploadErr && uploadData) {
          const { data: publicUrlData } = supabase.storage
            .from('post-media')
            .getPublicUrl(filePath);

          if (publicUrlData?.publicUrl) {
            finalMediaUrl = publicUrlData.publicUrl;
            uploadedToStorage = true;
          }
        } else if (uploadErr) {
          console.warn('Supabase storage upload returned error (bucket may not exist):', uploadErr.message);
        }
      } catch (uploadCatchErr) {
        console.warn('Storage upload network exception:', uploadCatchErr);
      }

      // 2. High-performance fallback:
      // If storage upload didn't succeed (e.g. bucket not yet configured in Supabase),
      // we save the blob into IndexedDB locally so videos and media play instantly
      // without freezing the browser or exceeding database payload limits!
      if (!uploadedToStorage) {
        // If it's a small file (< 2.5 MB) and not a video, we can use Data URL
        if (attachedFile.size < 2.5 * 1024 * 1024 && fileType !== 'video') {
          try {
            finalMediaUrl = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = (ev) => resolve(ev.target.result);
              reader.onerror = () => resolve(filePreviewUrl);
              reader.readAsDataURL(attachedFile);
            });
          } catch {
            const mediaKey = `media-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
            await storeLocalMedia(mediaKey, attachedFile);
            finalMediaUrl = `local-media:${fileType || 'file'}:${mediaKey}`;
          }
        } else {
          // For videos, audio, or large files: store directly in IndexedDB!
          const mediaKey = `media-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
          await storeLocalMedia(mediaKey, attachedFile);
          finalMediaUrl = `local-media:${fileType || 'video'}:${mediaKey}`;
        }
      }
    }

    const newPostPayload = {
      user_id: user.id,
      content: finalContent,
      post_type: postType,
      media_url: finalMediaUrl,
      likes_count: 0
    };

    try {
      const { error: postError } = await supabase
        .from('posts')
        .insert([newPostPayload]);

      if (postError) {
        console.error('Supabase post insert failed:', postError);
        setError(`Failed to publish post: ${postError.message || 'Database error'}. Please check your database permissions.`);
        setLoading(false);
        return; // DO NOT NAVIGATE AWAY ON ERROR!
      }

      // Smoothly navigate back to feed only on success
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Error in handlePublish:', err);
      setError('Failed to publish post. Please check your network and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container" style={{ minHeight: '100vh', padding: '1.5rem 1rem', display: 'flex', justifyContent: 'center', paddingBottom: '3rem' }}>
      <div className="w-full" style={{ maxWidth: '720px' }}>

        {/* Top Header */}
        <div className="glass-panel p-4 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="btn-secondary flex items-center justify-center" style={{ padding: '0.5rem', borderRadius: '8px' }}>
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="m-0 flex items-center gap-2" style={{ fontSize: '1.25rem' }}>
                Post M.O. Studio <Sparkles size={16} color="var(--accent-primary)" />
              </h1>
              <p className="text-xs text-muted m-0">Publish an update, live gig booking, or casting audition call</p>
            </div>
          </div>

          <Link to="/" className="text-xs text-muted" style={{ textDecoration: 'none' }}>
            Cancel
          </Link>
        </div>

        {/* Post Type Selector Tabs */}
        <div className="glass-panel p-3 mb-4 flex gap-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <button
            type="button"
            onClick={() => setPostType('general')}
            style={{
              flex: 1,
              padding: '0.75rem 0.5rem',
              borderRadius: 'var(--radius-md)',
              border: postType === 'general' ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
              background: postType === 'general' ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
              color: postType === 'general' ? 'white' : 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'all 0.2s'
            }}
          >
            <MessageSquare size={18} color="var(--accent-primary)" />
            <span className="text-xs font-bold">General Update</span>
          </button>

          <button
            type="button"
            onClick={() => setPostType('booking')}
            style={{
              flex: 1,
              padding: '0.75rem 0.5rem',
              borderRadius: 'var(--radius-md)',
              border: postType === 'booking' ? '2px solid var(--accent-secondary)' : '1px solid var(--border-color)',
              background: postType === 'booking' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
              color: postType === 'booking' ? 'white' : 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'all 0.2s'
            }}
          >
            <Briefcase size={18} color="var(--accent-secondary)" />
            <span className="text-xs font-bold">Booking (Gig)</span>
          </button>

          <button
            type="button"
            onClick={() => setPostType('audition')}
            style={{
              flex: 1,
              padding: '0.75rem 0.5rem',
              borderRadius: 'var(--radius-md)',
              border: postType === 'audition' ? '2px solid #10b981' : '1px solid var(--border-color)',
              background: postType === 'audition' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
              color: postType === 'audition' ? 'white' : 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'all 0.2s'
            }}
          >
            <Mic2 size={18} color="#10b981" />
            <span className="text-xs font-bold">Audition Call</span>
          </button>
        </div>

        {/* Main Creation Form */}
        <form onSubmit={handlePublish} className="glass-panel p-5 flex-col gap-4" style={{ display: 'flex' }}>

          {error && (
            <div
              role="alert"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: '#ef4444',
                fontSize: '0.85rem'
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Author Header */}
          <div className="flex items-center gap-3">
            <div
              style={{
                width: '88px',
                height: '88px',
                minWidth: '88px',
                minHeight: '88px',
                borderRadius: '50%',
                overflow: 'hidden',
                flexShrink: 0,
                border: '2px solid var(--accent-primary)'
              }}
            >
              <img
                src={profile?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop'}
                alt="Your Profile"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: '50%' }}
              />
            </div>
            <div>
              <h4 className="text-sm font-bold m-0">{profile?.full_name || 'Your Profile'}</h4>
              <p className="text-xs text-muted m-0">
                Publishing to {postType === 'general' ? 'Feed' : postType === 'booking' ? 'Bookings Feed' : 'Auditions Feed'}
              </p>
            </div>
          </div>

          {/* CONTEXTUAL FIELDS FOR BOOKINGS */}
          {postType === 'booking' && (
            <div className="p-3 rounded-xl flex-col gap-3" style={{ display: 'flex', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <span className="text-xs font-bold" style={{ color: 'var(--accent-secondary)' }}>
                Gig & Performance Details
              </span>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Venue or Stage Name (e.g. The Echo Room)"
                  value={bookingVenue}
                  onChange={(e) => setBookingVenue(e.target.value)}
                  className="w-full text-xs"
                  style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.6rem 0.8rem', color: 'white', outline: 'none' }}
                />
                <input
                  type="text"
                  placeholder="Guaranteed Pay (e.g. $650)"
                  value={bookingPay}
                  onChange={(e) => setBookingPay(e.target.value)}
                  className="w-full text-xs"
                  style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.6rem 0.8rem', color: 'white', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <input
                  type="date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full text-xs"
                  style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.6rem 0.8rem', color: 'white', outline: 'none' }}
                />
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setBookingVisibility(bookingVisibility === 'public' ? 'private' : 'public')}
                    className="btn-secondary w-full flex items-center justify-center gap-1.5"
                    style={{ padding: '0.55rem', fontSize: '0.75rem', borderRadius: '6px' }}
                  >
                    {bookingVisibility === 'public' ? <Globe size={13} color="var(--accent-secondary)" /> : <Lock size={13} color="var(--accent-primary)" />}
                    <span>{bookingVisibility === 'public' ? 'Public Post' : 'Private Direct'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* CONTEXTUAL FIELDS FOR AUDITIONS */}
          {postType === 'audition' && (
            <div className="p-3 rounded-xl flex-col gap-3" style={{ display: 'flex', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <span className="text-xs font-bold" style={{ color: '#10b981' }}>
                Role & Audition Casting Requirements
              </span>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Role Being Cast (e.g. Lead Session Guitarist)"
                  value={auditionRole}
                  onChange={(e) => setAuditionRole(e.target.value)}
                  className="w-full text-xs"
                  style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.6rem 0.8rem', color: 'white', outline: 'none' }}
                />
                <input
                  type="text"
                  placeholder="Production or Band Name"
                  value={auditionProduction}
                  onChange={(e) => setAuditionProduction(e.target.value)}
                  className="w-full text-xs"
                  style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.6rem 0.8rem', color: 'white', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Rate (e.g. $1,800/wk or Union Scale)"
                  value={auditionComp}
                  onChange={(e) => setAuditionComp(e.target.value)}
                  className="w-full text-xs"
                  style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.6rem 0.8rem', color: 'white', outline: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => setAuditionVisibility(auditionVisibility === 'public' ? 'private' : 'public')}
                  className="btn-secondary w-full flex items-center justify-center gap-1.5"
                  style={{ padding: '0.55rem', fontSize: '0.75rem', borderRadius: '6px' }}
                >
                  {auditionVisibility === 'public' ? <Globe size={13} color="#10b981" /> : <Lock size={13} color="var(--accent-primary)" />}
                  <span>{auditionVisibility === 'public' ? 'Open Call (Public)' : 'Private Audition'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Main Description / Textarea */}
          <div className="flex-col gap-1" style={{ display: 'flex' }}>
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-muted">Post Content</label>
              <span className="text-xs text-muted">{content.length}/800</span>
            </div>
            <textarea
              rows={5}
              placeholder={
                postType === 'booking'
                  ? "Describe the performance slot, set length, soundcheck time, and backline requirements..."
                  : postType === 'audition'
                    ? "Describe the material to prepare, sight-reading requirements, audition slot times, and rehearsal schedule..."
                    : "What's happening in your studio or musical journey? Share updates, track milestones, or thoughts..."
              }
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={800}
              className="w-full"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem 1rem',
                color: 'white',
                outline: 'none',
                fontFamily: 'inherit',
                fontSize: '0.925rem',
                resize: 'vertical',
                lineHeight: 1.5
              }}
            />
          </div>

          {/* DRAG AND DROP & DIRECT FILE UPLOAD SECTION */}
          <div className="flex-col gap-2.5" style={{ display: 'flex' }}>
            <label className="text-xs font-bold text-muted flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <UploadCloud size={14} color="var(--accent-primary)" />
                Attach PDF or Media (Up to 60 min)
              </span>
              <span className="text-xs font-normal text-muted">
                PDF • Audio • Video • Photos
              </span>
            </label>

            {/* Hidden native file input for direct file browsing */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  processFile(e.target.files[0]);
                }
              }}
              style={{ display: 'none' }}
              accept="application/pdf,audio/*,video/*,image/*"
            />

            {/* Drag and Drop Zone (shown when no file is actively attached) */}
            {!attachedFile && !mediaUrl ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingOver(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingOver(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingOver(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    processFile(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: isDraggingOver ? '2px dashed var(--accent-primary)' : '2px dashed var(--border-color)',
                  background: isDraggingOver ? 'rgba(139, 92, 246, 0.12)' : 'rgba(255,255,255,0.02)',
                  borderRadius: 'var(--radius-md)',
                  padding: '2rem 1.5rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}
              >
                <div className="flex items-center gap-3">
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }} title="PDF Document">
                    <FileText size={20} />
                  </div>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }} title="Audio Tracks up to 60m">
                    <Music size={20} />
                  </div>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-secondary)' }} title="Video up to 60m">
                    <Film size={20} />
                  </div>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }} title="Images & Artwork">
                    <ImageIcon size={20} />
                  </div>
                </div>

                <div>
                  <h4 className="m-0 font-bold" style={{ fontSize: '0.95rem' }}>
                    {isDraggingOver ? 'Drop file to attach' : 'Drag & drop file here, or click to browse'}
                  </h4>
                  <p className="text-xs text-muted m-0 mt-1">
                    Supports PDFs (sheet music, riders), Audio & Video recordings up to 60 minutes, and photos
                  </p>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="btn-secondary flex items-center gap-1.5"
                  style={{ padding: '0.45rem 1rem', fontSize: '0.8rem', borderRadius: 'var(--radius-full)' }}
                >
                  <UploadCloud size={15} /> Choose from files
                </button>
              </div>
            ) : attachedFile ? (
              /* Attached File Card Preview */
              <div
                className="glass-panel p-3.5 flex-col gap-2"
                style={{
                  display: 'flex',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--accent-primary)',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        background:
                          fileType === 'pdf'
                            ? 'rgba(239, 68, 68, 0.2)'
                            : fileType === 'audio'
                            ? 'rgba(139, 92, 246, 0.2)'
                            : fileType === 'video'
                            ? 'rgba(59, 130, 246, 0.2)'
                            : 'rgba(16, 185, 129, 0.2)',
                        color:
                          fileType === 'pdf'
                            ? '#ef4444'
                            : fileType === 'audio'
                            ? 'var(--accent-primary)'
                            : fileType === 'video'
                            ? 'var(--accent-secondary)'
                            : '#10b981'
                      }}
                    >
                      {fileType === 'pdf' && <FileText size={22} />}
                      {fileType === 'audio' && <Music size={22} />}
                      {fileType === 'video' && <Film size={22} />}
                      {fileType === 'image' && <ImageIcon size={22} />}
                    </div>

                    <div className="overflow-hidden" style={{ textOverflow: 'ellipsis' }}>
                      <p className="text-sm font-bold m-0" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {fileName}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted">
                        <span>{fileSize}</span>
                        {mediaDuration && (
                          <span className="flex items-center gap-1" style={{ color: 'var(--accent-secondary)' }}>
                            <Clock size={11} /> {mediaDuration}
                          </span>
                        )}
                        <span
                          style={{
                            textTransform: 'uppercase',
                            fontSize: '0.65rem',
                            fontWeight: 'bold',
                            padding: '0.1rem 0.4rem',
                            borderRadius: '4px',
                            background: 'rgba(255,255,255,0.08)'
                          }}
                        >
                          {fileType}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={clearAttachedFile}
                    className="text-muted"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.35rem' }}
                    title="Remove attachment"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Specific Live Preview for Audio */}
                {fileType === 'audio' && filePreviewUrl && (
                  <div className="pt-2">
                    <audio controls src={filePreviewUrl} style={{ width: '100%', height: '36px' }} />
                  </div>
                )}

                {/* Specific Live Preview for Video */}
                {fileType === 'video' && filePreviewUrl && (
                  <div className="pt-2" style={{ maxHeight: '240px', overflow: 'hidden', borderRadius: '6px' }}>
                    <video controls src={filePreviewUrl} style={{ width: '100%', maxHeight: '240px', display: 'block' }} />
                  </div>
                )}

                {/* Specific Live Preview for Image */}
                {fileType === 'image' && filePreviewUrl && (
                  <div className="pt-1" style={{ maxHeight: '200px', overflow: 'hidden', borderRadius: '6px' }}>
                    <img src={filePreviewUrl} alt="Preview" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', display: 'block' }} />
                  </div>
                )}
              </div>
            ) : null}

            {fileError && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.6rem 0.8rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: '#ef4444',
                  fontSize: '0.8rem'
                }}
              >
                <AlertCircle size={15} />
                <span>{fileError}</span>
              </div>
            )}

            {/* Secondary Option: Preset Imagery or External URL */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowExternalOptions(!showExternalOptions)}
                className="text-xs text-muted flex items-center gap-1"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <ChevronDown size={13} style={{ transform: showExternalOptions ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
                <span>Or use preset concert imagery or external media link</span>
              </button>

              {showExternalOptions && (
                <div className="mt-2.5 flex-col gap-2 p-3 rounded-lg" style={{ display: 'flex', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}>
                  {/* Presets */}
                  <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                    {PRESET_MEDIA.map((preset, idx) => {
                      const isSelected = mediaUrl === preset.url;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            clearAttachedFile();
                            setMediaUrl(isSelected ? '' : preset.url);
                          }}
                          style={{
                            height: '44px',
                            width: '68px',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            padding: 0,
                            border: isSelected ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                            boxShadow: isSelected ? '0 0 8px var(--accent-primary)' : 'none',
                            cursor: 'pointer',
                            background: 'none'
                          }}
                          title={preset.label}
                        >
                          <img src={preset.url} alt={preset.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </button>
                      );
                    })}
                  </div>

                  {/* External URL Input */}
                  <input
                    type="url"
                    placeholder="Paste external media URL (https://...)"
                    value={mediaUrl}
                    onChange={(e) => {
                      clearAttachedFile();
                      setMediaUrl(e.target.value);
                    }}
                    className="w-full text-xs"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.55rem 0.8rem',
                      color: 'white',
                      outline: 'none'
                    }}
                  />

                  {mediaUrl && (
                    <div style={{ position: 'relative', borderRadius: '6px', overflow: 'hidden', maxHeight: '180px' }}>
                      <img src={mediaUrl} alt="Preset preview" style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', display: 'block' }} />
                      <button
                        type="button"
                        onClick={() => setMediaUrl('')}
                        style={{
                          position: 'absolute',
                          top: '6px',
                          right: '6px',
                          background: 'rgba(0,0,0,0.75)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '50%',
                          padding: '0.3rem',
                          cursor: 'pointer'
                        }}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-between pt-3 border-t" style={{ borderTopColor: 'var(--border-color)' }}>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="btn-secondary"
              style={{ padding: '0.65rem 1.25rem', fontSize: '0.85rem' }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading || !content.trim()}
              className="btn-primary flex items-center gap-2"
              style={{
                padding: '0.65rem 1.75rem',
                fontSize: '0.875rem',
                opacity: loading || !content.trim() ? 0.6 : 1,
                cursor: loading || !content.trim() ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {loading ? 'Publishing M.O...' : 'Publish M.O.'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
