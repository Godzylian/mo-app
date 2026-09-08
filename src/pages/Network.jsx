import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Users, ArrowLeft, MessageSquare, Circle, Check, X,
  Sparkles, Music, MapPin, Send, MoreVertical, SlidersHorizontal,
  BellRing, UserPlus, PhoneCall, Radio, CheckCheck, Calendar, Mic2, Briefcase,
  Clock, ShieldCheck, Paperclip, FileText, Download, Image as ImageIcon, File
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePresence } from '../contexts/PresenceContext';
import { supabase } from '../lib/supabase';

// Helper to format file sizes nicely (e.g. 1.5 MB)
function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Helper to format contact list preview snippets (handling photos, audio, files)
function formatMessageSnippet(msg, isSenderMe = false) {
  if (!msg) return 'Connected on M.O. Click to message.';
  const prefix = isSenderMe ? 'You: ' : '';
  if (msg.media_type === 'image') {
    return `${prefix}📷 Photo${msg.content ? ` - ${msg.content}` : ''}`;
  }
  if (msg.media_type === 'audio') {
    return `${prefix}🎵 ${msg.file_name || 'Audio file'}`;
  }
  if (msg.media_type === 'file' || msg.media_type === 'document') {
    return `${prefix}📎 ${msg.file_name || 'Attachment'}`;
  }
  return `${prefix}${msg.content || 'Sent an attachment'}`;
}

// Helper to process media files into Data URLs with image compression for instant delivery
function processMediaToDataUrl(file, mediaType) {
  return new Promise((resolve) => {
    if (!file) return resolve(null);
    if (mediaType === 'image') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          const MAX_DIM = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_DIM) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            }
          } else {
            if (height > MAX_DIM) {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        };
        img.onerror = () => resolve(e.target.result);
        img.src = e.target.result;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    }
  });
}

