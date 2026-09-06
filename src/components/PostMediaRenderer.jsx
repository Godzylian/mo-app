import { useState, useEffect } from 'react';
import { FileText, Music, ExternalLink } from 'lucide-react';
import { getLocalMedia } from '../lib/mediaStorage';

export default function PostMediaRenderer({ mediaUrl }) {
  const [resolvedUrl, setResolvedUrl] = useState('');
  const [inferredType, setInferredType] = useState('image'); // 'video' | 'audio' | 'pdf' | 'image'
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    let createdBlobUrl = '';

    if (!mediaUrl) {
      setResolvedUrl('');
      return;
    }

    // Handle Local IndexedDB Media (e.g. 'local-media:video:key')
    if (mediaUrl.startsWith('local-media:')) {
      const parts = mediaUrl.replace('local-media:', '').split(':');
      const typeHint = parts.length > 1 ? parts[0] : 'video';
      const key = parts.length > 1 ? parts[1] : parts[0];

      setInferredType(typeHint);
      setLoading(true);

      getLocalMedia(key).then((blob) => {
        if (!active) return;
        if (blob) {
          createdBlobUrl = URL.createObjectURL(blob);
          setResolvedUrl(createdBlobUrl);
        }
        setLoading(false);
      }).catch((err) => {
        console.warn('Error loading local media:', err);
        if (active) setLoading(false);
      });

      return () => {
        active = false;
        if (createdBlobUrl) {
          URL.revokeObjectURL(createdBlobUrl);
        }
      };
    }

    // Regular HTTP / HTTPS / Data URL
    setResolvedUrl(mediaUrl);

    // Infer Type from URL or extension
    const lower = mediaUrl.toLowerCase();
    if (lower.startsWith('data:application/pdf') || lower.endsWith('.pdf') || lower.includes('.pdf?')) {
      setInferredType('pdf');
    } else if (lower.startsWith('data:audio') || /\.(mp3|wav|m4a|ogg|aac|flac)($|\?)/i.test(lower)) {
      setInferredType('audio');
    } else if (lower.startsWith('data:video') || /\.(mp4|mov|webm|m4v|mkv)($|\?)/i.test(lower)) {
      setInferredType('video');
    } else {
      setInferredType('image');
    }

    return () => {
      active = false;
    };
  }, [mediaUrl]);

  if (!mediaUrl) return null;

  if (loading) {
    return (
      <div className="p-3 text-xs text-muted flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
        Loading media attachment...
      </div>
    );
  }

  if (!resolvedUrl) {
    return null;
  }

  return (
    <div
      className="mt-2.5 rounded-lg overflow-hidden"
      style={{
        borderRadius: '8px',
        background: 'rgba(0,0,0,0.25)',
        border: '1px solid var(--border-color)'
      }}
    >
      {/* 1. PDF Document */}
      {inferredType === 'pdf' ? (
        <div className="p-3.5 flex items-center justify-between gap-3" style={{ background: 'rgba(239, 68, 68, 0.06)' }}>
          <div className="flex items-center gap-3">
            <div style={{ width: '42px', height: '42px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', flexShrink: 0 }}>
              <FileText size={22} />
            </div>
            <div>
              <p className="text-sm font-bold m-0" style={{ color: 'var(--text-primary)' }}>Attached PDF Document</p>
              <p className="text-xs text-muted m-0">Lead sheet, performance rider, or audition contract</p>
            </div>
          </div>
          <a
            href={resolvedUrl}
            target="_blank"
            rel="noopener noreferrer"
            download="document.pdf"
            className="btn-secondary flex items-center gap-1.5 text-xs"
            style={{ padding: '0.45rem 0.85rem', textDecoration: 'none', borderRadius: '6px' }}
          >
            <ExternalLink size={13} /> View / Download
          </a>
        </div>
      ) : inferredType === 'audio' ? (
        /* 2. Audio Player (Tracks up to 60m) */
        <div className="p-3.5 flex-col gap-2" style={{ display: 'flex', background: 'rgba(139, 92, 246, 0.06)' }}>
          <div className="flex items-center gap-2 text-xs font-bold" style={{ color: 'var(--accent-primary)' }}>
            <Music size={15} /> Audio Recording (Up to 60 min)
          </div>
          <audio controls src={resolvedUrl} style={{ width: '100%', height: '40px' }} />
        </div>
      ) : inferredType === 'video' ? (
        /* 3. Video Player (Footage up to 60m) */
        <div style={{ maxHeight: '380px', overflow: 'hidden', background: '#000', display: 'flex', justifyContent: 'center' }}>
          <video
            controls
            playsInline
            preload="metadata"
            src={resolvedUrl}
            style={{ width: '100%', maxHeight: '380px', display: 'block', objectFit: 'contain' }}
          />
        </div>
      ) : (
        /* 4. Standard Image */
        <img
          src={resolvedUrl}
          alt="Post media"
          style={{ width: '100%', maxHeight: '320px', objectFit: 'cover', display: 'block' }}
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      )}
    </div>
  );
}