// Helper to format relative/friendly timestamp for contact list snippets
function formatMessageTimestamp(dateString) {
  if (!dateString) return 'Active recently';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

// Helper to format exact time for chat drawer message bubbles
function formatBubbleTime(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

// Initial mock data simulating connected music industry contacts
const INITIAL_CONTACTS = [
  {
    id: 'contact-1',
    name: 'Marcus Bell',
    handle: '@marcusbeats',
    role: 'Multi-Platinum Producer',
    location: 'Atlanta, GA',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop',
    isOnline: true,
    lastSeen: 'Active now',
    recentMessage: 'Sent you the new drum stems for the bridge 🔥',
    recentMessageTime: '4m',
    isUnread: true,
    unreadCount: 1,
    isSenderMe: false
  },
  {
    id: 'contact-2',
    name: 'Elena Rostova',
    handle: '@elena_strings',
    role: 'Session Cellist & Arranger',
    location: 'Los Angeles, CA',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=200&auto=format&fit=crop',
    isOnline: true,
    lastSeen: 'Active now',
    recentMessage: 'Scores are locked in for the recording session on Tuesday.',
    recentMessageTime: '22m',
    isUnread: false,
    unreadCount: 0,
    isSenderMe: false
  },
  {
    id: 'contact-3',
    name: 'David K.',
    handle: '@theechoroom',
    role: 'Venue Booking Manager',
    location: 'Austin, TX',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop',
    isOnline: false,
    lastSeen: 'Active 2h ago',
    recentMessage: 'You: Sounds great, pencil us in for the 9:00 PM slot.',
    recentMessageTime: '2h',
    isUnread: false,
    unreadCount: 0,
    isSenderMe: true
  },
  {
    id: 'contact-4',
    name: 'Chloe Vance',
    handle: '@chloevance_audio',
    role: 'Mastering Engineer (Dolby Atmos)',
    location: 'Nashville, TN',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=200&auto=format&fit=crop',
    isOnline: true,
    lastSeen: 'Active now',
    recentMessage: 'Check your email, just exported Master v3 at -14 LUFS 🎧',
    recentMessageTime: '5h',
    isUnread: true,
    unreadCount: 2,
    isSenderMe: false
  },
  {
    id: 'contact-5',
    name: 'Julian Thorne',
    handle: '@jthorn_bass',
    role: 'Touring Bassist',
    location: 'New York, NY',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop',
    isOnline: false,
    lastSeen: 'Active yesterday',
    recentMessage: 'You: Send me the setlist when you get a chance!',
    recentMessageTime: '1d',
    isUnread: false,
    unreadCount: 0,
    isSenderMe: true
  },
  {
    id: 'contact-6',
    name: 'Maya Lin',
    handle: '@mayalin_synths',
    role: 'Film & Game Composer',
    location: 'Seattle, WA',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=200&auto=format&fit=crop',
    isOnline: false,
    lastSeen: 'Active 3d ago',
    recentMessage: 'Would love to collab on the ambient synth textures.',
    recentMessageTime: '3d',
    isUnread: false,
    unreadCount: 0,
    isSenderMe: false
  },
  {
    id: 'contact-7',
    name: 'Vibe Records A&R',
    handle: '@viberecords',
    role: 'Independent Record Label',
    location: 'London, UK',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200&auto=format&fit=crop',
    isOnline: true,
    lastSeen: 'Active now',
    recentMessage: 'We listened to your demo tape. Are you free to chat tomorrow?',
    recentMessageTime: '4d',
    isUnread: false,
    unreadCount: 0,
    isSenderMe: false
  }
];

// Initial mock connection requests
const INITIAL_REQUESTS = [
  {
    id: 'req-1',
    name: 'Soren Lindqvist',
    handle: '@soren_audio',
    role: 'Synthesizer Designer & Sound Architect',
    location: 'Berlin, DE',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=200&auto=format&fit=crop',
    mutualCount: 7
  },
  {
    id: 'req-2',
    name: 'Amara Johnson',
    handle: '@amaraj_vox',
    role: 'R&B / Soul Topliner & Vocalist',
    location: 'Chicago, IL',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop',
    mutualCount: 12
  },
  {
    id: 'req-3',
    name: 'Lucas Ferreira',
    handle: '@lucas_drums',
    role: 'Session Drummer & Percussionist',
    location: 'Miami, FL',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=200&auto=format&fit=crop',
    mutualCount: 4
  }
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

-- 6. Ensure either user can remove their connection
DROP POLICY IF EXISTS "Users can remove connections" ON public.connections;
CREATE POLICY "Users can remove connections"
  ON public.connections FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = connected_user_id);

-- 7. Direct Messages Table & Realtime
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT DEFAULT '',
  media_url TEXT,
  media_type TEXT,
  file_name TEXT,
  file_size INTEGER,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS media_url TEXT,
  ADD COLUMN IF NOT EXISTS media_type TEXT,
  ADD COLUMN IF NOT EXISTS file_name TEXT,
  ADD COLUMN IF NOT EXISTS file_size INTEGER;

DO $$
BEGIN
  ALTER TABLE public.messages ALTER COLUMN content DROP NOT NULL;
  ALTER TABLE public.messages ALTER COLUMN content SET DEFAULT '';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(sender_id, receiver_id, created_at);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own sent or received messages" ON public.messages;
CREATE POLICY "Users can view their own sent or received messages"
  ON public.messages FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can insert their own messages" ON public.messages;
CREATE POLICY "Users can insert their own messages"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Receivers can update message status" ON public.messages;
CREATE POLICY "Receivers can update message status"
  ON public.messages FOR UPDATE TO authenticated
  USING (auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can delete their messages" ON public.messages;
CREATE POLICY "Users can delete their messages"
  ON public.messages FOR DELETE TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

ALTER TABLE public.messages REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
`;

export default function NetworkPage() {
  const { user, profile, updateConnectionsCount, updateProfile } = useAuth();
  const { onlineUserIds, isUserOnline, myPresence, setMyPresence } = usePresence();

  const [realContacts, setRealContacts] = useState([]);
  const [contacts, setContacts] = useState(INITIAL_CONTACTS);
  const [requests, setRequests] = useState(INITIAL_REQUESTS);
  const [followingUserIds, setFollowingUserIds] = useState(new Set());
  const [sentRequestUserIds, setSentRequestUserIds] = useState(new Set());
  const [busyUserIds, setBusyUserIds] = useState(new Set());
  const [isRequireRequestsOn, setIsRequireRequestsOn] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'online' | 'unread' | 'requests'

  // SQL Migration modal state
  const [showSqlGuide, setShowSqlGuide] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const handleCopySql = () => {
    navigator.clipboard.writeText(CONNECTION_REQUESTS_SQL);
    setCopiedSql(true);
    triggerToast('✓ SQL copied to clipboard! Paste it into Supabase SQL Editor.');
    setTimeout(() => setCopiedSql(false), 3000);
  };

  // Direct message modal & real-time thread state
  const [activeChatContact, setActiveChatContact] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [newMessageText, setNewMessageText] = useState('');
  const [attachedMedia, setAttachedMedia] = useState(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [previewImageModal, setPreviewImageModal] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const messagesEndRef = useRef(null);
  const activeChatContactRef = useRef(null);
  const fileInputRef = useRef(null);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let mediaType = 'file';
    if (file.type.startsWith('image/')) {
      mediaType = 'image';
    } else if (file.type.startsWith('audio/') || /\.(mp3|wav|m4a|flac|aac|ogg)$/i.test(file.name)) {
      mediaType = 'audio';
    } else if (file.type.startsWith('video/') || /\.(mp4|mov|webm)$/i.test(file.name)) {
      mediaType = 'video';
    }

    const previewUrl = URL.createObjectURL(file);
    setAttachedMedia({
      file,
      previewUrl,
      mediaType,
      fileName: file.name,
      fileSize: file.size
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Sync privacy mode from profile
  useEffect(() => {
    if (profile) {
      setIsRequireRequestsOn(Boolean(profile.require_connection_request));
    }
  }, [profile?.require_connection_request]);

  // Toggle user's own "Require Connection Requests" privacy setting directly from Network
  const handleToggleRequireRequests = async () => {
    const nextVal = !isRequireRequestsOn;
    setIsRequireRequestsOn(nextVal);
    if (updateProfile) {
      const { error, missingColumns } = await updateProfile({ require_connection_request: nextVal });
      if (missingColumns && missingColumns.includes('require_connection_request')) {
        setShowSqlGuide(true);
        triggerToast('⚠️ Database column missing in Supabase: Please run the SQL migration.');
        setIsRequireRequestsOn(!nextVal);
        return;
      }
      if (!error) {
        triggerToast(
          nextVal
            ? 'Connection Requests enabled! Other users now need your approval to connect.'
            : 'Open Network enabled! Other users can now connect directly without approval.'
        );
      } else {
        triggerToast('Setting updated locally.');
      }
    }
  };

  // Fetch following list (bidirectional: both initiated and received connections)
  const fetchFollowing = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('connections')
        .select('user_id, connected_user_id')
        .or(`user_id.eq.${user.id},connected_user_id.eq.${user.id}`);

      if (!error && data) {
        const partnerIds = new Set();
        data.forEach(item => {
          if (item.user_id === user.id && item.connected_user_id) {
            partnerIds.add(item.connected_user_id);
          } else if (item.connected_user_id === user.id && item.user_id) {
            partnerIds.add(item.user_id);
          }
        });
        setFollowingUserIds(partnerIds);
      }
    } catch (_) { }
  }, [user?.id]);

  // Fetch incoming & outgoing connection requests from Supabase
  const fetchRequests = useCallback(async () => {
    if (!user?.id) return;
    try {
      // 1. Fetch incoming requests directed to current user
      const { data: inData, error: inErr } = await supabase
        .from('connection_requests')
        .select(`
          id,
          sender_id,
          status,
          created_at,
          sender:sender_id (
            id,
            full_name,
            role,
            avatar_url,
            location
          )
        `)
        .eq('receiver_id', user.id)
        .eq('status', 'pending');

      if (inErr) {
        if (inErr.code === '42P01' || inErr.code === 'PGRST205' || inErr.message?.includes('connection_requests')) {
          setShowSqlGuide(true);
        }
      }

      let rawRequests = [];
      if (!inErr && inData) {
        rawRequests = inData;
      } else if (inErr && inErr.code !== '42P01' && inErr.code !== 'PGRST205') {
        // Fallback: fetch without nested join in case relationship is not configured
        const { data: fallbackData } = await supabase
          .from('connection_requests')
          .select('id, sender_id, status, created_at')
          .eq('receiver_id', user.id)
          .eq('status', 'pending');

        if (fallbackData && fallbackData.length > 0) {
          const senderIds = fallbackData.map(r => r.sender_id);
          const { data: profileList } = await supabase
            .from('profiles')
            .select('id, full_name, role, avatar_url, location')
            .in('id', senderIds);

          const profileMap = new Map((profileList || []).map(p => [p.id, p]));
          rawRequests = fallbackData.map(r => ({
            ...r,
            sender: profileMap.get(r.sender_id) || {}
          }));
        }
      }

      if (rawRequests.length > 0) {
        const mappedRealRequests = rawRequests.map(req => {
          const s = req.sender || {};
          const cleanHandle = s.full_name
            ? `@${s.full_name.toLowerCase().replace(/[^a-z0-9]/g, '')}`
            : '@musician';
          return {
            id: req.id,
            isReal: true,
            sender_id: req.sender_id,
            name: s.full_name || 'Musician',
            handle: cleanHandle,
            role: s.role || 'Community Musician',
            location: s.location || 'Network Member',
            avatar: s.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop',
            mutualCount: 1
          };
        });

        setRequests(prev => {
          const mockOnly = prev.filter(r => !r.isReal);
          return [...mappedRealRequests, ...mockOnly];
        });
      }

      // 2. Fetch outgoing pending requests sent by current user
      const { data: outData, error: outErr } = await supabase
        .from('connection_requests')
        .select('receiver_id')
        .eq('sender_id', user.id)
        .eq('status', 'pending');

      if (!outErr && outData) {
        setSentRequestUserIds(new Set(outData.map(r => r.receiver_id)));
      }
    } catch (err) {
      console.warn('Could not fetch connection requests:', err);
    }
  }, [user?.id]);

  // Keep ref synchronized with activeChatContact to avoid stale closures in realtime handlers
  useEffect(() => {
    activeChatContactRef.current = activeChatContact;
  }, [activeChatContact]);

  // Fetch real registered profiles from Supabase with their latest direct messages
  const fetchProfiles = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        // Exclude currently logged-in user from the contact list
        const others = data.filter(p => p.id !== user?.id);

        // Fetch recent messages for contacts if user is authenticated
        const lastMsgByUserId = new Map();
        const unreadCounts = new Map();

        if (user?.id) {
          try {
            const { data: recentMsgs, error: mErr } = await supabase
              .from('messages')
              .select('id, sender_id, receiver_id, content, media_url, media_type, file_name, file_size, is_read, created_at')
              .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
              .order('created_at', { ascending: false });

            if (!mErr && recentMsgs) {
              for (const m of recentMsgs) {
                const partnerId = m.sender_id === user.id ? m.receiver_id : m.sender_id;
                if (!lastMsgByUserId.has(partnerId)) {
                  lastMsgByUserId.set(partnerId, m);
                }
                if (m.receiver_id === user.id && !m.is_read) {
                  unreadCounts.set(partnerId, (unreadCounts.get(partnerId) || 0) + 1);
                }
              }
            } else if (mErr && (mErr.code === '42P01' || mErr.code === 'PGRST205' || mErr.message?.includes('messages'))) {
              // Messages table not yet migrated, handled gracefully
            }
          } catch (mCatch) {
            console.warn('Could not query recent messages:', mCatch);
          }
        }

        const mapped = others.map(p => {
          const cleanHandle = p.full_name
            ? `@${p.full_name.toLowerCase().replace(/[^a-z0-9]/g, '')}`
            : '@musician';

          const lastMsg = lastMsgByUserId.get(p.id);
          const unread = unreadCounts.get(p.id) || 0;
          const isSenderMe = lastMsg ? lastMsg.sender_id === user?.id : false;

          return {
            id: p.id,
            name: p.full_name || 'Member',
            handle: cleanHandle,
            role: p.role || 'Musician',
            location: p.location || 'Community Member',
            avatar: p.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop',
            recentMessage: formatMessageSnippet(lastMsg, isSenderMe),
            recentMessageTime: lastMsg ? formatMessageTimestamp(lastMsg.created_at) : 'Active recently',
            isUnread: unread > 0,
            unreadCount: unread,
            isSenderMe,
            isReal: true,
            require_connection_request: Boolean(p.require_connection_request)
          };
        });
        setRealContacts(mapped);
      }
    } catch (err) {
      console.error('Error fetching registered network contacts:', err);
    }
  }, [user?.id]);

  // Fetch conversation messages whenever activeChatContact is opened or changed
  useEffect(() => {
    if (!activeChatContact) {
      setChatMessages([]);
      return;
    }

    if (activeChatContact.isReal && user?.id) {
      let isSubscribed = true;
      setIsChatLoading(true);

      const loadChatHistory = async () => {
        try {
          const { data, error } = await supabase
            .from('messages')
            .select('*')
            .or(`and(sender_id.eq.${user.id},receiver_id.eq.${activeChatContact.id}),and(sender_id.eq.${activeChatContact.id},receiver_id.eq.${user.id})`)
            .order('created_at', { ascending: true });

          if (error) {
            if (error.code === '42P01' || error.code === 'PGRST205' || error.message?.includes('schema cache') || error.message?.includes('messages')) {
              setShowSqlGuide(true);
            }
            console.warn('Could not load chat history:', error.message);
          } else if (isSubscribed && data) {
            setChatMessages(data);

            // Mark any unread messages from this contact as read
            const unreadIds = data
              .filter(m => m.receiver_id === user.id && !m.is_read)
              .map(m => m.id);

            if (unreadIds.length > 0) {
              await supabase
                .from('messages')
                .update({ is_read: true })
                .in('id', unreadIds);

              setRealContacts(prev => prev.map(c => 
                c.id === activeChatContact.id ? { ...c, isUnread: false, unreadCount: 0 } : c
              ));
            }
          }
        } catch (err) {
          console.warn('Error loading chat:', err);
        } finally {
          if (isSubscribed) setIsChatLoading(false);
        }
      };

      loadChatHistory();

      return () => {
        isSubscribed = false;
      };
    } else if (!activeChatContact.isReal) {
      // Initialize mock conversation for demonstration contacts
      setChatMessages([
        {
          id: `mock-${activeChatContact.id}`,
          sender_id: activeChatContact.id,
          receiver_id: user?.id || 'me',
          content: activeChatContact.recentMessage.replace(/^You:\s*/, ''),
          created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
          is_read: true
        }
      ]);
      setIsChatLoading(false);
    }
  }, [activeChatContact, user?.id]);

  // Smooth scroll to bottom when new messages arrive
  useEffect(() => {
    if (activeChatContact && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeChatContact]);

  useEffect(() => {
    fetchProfiles();
    fetchFollowing();
    fetchRequests();

    // Listen for realtime updates to profiles, connection_requests, connections, and messages
    const sub = supabase
      .channel('network_realtime_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchProfiles();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connection_requests' }, () => {
        fetchRequests();
        fetchFollowing();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connections' }, () => {
        fetchFollowing();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
        const newMsg = payload.new;
        if (!newMsg || !user) return;

        // Is this message sent to or from the current user?
        const isRelated = newMsg.sender_id === user.id || newMsg.receiver_id === user.id;
        if (!isRelated) return;

        const currentContact = activeChatContactRef.current;

        // Case A: Incoming message sent to me
        if (newMsg.receiver_id === user.id) {
          const isCurrentChatOpen = currentContact && currentContact.id === newMsg.sender_id;

          if (isCurrentChatOpen) {
            // Append directly to current chat window
            setChatMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });

            // Auto-mark as read in Supabase
            await supabase.from('messages').update({ is_read: true }).eq('id', newMsg.id);
          } else {
            // Chat drawer is closed or chatting with another user - show toast notification
            setRealContacts(prev => {
              const sender = prev.find(c => c.id === newMsg.sender_id);
              const senderName = sender ? sender.name : 'A contact';
              const snippet = formatMessageSnippet(newMsg, false);
              triggerToast(`💬 ${senderName}: ${snippet}`);
              return prev;
            });
          }

          // Update contact card snippet & unread count
          setRealContacts(prev => prev.map(c => {
            if (c.id === newMsg.sender_id) {
              const isChatOpen = currentContact && currentContact.id === newMsg.sender_id;
              return {
                ...c,
                recentMessage: formatMessageSnippet(newMsg, false),
                recentMessageTime: 'Just now',
                isUnread: !isChatOpen,
                unreadCount: isChatOpen ? 0 : (c.unreadCount || 0) + 1,
                isSenderMe: false
              };
            }
            return c;
          }));
        } else if (newMsg.sender_id === user.id) {
          // Case B: Sent by me (from another tab or device)
          if (currentContact && currentContact.id === newMsg.receiver_id) {
            setChatMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
          }

          setRealContacts(prev => prev.map(c => {
            if (c.id === newMsg.receiver_id) {
              return {
                ...c,
                recentMessage: formatMessageSnippet(newMsg, true),
                recentMessageTime: 'Just now',
                isSenderMe: true
              };
            }
            return c;
          }));
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
        const updatedMsg = payload.new;
        if (!updatedMsg) return;
        setChatMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [fetchProfiles, fetchFollowing, fetchRequests, user]);

  // Handle Following / Connecting with another Musician from Network
  const handleToggleFollow = async (e, targetUserId, targetUserName = 'Musician', targetContact = null) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!user) {
      triggerToast('Please sign in to connect');
      return;
    }
    if (targetUserId === user.id) return;
    if (busyUserIds.has(targetUserId)) return; // Prevent spam clicking

    setBusyUserIds(prev => new Set(prev).add(targetUserId));

    try {
      // A. If already following/connected, toggle to unfollow/disconnect
      if (followingUserIds.has(targetUserId)) {
        setFollowingUserIds(prev => {
          const next = new Set(prev);
          next.delete(targetUserId);
          return next;
        });
        if (updateConnectionsCount) updateConnectionsCount(-1);
        triggerToast(`Disconnected from ${targetUserName}`);

        try {
          await supabase
            .from('connections')
            .delete()
            .or(`and(user_id.eq.${user.id},connected_user_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},connected_user_id.eq.${user.id})`);

          // Recalculate exact count for current user
          const { data: myData } = await supabase
            .from('connections')
            .select('user_id, connected_user_id')
            .or(`user_id.eq.${user.id},connected_user_id.eq.${user.id}`);
          const myRealCount = myData ? new Set(myData.map(r => r.user_id === user.id ? r.connected_user_id : r.user_id)).size : 0;

          setProfile(prev => prev ? { ...prev, connections_count: myRealCount } : prev);
          await supabase.from('profiles').update({ connections_count: myRealCount }).eq('id', user.id);

          // Recalculate exact count for target user
          const { data: targetData } = await supabase
            .from('connections')
            .select('user_id, connected_user_id')
            .or(`user_id.eq.${targetUserId},connected_user_id.eq.${targetUserId}`);
          const targetRealCount = targetData ? new Set(targetData.map(r => r.user_id === targetUserId ? r.connected_user_id : r.user_id)).size : 0;

          await supabase.from('profiles').update({ connections_count: targetRealCount }).eq('id', targetUserId);
        } catch (err) {
          console.warn('Could not disconnect:', err);
          setFollowingUserIds(prev => new Set(prev).add(targetUserId));
          if (updateConnectionsCount) updateConnectionsCount(1);
        }
        return;
      }

      // B. If user already sent a pending request, clicking cancels the request
      if (sentRequestUserIds.has(targetUserId)) {
        setSentRequestUserIds(prev => {
          const next = new Set(prev);
          next.delete(targetUserId);
          return next;
        });
        triggerToast(`Connection request to ${targetUserName} cancelled.`);
        try {
          await supabase
            .from('connection_requests')
            .delete()
            .eq('sender_id', user.id)
            .eq('receiver_id', targetUserId);
        } catch (err) {
          console.warn('Could not cancel connection request:', err);
          setSentRequestUserIds(prev => new Set(prev).add(targetUserId));
        }
        return;
      }

      // C. Not connected and no pending request: check target user's privacy setting
      let requiresApproval = targetContact?.require_connection_request;
      if (requiresApproval === undefined) {
        try {
          const { data: p, error: pErr } = await supabase
            .from('profiles')
            .select('require_connection_request')
            .eq('id', targetUserId)
            .maybeSingle();

          if (pErr) {
            if (pErr.code === '42703' || pErr.message?.includes('does not exist')) {
              setShowSqlGuide(true);
              triggerToast('⚠️ Database Setup Required: Run SQL in Supabase to enable connection requests');
              return;
            }
          }
          requiresApproval = Boolean(p?.require_connection_request);
        } catch (_) {
          requiresApproval = false;
        }
      }

      if (requiresApproval) {
        // 1. Target user REQUIRES approval: send a connection request!
        setSentRequestUserIds(prev => new Set(prev).add(targetUserId));
        triggerToast(`Connection request sent to ${targetUserName}! They will review your request in My Network.`);

        try {
          const { error } = await supabase
            .from('connection_requests')
            .insert([{ sender_id: user.id, receiver_id: targetUserId, status: 'pending' }]);
          if (error) throw error;
        } catch (err) {
          console.warn('Could not send connection request:', err);
          setSentRequestUserIds(prev => {
            const next = new Set(prev);
            next.delete(targetUserId);
            return next;
          });
          if (err?.code === '42P01' || err?.message?.includes('schema cache')) {
            triggerToast('⚠️ Run the updated SQL in Supabase to enable connection requests');
          } else {
            triggerToast('Could not send request. Please try again.');
          }
        }
        return;
      }

      // 2. Target user does NOT require approval: direct instant connect!
      setFollowingUserIds(prev => new Set(prev).add(targetUserId));
      if (updateConnectionsCount) updateConnectionsCount(1);
      triggerToast(`Connected! You are now following ${targetUserName} 🎉`);

      try {
        const { error } = await supabase
          .from('connections')
          .upsert([{ user_id: user.id, connected_user_id: targetUserId }], { onConflict: 'user_id,connected_user_id' });
        if (error) throw error;

        // Recalculate exact count for current user
        const { data: myData } = await supabase
          .from('connections')
          .select('user_id, connected_user_id')
          .or(`user_id.eq.${user.id},connected_user_id.eq.${user.id}`);
        const myRealCount = myData ? new Set(myData.map(r => r.user_id === user.id ? r.connected_user_id : r.user_id)).size : 0;

        setProfile(prev => prev ? { ...prev, connections_count: myRealCount } : prev);
        await supabase.from('profiles').update({ connections_count: myRealCount }).eq('id', user.id);

        // Recalculate exact count for target user
        const { data: targetData } = await supabase
          .from('connections')
          .select('user_id, connected_user_id')
          .or(`user_id.eq.${targetUserId},connected_user_id.eq.${targetUserId}`);
        const targetRealCount = targetData ? new Set(targetData.map(r => r.user_id === targetUserId ? r.connected_user_id : r.user_id)).size : 0;

        await supabase.from('profiles').update({ connections_count: targetRealCount }).eq('id', targetUserId);
      } catch (err) {
        console.warn('Could not connect:', err);
        setFollowingUserIds(prev => {
          const next = new Set(prev);
          next.delete(targetUserId);
          return next;
        });
        if (updateConnectionsCount) updateConnectionsCount(-1);
      }
    } finally {
      setBusyUserIds(prev => {
        const next = new Set(prev);
        next.delete(targetUserId);
        return next;
      });
    }
  };

  // Determine if a contact is online (Real users check Realtime Presence; Mock users check isOnline)
  const isContactOnline = useCallback((contact) => {
    if (!contact) return false;
    if (contact.isReal) {
      return isUserOnline(contact.id);
    }
    return Boolean(contact.isOnline);
  }, [isUserOnline]);

  // Combine real registered users at the top with sample contacts
  const allContacts = useMemo(() => {
    return [...realContacts, ...contacts];
  }, [realContacts, contacts]);

  // Known Contacts ONLY includes accounts that are actively followed / connected
  const knownContacts = useMemo(() => {
    return allContacts.filter(c => followingUserIds.has(c.id));
  }, [allContacts, followingUserIds]);

  // Unfollowed accounts are separated into Suggested Connections
  const suggestedContacts = useMemo(() => {
    return allContacts.filter(c => !followingUserIds.has(c.id));
  }, [allContacts, followingUserIds]);

  // Filter known contacts by search query & tab
  const filteredContacts = useMemo(() => {
    return knownContacts.filter((contact) => {
      const matchesSearch =
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.handle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.recentMessage.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.location.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (filterTab === 'online') return isContactOnline(contact);
      if (filterTab === 'unread') return contact.isUnread;

      return true;
    });
  }, [knownContacts, searchQuery, filterTab, isContactOnline]);

  // Filter suggested unfollowed accounts by search query
  const filteredSuggested = useMemo(() => {
    if (!searchQuery.trim()) return suggestedContacts;
    const q = searchQuery.toLowerCase();
    return suggestedContacts.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.role.toLowerCase().includes(q) ||
      c.handle.toLowerCase().includes(q) ||
      c.location.toLowerCase().includes(q)
    );
  }, [suggestedContacts, searchQuery]);

  const onlineCount = useMemo(() => {
    return knownContacts.filter(c => isContactOnline(c)).length;
  }, [knownContacts, isContactOnline]);

  const unreadCount = useMemo(() => knownContacts.filter(c => c.isUnread).length, [knownContacts]);

  // Handle Accept Connection Request
  const handleAcceptRequest = async (req) => {
    setRequests(prev => prev.filter(r => r.id !== req.id));

    if (req.isReal) {
      const senderId = req.sender_id;
      setFollowingUserIds(prev => new Set(prev).add(senderId));
      if (updateConnectionsCount) updateConnectionsCount(1);

      try {
        // Insert connection safely
        await supabase
          .from('connections')
          .upsert([{ user_id: user.id, connected_user_id: senderId }], { onConflict: 'user_id,connected_user_id' });

        // Delete from connection_requests
        await supabase
          .from('connection_requests')
          .delete()
          .eq('id', req.id);

        // Recalculate exact count for current user
        const { data: myData } = await supabase
          .from('connections')
          .select('user_id, connected_user_id')
          .or(`user_id.eq.${user.id},connected_user_id.eq.${user.id}`);
        const myRealCount = myData ? new Set(myData.map(r => r.user_id === user.id ? r.connected_user_id : r.user_id)).size : 0;

        setProfile(prev => prev ? { ...prev, connections_count: myRealCount } : prev);
        await supabase.from('profiles').update({ connections_count: myRealCount }).eq('id', user.id);

        // Recalculate exact count for sender user
        const { data: senderData } = await supabase
          .from('connections')
          .select('user_id, connected_user_id')
          .or(`user_id.eq.${senderId},connected_user_id.eq.${senderId}`);
        const senderRealCount = senderData ? new Set(senderData.map(r => r.user_id === senderId ? r.connected_user_id : r.user_id)).size : 0;

        await supabase.from('profiles').update({ connections_count: senderRealCount }).eq('id', senderId);
      } catch (err) {
        console.warn('Could not persist accepted connection:', err);
      }
    }

    // Convert request to a new contact
    const newContact = {
      id: req.isReal ? req.sender_id : `contact-${Date.now()}`,
      name: req.name,
      handle: req.handle,
      role: req.role,
      location: req.location,
      avatar: req.avatar,
      isOnline: true,
      lastSeen: 'Active now',
      recentMessage: `Connected with you! Say hi to ${req.name.split(' ')[0]}.`,
      recentMessageTime: 'Just now',
      isUnread: true,
      unreadCount: 1,
      isSenderMe: false,
      isReal: Boolean(req.isReal)
    };

    setContacts(prev => [newContact, ...prev]);
    triggerToast(`Connected with ${req.name}! Added to your network.`);
  };

  // Handle Decline Connection Request
  const handleDeclineRequest = async (reqId) => {
    const target = requests.find(r => r.id === reqId);
    setRequests(prev => prev.filter(r => r.id !== reqId));

    if (target?.isReal) {
      try {
        await supabase
          .from('connection_requests')
          .delete()
          .eq('id', reqId);
      } catch (err) {
        console.warn('Could not dismiss request from DB:', err);
      }
    }
    triggerToast('Connection request dismissed.');
  };

  // Toggle online status for a mock contact or inform status for real user
  const toggleContactOnline = (e, contact) => {
    e.stopPropagation();
    if (contact.isReal) {
      const onlineNow = isUserOnline(contact.id);
      triggerToast(
        `${contact.name} is currently ${onlineNow ? 'Online' : 'Offline'} via active browser session.`
      );
      return;
    }

    setContacts(prev => prev.map(c => {
      if (c.id === contact.id) {
        const nextStatus = !c.isOnline;
        return {
          ...c,
          isOnline: nextStatus,
          lastSeen: nextStatus ? 'Active now' : 'Active 1m ago'
        };
      }
      return c;
    }));
  };

  // Send a direct message (with optional media attachment) in the chat drawer
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessageText.trim() && !attachedMedia) || !activeChatContact) return;

    const text = newMessageText.trim();
    const mediaToSend = attachedMedia;

    // Reset input fields immediately so user can continue chatting
    setNewMessageText('');
    setAttachedMedia(null);

    let mediaUrl = null;
    let mediaType = null;
    let fileName = null;
    let fileSize = null;

    if (mediaToSend) {
      mediaType = mediaToSend.mediaType;
      fileName = mediaToSend.fileName;
      fileSize = mediaToSend.fileSize;
      setIsUploadingMedia(true);

      try {
        // 1. Try uploading to Supabase Storage 'chat-media'
        const fileExt = fileName.split('.').pop() || 'bin';
        const filePath = `${user?.id || 'guest'}/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

        try {
          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from('chat-media')
            .upload(filePath, mediaToSend.file, { cacheControl: '3600', upsert: true });

          if (!uploadErr && uploadData) {
            const { data: pubUrlData } = supabase.storage
              .from('chat-media')
              .getPublicUrl(filePath);

            if (pubUrlData?.publicUrl) {
              mediaUrl = pubUrlData.publicUrl;
            }
          }
        } catch {
          // Bucket not configured or network issue, proceed to data URL fallback
        }

        // 2. High-fidelity base64 data URL fallback (fast and works everywhere)
        if (!mediaUrl) {
          mediaUrl = await processMediaToDataUrl(mediaToSend.file, mediaToSend.mediaType);
        }
      } catch (err) {
        console.warn('Error processing media attachment:', err);
      } finally {
        setIsUploadingMedia(false);
      }
    }

    const snippetText = formatMessageSnippet(
      { content: text, media_type: mediaType, file_name: fileName },
      true
    );

    if (activeChatContact.isReal) {
      if (!user) {
        triggerToast('Please sign in to send messages');
        return;
      }

      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const optimisticMsg = {
        id: tempId,
        sender_id: user.id,
        receiver_id: activeChatContact.id,
        content: text,
        media_url: mediaUrl || (mediaToSend ? mediaToSend.previewUrl : null),
        media_type: mediaType,
        file_name: fileName,
        file_size: fileSize,
        created_at: new Date().toISOString(),
        is_read: false,
        isOptimistic: true
      };

      // Instantly add message to active chat thread
      setChatMessages(prev => [...prev, optimisticMsg]);

      // Update the contact snippet in the Known Contacts list
      setRealContacts(prev => prev.map(c => {
        if (c.id === activeChatContact.id) {
          return {
            ...c,
            recentMessage: snippetText,
            recentMessageTime: 'Just now',
            isSenderMe: true
          };
        }
        return c;
      }));

      try {
        const payload = {
          sender_id: user.id,
          receiver_id: activeChatContact.id,
          content: text || ''
        };

        if (mediaUrl) {
          payload.media_url = mediaUrl;
          payload.media_type = mediaType;
          payload.file_name = fileName;
          payload.file_size = fileSize;
        }

        const { data, error } = await supabase
          .from('messages')
          .insert(payload)
          .select()
          .single();

        if (error) {
          if (error.code === '42P01' || error.code === 'PGRST205' || error.message?.includes('schema cache') || error.message?.includes('messages')) {
            setShowSqlGuide(true);
            triggerToast('⚠️ Messages table missing in Supabase: Please run the SQL migration.');
          } else if (error.message?.includes('media_url') || error.code === '42703') {
            // If media_url column doesn't exist yet, fallback to sending text with notice
            const fallbackPayload = {
              sender_id: user.id,
              receiver_id: activeChatContact.id,
              content: text || `[Attached ${mediaType || 'file'}: ${fileName || 'media'}]`
            };
            const { data: fbData } = await supabase.from('messages').insert(fallbackPayload).select().single();
            if (fbData) {
              setChatMessages(prev => prev.map(m => m.id === tempId ? fbData : m));
            }
            setShowSqlGuide(true);
            triggerToast('⚠️ Please run the updated SQL migration in Supabase to enable media columns.');
          } else {
            console.error('Error sending message:', error);
            triggerToast(`Failed to deliver message: ${error.message}`);
          }
        } else if (data) {
          setChatMessages(prev => prev.map(m => m.id === tempId ? data : m));
        }
      } catch (err) {
        console.error('Error sending message:', err);
      }
    } else {
      // Mock contacts simulation
      const mockMsg = {
        id: `mock-${Date.now()}`,
        sender_id: user?.id || 'me',
        receiver_id: activeChatContact.id,
        content: text,
        media_url: mediaUrl || (mediaToSend ? mediaToSend.previewUrl : null),
        media_type: mediaType,
        file_name: fileName,
        file_size: fileSize,
        created_at: new Date().toISOString(),
        is_read: true
      };
      setChatMessages(prev => [...prev, mockMsg]);
      setContacts(prev => prev.map(c => {
        if (c.id === activeChatContact.id) {
          return {
            ...c,
            recentMessage: snippetText,
            recentMessageTime: 'Just now',
            isSenderMe: true
          };
        }
        return c;
      }));
    }
  };

  return (
    <div className="app-container" style={{ minHeight: '100vh', padding: '1.5rem 1rem', display: 'flex', justifyContent: 'center' }}>
      <div className="w-full" style={{ maxWidth: '680px' }}>

        {/* Toast Alert */}
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

        {/* Database Guide Alert (Shown if connection_requests or messages not yet migrated) */}
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
                <Sparkles size={16} /> Supabase Setup Required for Network & Direct Messaging
              </span>
              <button
                onClick={() => setShowSqlGuide(false)}
                className="text-muted hover-text-primary"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem' }}
              >
                <X size={16} />
              </button>
            </div>
            <p className="m-0 text-muted mb-3" style={{ lineHeight: 1.5 }}>
              To enable real-time direct messaging, connection requests, and privacy settings between accounts, your Supabase database needs the <code>connection_requests</code> and <code>messages</code> tables. Click the button below to copy the full SQL script to run in your <strong>Supabase SQL Editor</strong>.
            </p>
            <div className="flex items-center gap-3">
              <button
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

        {/* Top Navbar Header */}
        <div className="glass-panel p-4 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="btn-secondary flex items-center justify-center" style={{ padding: '0.5rem', borderRadius: '8px' }}>
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="m-0 flex items-center gap-2" style={{ fontSize: '1.25rem' }}>
                My Network <Users size={18} color="var(--accent-primary)" />
              </h1>
              <p className="text-xs text-muted m-0">Direct messages & live musician presence</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/bookings"
              className="btn-secondary flex items-center gap-1.5"
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', borderRadius: 'var(--radius-full)' }}
              title="View Active Bookings"
            >
              <Calendar size={13} color="var(--accent-secondary)" /> Bookings
            </Link>
            <Link
              to="/auditions"
              className="btn-secondary flex items-center gap-1.5"
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', borderRadius: 'var(--radius-full)' }}
              title="View Active Auditions"
            >
              <Mic2 size={13} color="#10b981" /> Auditions
            </Link>

            {/* Quick Privacy Mode Toggle Button */}
            {user && (
              <button
                type="button"
                onClick={handleToggleRequireRequests}
                title="Click to toggle whether other users must request approval before connecting with you"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full"
                style={{
                  background: isRequireRequestsOn ? 'rgba(139, 92, 246, 0.16)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${isRequireRequestsOn ? 'rgba(139, 92, 246, 0.4)' : 'var(--border-color)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontSize: '0.725rem'
                }}
              >
                <ShieldCheck size={13} color={isRequireRequestsOn ? 'var(--accent-secondary)' : 'var(--text-secondary)'} />
                <span style={{ color: isRequireRequestsOn ? 'var(--accent-secondary)' : 'var(--text-secondary)' }}>
                  Requests: <strong>{isRequireRequestsOn ? 'ON' : 'OFF'}</strong>
                </span>
              </button>
            )}

            {/* User Presence Pill */}
            <button
              onClick={() => setMyPresence(prev => prev === 'online' ? 'offline' : 'online')}
              title="Click to toggle your presence status"
              className="flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{
                background: myPresence === 'online' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${myPresence === 'online' ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-color)'}`,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: myPresence === 'online' ? '#10b981' : '#94a3b8',
                  boxShadow: myPresence === 'online' ? '0 0 8px #10b981' : 'none'
                }}
              />
              <span className="text-xs font-medium" style={{ color: myPresence === 'online' ? '#10b981' : 'var(--text-secondary)' }}>
                {myPresence === 'online' ? 'Active' : 'Offline'}
              </span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="glass-panel p-3 mb-4 flex items-center gap-2" style={{ position: 'relative' }}>
          <Search size={18} className="text-muted" style={{ marginLeft: '0.25rem' }} />
          <input
            type="text"
            placeholder="Search contacts by name, role, or messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '0.925rem'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-muted"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 mb-4" style={{ overflowX: 'auto', paddingBottom: '0.25rem' }}>
          <button
            onClick={() => setFilterTab('all')}
            style={{
              background: filterTab === 'all' ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.05)',
              color: filterTab === 'all' ? 'white' : 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
              padding: '0.4rem 0.9rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.8rem',
              fontWeight: 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s'
            }}
          >
            All Contacts ({contacts.length})
          </button>

          <button
            onClick={() => setFilterTab('online')}
            style={{
              background: filterTab === 'online' ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.05)',
              color: filterTab === 'online' ? 'white' : 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
              padding: '0.4rem 0.9rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.8rem',
              fontWeight: 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'all 0.2s'
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
            Online ({onlineCount})
          </button>

          <button
            onClick={() => setFilterTab('unread')}
            style={{
              background: filterTab === 'unread' ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.05)',
              color: filterTab === 'unread' ? 'white' : 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
              padding: '0.4rem 0.9rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.8rem',
              fontWeight: 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s'
            }}
          >
            Unread {unreadCount > 0 && `(${unreadCount})`}
          </button>

          <button
            onClick={() => setFilterTab('requests')}
            style={{
              background: filterTab === 'requests' ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.05)',
              color: filterTab === 'requests' ? 'white' : 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
              padding: '0.4rem 0.9rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.8rem',
              fontWeight: 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'all 0.2s'
            }}
          >
            <UserPlus size={13} />
            Requests ({requests.length})
          </button>
        </div>

        {/* CONNECTION REQUESTS SECTION (Instagram Style) */}
        {(filterTab === 'all' || filterTab === 'requests') && requests.length > 0 && (
          <div className="glass-panel p-4 mb-4" style={{ background: 'rgba(139, 92, 246, 0.05)', borderColor: 'rgba(139, 92, 246, 0.2)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold flex items-center gap-1.5" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent-primary)' }}>
                <UserPlus size={14} /> Connection Requests ({requests.length})
              </span>
              <span className="text-xs text-muted">People who want to collaborate</span>
            </div>

            <div className="flex-col gap-3" style={{ display: 'flex' }}>
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0" style={{ border: '2px solid rgba(139, 92, 246, 0.3)' }}>
                      <img src={req.avatar} alt={req.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold m-0 flex items-center gap-1.5">
                        {req.name}
                        <span className="text-xs font-normal text-muted">{req.handle}</span>
                      </h4>
                      <p className="text-xs text-muted m-0">{req.role}</p>
                      <p className="text-xs text-muted m-0 flex items-center gap-1 mt-0.5" style={{ color: 'var(--accent-secondary)' }}>
                        <Sparkles size={11} /> {req.mutualCount} mutual connections • {req.location}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAcceptRequest(req)}
                      className="btn-primary"
                      style={{ padding: '0.4rem 0.9rem', fontSize: '0.75rem', borderRadius: '6px' }}
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => handleDeclineRequest(req.id)}
                      className="btn-secondary"
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', borderRadius: '6px', color: 'var(--text-secondary)' }}
                    >
                      Ignore
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {filterTab === 'requests' && requests.length === 0 && (
          <div className="glass-panel p-8 text-center mb-4">
            <UserPlus size={36} className="text-muted" style={{ margin: '0 auto 0.5rem auto', opacity: 0.5, color: 'var(--accent-primary)' }} />
            <h4 className="text-base font-bold m-0">No Connection Requests</h4>
            <p className="text-xs text-muted mt-1">When other musicians request to connect with your profile, you will see them here.</p>
          </div>
        )}

        {/* CONTACTS LIST (INSTAGRAM DM / CONTACTS STYLE) */}
        {filterTab !== 'requests' && (
          <div className="glass-panel p-2">
            <div className="flex items-center justify-between p-3 border-b" style={{ borderBottomColor: 'var(--border-color)' }}>
              <span className="text-xs font-bold text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Known Contacts ({filteredContacts.length})
              </span>
              <span className="text-xs text-muted flex items-center gap-1">
                <Radio size={12} color="#10b981" /> Connect with your contacts
              </span>
            </div>

            {filteredContacts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
                <Users size={36} className="text-muted" style={{ margin: '0 auto 0.75rem auto', opacity: 0.5 }} />
                <h3 className="text-sm font-bold mb-1">
                  {searchQuery
                    ? 'No matching connections'
                    : filterTab === 'online'
                      ? 'No connected musicians are online'
                      : filterTab === 'unread'
                        ? 'No unread messages'
                        : 'No connected contacts yet'}
                </h3>
                <p className="text-xs text-muted m-0" style={{ maxWidth: '420px', margin: '0 auto', lineHeight: 1.4 }}>
                  {searchQuery
                    ? `No connections match "${searchQuery}"`
                    : filterTab === 'online'
                      ? 'Musicians you follow will appear as active here when they log on.'
                      : filterTab === 'unread'
                        ? 'You have caught up on all messages.'
                        : 'Only accounts you follow appear in your Known Contacts. Connect with musicians below to start networking!'}
                </p>
              </div>
            ) : (
              <div className="flex-col" style={{ display: 'flex' }}>
                {filteredContacts.map((contact) => {
                  const isOnline = isContactOnline(contact);
                  return (
                    <div
                      key={contact.id}
                      onClick={() => setActiveChatContact(contact)}
                      className="flex items-center justify-between p-3 rounded-xl hover-bg"
                      style={{
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                        borderBottom: '1px solid rgba(255,255,255,0.03)'
                      }}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div className="flex items-center gap-3.5" style={{ minWidth: 0 }}>

                        {/* Avatar with Online Status Indicator */}
                        <div className="relative flex-shrink-0" style={{ position: 'relative', width: '52px', height: '52px' }}>
                          <div
                            className="w-full h-full rounded-full overflow-hidden"
                            style={{ border: isOnline ? '2px solid rgba(16, 185, 129, 0.4)' : '2px solid transparent' }}
                          >
                            <img
                              src={contact.avatar}
                              alt={contact.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </div>

                          {/* Online Dot */}
                          <button
                            onClick={(e) => toggleContactOnline(e, contact)}
                            title={contact.isReal ? `Live status: ${isOnline ? 'Online now (active session)' : 'Offline'}` : `Status: ${isOnline ? 'Online now' : contact.lastSeen}. Click to toggle.`}
                            style={{
                              position: 'absolute',
                              bottom: '1px',
                              right: '1px',
                              width: '15px',
                              height: '15px',
                              borderRadius: '50%',
                              background: isOnline ? '#10b981' : '#64748b',
                              border: '2.5px solid var(--bg-dark)',
                              boxShadow: isOnline ? '0 0 8px rgba(16, 185, 129, 0.8)' : 'none',
                              cursor: 'pointer',
                              padding: 0
                            }}
                          />
                        </div>

                        {/* Contact Info & Recent Message */}
                        <div style={{ minWidth: 0 }}>
                          <div className="flex items-center gap-2 mb-0.5">
                            <h3
                              className="text-sm font-bold m-0 flex items-center gap-1.5"
                              style={{
                                color: 'var(--text-primary)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}
                            >
                              {contact.name}
                              {contact.isReal && (
                                <span
                                  style={{
                                    fontSize: '0.65rem',
                                    padding: '0.1rem 0.45rem',
                                    borderRadius: 'var(--radius-full)',
                                    background: 'rgba(139, 92, 246, 0.18)',
                                    color: 'var(--accent-secondary)',
                                    fontWeight: 600,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.2rem'
                                  }}
                                  title="Registered User Account"
                                >
                                  <Sparkles size={9} /> Account
                                </span>
                              )}
                            </h3>
                            <span className="text-xs text-muted" style={{ opacity: 0.8 }}>
                              {contact.handle}
                            </span>
                          </div>

                          <p className="text-xs text-muted m-0 mb-1" style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', opacity: 0.9 }}>
                            {contact.role}
                          </p>

                          {/* Recent Message snippet & status */}
                          <p
                            className="text-xs m-0"
                            style={{
                              color: contact.isUnread ? 'var(--text-primary)' : 'var(--text-secondary)',
                              fontWeight: contact.isUnread ? 600 : 400,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: '360px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem'
                            }}
                          >
                            {contact.isSenderMe && <CheckCheck size={13} color="var(--accent-secondary)" style={{ flexShrink: 0 }} />}
                            <span>{contact.recentMessage}</span>
                          </p>
                        </div>
                      </div>

                      {/* Right side: Connect Button, Time & Status Badge */}
                      <div className="flex items-center gap-2.5 flex-shrink-0" style={{ marginLeft: '0.75rem' }}>
                        {user && contact.id !== user.id && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleFollow(e, contact.id, contact.name, contact);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              padding: '0.3rem 0.65rem',
                              borderRadius: 'var(--radius-full)',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              border: followingUserIds.has(contact.id)
                                ? '1px solid rgba(139, 92, 246, 0.45)'
                                : sentRequestUserIds.has(contact.id)
                                  ? '1px solid rgba(245, 158, 11, 0.45)'
                                  : '1px solid rgba(255, 255, 255, 0.15)',
                              background: followingUserIds.has(contact.id)
                                ? 'rgba(139, 92, 246, 0.18)'
                                : sentRequestUserIds.has(contact.id)
                                  ? 'rgba(245, 158, 11, 0.18)'
                                  : 'rgba(255, 255, 255, 0.05)',
                              color: followingUserIds.has(contact.id)
                                ? 'var(--accent-secondary)'
                                : sentRequestUserIds.has(contact.id)
                                  ? '#f59e0b'
                                  : 'var(--text-primary)',
                              whiteSpace: 'nowrap'
                            }}
                            title={
                              followingUserIds.has(contact.id)
                                ? 'Connected (Click to disconnect)'
                                : sentRequestUserIds.has(contact.id)
                                  ? 'Request Sent (Click to cancel)'
                                  : 'Connect with user'
                            }
                          >
                            {followingUserIds.has(contact.id) ? (
                              <>
                                <Check size={12} color="var(--accent-secondary)" />
                                <span>Connected</span>
                              </>
                            ) : sentRequestUserIds.has(contact.id) ? (
                              <>
                                <Clock size={12} color="#f59e0b" />
                                <span>Requested</span>
                              </>
                            ) : (
                              <>
                                <UserPlus size={12} />
                                <span>Connect</span>
                              </>
                            )}
                          </button>
                        )}

                        <div className="flex-col items-end gap-1 flex-shrink-0" style={{ display: 'flex', textAlign: 'right' }}>
                          <span className="text-xs text-muted" style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                            {contact.recentMessageTime}
                          </span>

                          {contact.isUnread ? (
                            <div
                              style={{
                                width: '18px',
                                height: '18px',
                                borderRadius: '50%',
                                background: 'var(--accent-gradient)',
                                color: 'white',
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 8px rgba(139, 92, 246, 0.4)'
                              }}
                            >
                              {contact.unreadCount}
                            </div>
                          ) : (
                            <span className="text-xs" style={{ fontSize: '0.7rem', color: isOnline ? '#10b981' : 'var(--text-secondary)', opacity: 0.8 }}>
                              {isOnline ? 'online' : (contact.isReal ? 'offline' : '')}
                            </span>
                          )}
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SUGGESTED CONNECTIONS (UNFOLLOWED ACCOUNTS) */}
        {filterTab === 'all' && filteredSuggested.length > 0 && (
          <div className="glass-panel p-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold flex items-center gap-1.5" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                <Users size={14} color="var(--accent-primary)" /> Suggested Connections ({filteredSuggested.length})
              </span>
              <span className="text-xs text-muted">Musicians you can connect with</span>
            </div>

            <div className="flex-col gap-2.5" style={{ display: 'flex' }}>
              {filteredSuggested.map((contact) => {
                const isOnline = isContactOnline(contact);
                const isRequested = sentRequestUserIds.has(contact.id);
                return (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between p-3 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}
                  >
                    <div className="flex items-center gap-3.5" style={{ minWidth: 0 }}>
                      <div className="relative flex-shrink-0" style={{ position: 'relative', width: '46px', height: '46px' }}>
                        <div className="w-full h-full rounded-full overflow-hidden" style={{ border: isOnline ? '2px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border-color)' }}>
                          <img src={contact.avatar} alt={contact.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        {isOnline && (
                          <span
                            title="Online now"
                            style={{
                              position: 'absolute',
                              bottom: '0px',
                              right: '0px',
                              width: '12px',
                              height: '12px',
                              borderRadius: '50%',
                              background: '#10b981',
                              border: '2px solid var(--bg-dark)',
                              boxShadow: '0 0 6px rgba(16, 185, 129, 0.8)'
                            }}
                          />
                        )}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <h4 className="text-sm font-bold m-0 flex items-center gap-1.5">
                          {contact.name}
                          <span className="text-xs font-normal text-muted">{contact.handle}</span>
                        </h4>
                        <p className="text-xs text-muted m-0" style={{ color: 'var(--accent-primary)', fontSize: '0.75rem' }}>
                          {contact.role} {contact.location && `• ${contact.location}`}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleToggleFollow(e, contact.id, contact.name, contact)}
                      className={isRequested ? 'btn-secondary' : 'btn-primary'}
                      style={{
                        padding: '0.35rem 0.85rem',
                        fontSize: '0.75rem',
                        borderRadius: 'var(--radius-full)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        cursor: 'pointer',
                        color: isRequested ? '#f59e0b' : undefined,
                        borderColor: isRequested ? 'rgba(245, 158, 11, 0.4)' : undefined
                      }}
                      title={isRequested ? 'Request pending (Click to cancel)' : 'Connect with musician'}
                    >
                      {isRequested ? (
                        <>
                          <Clock size={12} color="#f59e0b" /> Requested
                        </>
                      ) : (
                        <>
                          <UserPlus size={12} /> Connect
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* QUICK CHAT / MESSAGE DRAWER MODAL */}
        {activeChatContact && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(8px)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem'
            }}
            onClick={() => setActiveChatContact(null)}
          >
            <div
              className="glass-panel"
              style={{
                width: '100%',
                maxWidth: '460px',
                padding: '1.5rem',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid rgba(255,255,255,0.15)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              {(() => {
                const modalIsOnline = isContactOnline(activeChatContact);
                return (
                  <div className="flex items-center justify-between pb-3 border-b mb-4" style={{ borderBottomColor: 'var(--border-color)' }}>
                    <div className="flex items-center gap-3">
                      <div className="relative" style={{ width: '42px', height: '42px' }}>
                        <img
                          src={activeChatContact.avatar}
                          alt={activeChatContact.name}
                          className="w-full h-full rounded-full"
                          style={{ objectFit: 'cover' }}
                        />
                        <span
                          style={{
                            position: 'absolute',
                            bottom: '0px',
                            right: '0px',
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            background: modalIsOnline ? '#10b981' : '#64748b',
                            border: '2px solid var(--bg-dark)'
                          }}
                        />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold m-0 flex items-center gap-1.5">
                          {activeChatContact.name}
                          {activeChatContact.isReal && (
                            <span style={{ fontSize: '0.6rem', color: 'var(--accent-secondary)' }}>● Registered</span>
                          )}
                        </h3>
                        <p className="text-xs text-muted m-0 flex items-center gap-1">
                          {modalIsOnline ? (
                            <span style={{ color: '#10b981' }}>Active now</span>
                          ) : (
                            <span>{activeChatContact.isReal ? 'Offline' : activeChatContact.lastSeen}</span>
                          )}
                          • {activeChatContact.location}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveChatContact(null)}
                      className="btn-secondary flex items-center justify-center"
                      style={{ padding: '0.4rem', borderRadius: '50%' }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                );
              })()}

              {/* Real-time Message Thread */}
              <div
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  marginBottom: '1rem',
                  height: '340px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem',
                  border: '1px solid rgba(255,255,255,0.06)'
                }}
              >
                {isChatLoading ? (
                  <div className="flex flex-col items-center justify-center m-auto text-muted gap-2" style={{ padding: '2rem' }}>
                    <div
                      className="rounded-full"
                      style={{
                        width: '24px',
                        height: '24px',
                        border: '2px solid rgba(139, 92, 246, 0.3)',
                        borderTopColor: 'var(--accent-secondary)',
                        animation: 'spin 0.8s linear infinite'
                      }}
                    />
                    <span className="text-xs">Loading message thread...</span>
                  </div>
                ) : chatMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center m-auto text-center p-4 text-muted">
                    <MessageSquare size={34} style={{ opacity: 0.4, color: 'var(--accent-secondary)', marginBottom: '0.6rem' }} />
                    <p className="text-xs font-semibold m-0" style={{ color: 'var(--text-primary)' }}>
                      Start a conversation
                    </p>
                    <p className="text-xs text-muted m-0 mt-1" style={{ maxWidth: '240px', lineHeight: 1.4 }}>
                      Say hello to {activeChatContact.name.split(' ')[0]} and start networking or collaborating!
                    </p>
                  </div>
                ) : (
                  chatMessages.map((msg) => {
                    const isMe = msg.sender_id === user?.id || msg.isSenderMe;
                    const bubbleTime = formatBubbleTime(msg.created_at);

                    return (
                      <div
                        key={msg.id}
                        style={{
                          alignSelf: isMe ? 'flex-end' : 'flex-start',
                          maxWidth: '84%',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isMe ? 'flex-end' : 'flex-start'
                        }}
                      >
                        <div
                          style={{
                            background: isMe ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.08)',
                            border: isMe ? 'none' : '1px solid rgba(255,255,255,0.08)',
                            color: isMe ? 'white' : 'var(--text-primary)',
                            padding: '0.65rem 0.95rem',
                            borderRadius: isMe ? '16px 16px 3px 16px' : '16px 16px 16px 3px',
                            fontSize: '0.85rem',
                            lineHeight: 1.45,
                            wordBreak: 'break-word',
                            boxShadow: isMe ? '0 4px 14px rgba(139, 92, 246, 0.28)' : 'none'
                          }}
                        >
                          {/* Media Attachment Rendering */}
                          {msg.media_url && (
                            <div style={{ marginBottom: msg.content ? '0.5rem' : 0 }}>
                              {msg.media_type === 'image' ? (
                                <div
                                  style={{
                                    borderRadius: '10px',
                                    overflow: 'hidden',
                                    cursor: 'pointer',
                                    maxHeight: '220px'
                                  }}
                                  onClick={() => setPreviewImageModal(msg.media_url)}
                                  title="Click to view full image"
                                >
                                  <img
                                    src={msg.media_url}
                                    alt={msg.file_name || 'Attachment'}
                                    style={{
                                      width: '100%',
                                      height: 'auto',
                                      maxHeight: '220px',
                                      objectFit: 'cover',
                                      display: 'block',
                                      borderRadius: '10px'
                                    }}
                                  />
                                </div>
                              ) : msg.media_type === 'audio' ? (
                                <div
                                  style={{
                                    background: 'rgba(0,0,0,0.3)',
                                    borderRadius: '10px',
                                    padding: '0.6rem 0.8rem',
                                    border: '1px solid rgba(255,255,255,0.1)'
                                  }}
                                >
                                  <div className="flex items-center gap-2 mb-2">
                                    <Music size={15} color="var(--accent-secondary)" />
                                    <span className="text-xs font-semibold truncate" style={{ maxWidth: '190px' }}>
                                      {msg.file_name || 'Audio Track'}
                                    </span>
                                    {msg.file_size && (
                                      <span className="text-muted" style={{ fontSize: '0.65rem' }}>
                                        ({formatFileSize(msg.file_size)})
                                      </span>
                                    )}
                                  </div>
                                  <audio
                                    controls
                                    src={msg.media_url}
                                    style={{ width: '100%', height: '32px', outline: 'none' }}
                                  />
                                </div>
                              ) : (
                                <a
                                  href={msg.media_url}
                                  download={msg.file_name || 'download'}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-between p-2.5 rounded-lg hover-bg"
                                  style={{
                                    background: 'rgba(0,0,0,0.25)',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    textDecoration: 'none',
                                    color: 'inherit',
                                    gap: '0.75rem'
                                  }}
                                >
                                  <div className="flex items-center gap-2.5 overflow-hidden">
                                    <FileText size={20} color="var(--accent-secondary)" style={{ flexShrink: 0 }} />
                                    <div className="overflow-hidden">
                                      <p className="text-xs font-semibold m-0 truncate" style={{ maxWidth: '170px' }}>
                                        {msg.file_name || 'Attached File'}
                                      </p>
                                      {msg.file_size && (
                                        <p className="text-muted m-0" style={{ fontSize: '0.65rem' }}>
                                          {formatFileSize(msg.file_size)}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div
                                    className="btn-secondary flex items-center justify-center flex-shrink-0"
                                    style={{ padding: '0.35rem', borderRadius: '50%' }}
                                  >
                                    <Download size={14} />
                                  </div>
                                </a>
                              )}
                            </div>
                          )}

                          {/* Message Text Caption */}
                          {msg.content && (
                            <div>{msg.content}</div>
                          )}
                        </div>

                        <div
                          className="flex items-center gap-1 mt-1 text-muted"
                          style={{
                            fontSize: '0.65rem',
                            opacity: 0.75,
                            padding: '0 0.25rem'
                          }}
                        >
                          <span>{bubbleTime || 'Just now'}</span>
                          {isMe && (
                            <CheckCheck
                              size={12}
                              color={msg.is_read ? '#67e8f9' : 'rgba(255,255,255,0.65)'}
                              title={msg.is_read ? 'Read' : 'Delivered'}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Attachment Preview Box (if file selected) */}
              {attachedMedia && (
                <div
                  className="flex items-center justify-between p-2 mb-2 rounded-lg"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(139, 92, 246, 0.4)',
                    animation: 'fadeIn 0.15s ease-out'
                  }}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    {attachedMedia.mediaType === 'image' ? (
                      <img
                        src={attachedMedia.previewUrl}
                        alt="Preview"
                        style={{ width: '42px', height: '42px', borderRadius: '6px', objectFit: 'cover' }}
                      />
                    ) : attachedMedia.mediaType === 'audio' ? (
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '6px',
                          background: 'rgba(139,92,246,0.25)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Music size={20} color="var(--accent-secondary)" />
                      </div>
                    ) : (
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '6px',
                          background: 'rgba(255,255,255,0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <FileText size={20} color="var(--accent-primary)" />
                      </div>
                    )}
                    <div className="overflow-hidden">
                      <p className="text-xs font-semibold m-0 truncate" style={{ maxWidth: '270px' }}>
                        {attachedMedia.fileName}
                      </p>
                      <p className="text-xs text-muted m-0" style={{ fontSize: '0.7rem' }}>
                        {formatFileSize(attachedMedia.fileSize)} • {attachedMedia.mediaType.toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttachedMedia(null)}
                    className="text-muted hover-text-primary p-1"
                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                    title="Remove attachment"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              {/* Message Input Form */}
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                {/* Hidden File Picker */}
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                  accept="image/*,audio/*,.pdf,.doc,.docx,.txt,.zip,.mid,.midi"
                />

                {/* Attachment Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-secondary flex items-center justify-center flex-shrink-0"
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    padding: 0,
                    cursor: 'pointer'
                  }}
                  title="Attach photo, audio stem, or document"
                >
                  <Paperclip size={18} />
                </button>

                <input
                  type="text"
                  placeholder={
                    attachedMedia
                      ? `Add a caption (optional)...`
                      : `Message ${activeChatContact.name.split(' ')[0]}...`
                  }
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  autoFocus
                  className="w-full"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-full)',
                    padding: '0.65rem 1.25rem',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    fontSize: '0.875rem'
                  }}
                />

                <button
                  type="submit"
                  disabled={(!newMessageText.trim() && !attachedMedia) || isUploadingMedia}
                  className="btn-primary flex items-center justify-center"
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    padding: 0,
                    flexShrink: 0,
                    opacity: (newMessageText.trim() || attachedMedia) ? 1 : 0.5,
                    cursor: (newMessageText.trim() || attachedMedia) ? 'pointer' : 'not-allowed'
                  }}
                  title="Send message"
                >
                  <Send size={16} />
                </button>
              </form>

            </div>
          </div>
        )}

        {/* Full Image Preview Modal Lightbox */}
        {previewImageModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.88)',
              zIndex: 2000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.5rem',
              backdropFilter: 'blur(10px)'
            }}
            onClick={() => setPreviewImageModal(null)}
          >
            <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
              <img
                src={previewImageModal}
                alt="Full preview"
                style={{
                  maxWidth: '100%',
                  maxHeight: '85vh',
                  borderRadius: '12px',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
                  display: 'block'
                }}
              />
              <button
                onClick={() => setPreviewImageModal(null)}
                className="btn-secondary flex items-center justify-center"
                style={{
                  position: 'absolute',
                  top: '-12px',
                  right: '-12px',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  padding: 0,
                  background: 'rgba(0,0,0,0.7)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
