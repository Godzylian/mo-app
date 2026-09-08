import { useState, useEffect, useMemo } from 'react';
import {
  Home, Users, Briefcase, Calendar, Bell, MessageSquare,
  Settings as SettingsIcon, Music, Search, Heart, MessageCircle, Share2,
  MoreHorizontal, MapPin, Star, LogOut, Mic2, Send, Image as ImageIcon,
  Trash2, Loader2, Check, AlertCircle, X, Sparkles, Globe, ExternalLink,
  Film, Download, UserPlus, User, Clock
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePresence } from '../contexts/PresenceContext';
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

const LIKES_AND_CONNECTIONS_SQL = `-- Run this in Supabase SQL Editor:
-- 1. Create post_likes table
CREATE TABLE IF NOT EXISTS public.post_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Post likes are viewable by everyone" ON public.post_likes;
CREATE POLICY "Post likes are viewable by everyone" ON public.post_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can like posts" ON public.post_likes;
CREATE POLICY "Users can like posts" ON public.post_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unlike posts" ON public.post_likes;
CREATE POLICY "Users can unlike posts" ON public.post_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 2. Create connections table
CREATE TABLE IF NOT EXISTS public.connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  connected_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, connected_user_id)
);

ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Connections are viewable by everyone" ON public.connections;
CREATE POLICY "Connections are viewable by everyone" ON public.connections FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create connections" ON public.connections;
CREATE POLICY "Users can create connections" ON public.connections FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove connections" ON public.connections;
CREATE POLICY "Users can remove connections" ON public.connections FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 3. Automatic Trigger: Post Likes Counter
CREATE OR REPLACE FUNCTION public.handle_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.posts
    SET likes_count = (SELECT count(*) FROM public.post_likes WHERE post_id = NEW.post_id)
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.posts
    SET likes_count = (SELECT count(*) FROM public.post_likes WHERE post_id = OLD.post_id)
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_post_likes_count ON public.post_likes;
CREATE TRIGGER tr_post_likes_count
AFTER INSERT OR DELETE ON public.post_likes
FOR EACH ROW EXECUTE FUNCTION public.handle_post_like_count();

-- 4. Automatic Trigger: Connections Counter
CREATE OR REPLACE FUNCTION public.handle_connection_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.profiles
    SET connections_count = (SELECT count(*) FROM public.connections WHERE user_id = NEW.user_id)
    WHERE id = NEW.user_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.profiles
    SET connections_count = (SELECT count(*) FROM public.connections WHERE user_id = OLD.user_id)
    WHERE id = OLD.user_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_connection_count ON public.connections;
CREATE TRIGGER tr_connection_count
AFTER INSERT OR DELETE ON public.connections
FOR EACH ROW EXECUTE FUNCTION public.handle_connection_count();

-- 5. Support Connection Requests & Approval Settings
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS require_connection_request BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS public.connection_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sender_id, receiver_id)
);

ALTER TABLE public.connection_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Connection requests viewable by sender or receiver" ON public.connection_requests;
CREATE POLICY "Connection requests viewable by sender or receiver"
  ON public.connection_requests FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can send connection requests" ON public.connection_requests;
CREATE POLICY "Users can send connection requests"
  ON public.connection_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users can update received connection requests" ON public.connection_requests;
CREATE POLICY "Users can update received connection requests"
  ON public.connection_requests FOR UPDATE TO authenticated
  USING (auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can delete their connection requests" ON public.connection_requests;
CREATE POLICY "Users can delete their connection requests"
  ON public.connection_requests FOR DELETE TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- 6. Enable Supabase Realtime
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.post_likes;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.connections;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.connection_requests;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
`;

export default function HomePage() {
  const { user, profile, signOut, updateConnectionsCount } = useAuth();
  const { isUserOnline, myPresence } = usePresence();

  // Community Members for Right Panel
  const [communityMembers, setCommunityMembers] = useState([]);

  // Followed Connections, Pending Requests & Post Likes State
  const [followingUserIds, setFollowingUserIds] = useState(new Set());
  const [sentRequestUserIds, setSentRequestUserIds] = useState(new Set());
  const [busyUserIds, setBusyUserIds] = useState(new Set());
  const [likedPostIds, setLikedPostIds] = useState(new Set());

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
  const [showSqlGuide, setShowSqlGuide] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const handleCopySql = () => {
    navigator.clipboard.writeText(LIKES_AND_CONNECTIONS_SQL);
    setCopiedSql(true);
    triggerToast('✓ SQL copied to clipboard! Paste it into Supabase SQL Editor.');
    setTimeout(() => setCopiedSql(false), 3000);
  };

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

    // Fetch registered members for Suggested Connections
    const fetchCommunityMembers = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(8);

        if (!error && data) {
          const others = data.filter(p => p.id !== user?.id);
          setCommunityMembers(others);
        }
      } catch (err) {
        console.warn('Could not load community members:', err);
      }
    };

    // Fetch user's existing post likes from Supabase
    const fetchUserLikes = async () => {
      if (!user?.id) return;
      try {
        const { data, error } = await supabase
          .from('post_likes')
          .select('post_id')
          .eq('user_id', user.id);

        if (error) {
          if (error.code === '42P01' || error.message?.includes('schema cache') || error.message?.includes('does not exist')) {
            setShowSqlGuide(true);
          }
        } else if (data) {
          setLikedPostIds(new Set(data.map(item => item.post_id)));
        }
      } catch (err) {
        console.warn('Could not fetch user likes:', err);
      }
    };

    // Fetch user's current following / connections from Supabase (bidirectional)
    const fetchFollowing = async () => {
      if (!user?.id) return;
      try {
        const { data, error } = await supabase
          .from('connections')
          .select('user_id, connected_user_id')
          .or(`user_id.eq.${user.id},connected_user_id.eq.${user.id}`);

        if (error) {
          if (error.code === '42P01' || error.message?.includes('schema cache') || error.message?.includes('does not exist')) {
            setShowSqlGuide(true);
          }
        } else if (data) {
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
      } catch (err) {
        console.warn('Could not fetch following connections:', err);
      }
    };

    // Fetch sent pending connection requests
    const fetchSentRequests = async () => {
      if (!user?.id) return;
      try {
        const { data, error } = await supabase
          .from('connection_requests')
          .select('receiver_id')
          .eq('sender_id', user.id)
          .eq('status', 'pending');

        if (!error && data) {
          setSentRequestUserIds(new Set(data.map(item => item.receiver_id)));
        }
      } catch (err) {
        console.warn('Could not fetch sent connection requests:', err);
      }
    };

    fetchCommunityMembers();
    fetchUserLikes();
    fetchFollowing();
    fetchSentRequests();

    // Listen for real-time posts, likes, and connection requests
    const channel = supabase
      .channel('public:posts_feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, (payload) => {
        if (payload.eventType === 'UPDATE' && payload.new) {
          // Immediately update post in feed while preserving joined author profile
          setPosts(prev => prev.map(p => {
            if (p.id === payload.new.id) {
              return {
                ...p,
                ...payload.new,
                profiles: p.profiles
              };
            }
            return p;
          }));
        } else {
          fetchPosts();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_likes' }, (payload) => {
        if (payload.eventType === 'INSERT' && payload.new) {
          const { post_id, user_id: likerId } = payload.new;
          if (user?.id && likerId === user.id) {
            setLikedPostIds(prev => new Set(prev).add(post_id));
          }
          setPosts(prev => prev.map(p => {
            if (p.id === post_id) {
              return { ...p, likes_count: (p.likes_count || 0) + 1 };
            }
            return p;
          }));
        } else if (payload.eventType === 'DELETE' && payload.old) {
          const { post_id, user_id: unlikerId } = payload.old;
          if (user?.id && unlikerId === user.id) {
            setLikedPostIds(prev => {
              const next = new Set(prev);
              next.delete(post_id);
              return next;
            });
          }
          setPosts(prev => prev.map(p => {
            if (p.id === post_id) {
              return { ...p, likes_count: Math.max(0, (p.likes_count || 1) - 1) };
            }
            return p;
          }));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connection_requests' }, () => {
        fetchSentRequests();
        fetchFollowing();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connections' }, () => {
        fetchFollowing();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

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
        .maybeSingle();

      if (error) {
        // Fallback for local preview if table not created yet
        if (error.message.includes('relation "public.posts" does not exist') || error.message.includes('schema cache')) {
          setShowSqlGuide(true);
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
              full_name: profile?.full_name || 'You',
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
        setPosts(prev => prev.filter(p => p.id !== postId));
        triggerToast('Post removed.');
      }
    } catch (err) {
      console.error('Error deleting post:', err);
    }
  };

  // Handle Liking a Post (Persists to Supabase & broadcasts to all users)
  const handleLikePost = async (postId) => {
    if (!user) {
      triggerToast('Please sign in to like posts');
      return;
    }

    const isCurrentlyLiked = likedPostIds.has(postId);
    const targetPost = posts.find(p => p.id === postId);
    const originalCount = targetPost?.likes_count || 0;
    const newCount = isCurrentlyLiked ? Math.max(0, originalCount - 1) : originalCount + 1;

    // 1. Optimistic local state update
    setLikedPostIds(prev => {
      const next = new Set(prev);
      if (isCurrentlyLiked) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });

    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return { ...p, likes_count: newCount };
      }
      return p;
    }));

    try {
      // 2. Persist in post_likes table
      if (isCurrentlyLiked) {
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('post_likes')
          .insert([{ post_id: postId, user_id: user.id }]);
        if (error) throw error;
      }

      // 3. Update likes_count in posts table as backup (if DB trigger isn't installed yet)
      await supabase
        .from('posts')
        .update({ likes_count: newCount })
        .eq('id', postId);

    } catch (err) {
      console.warn('Could not persist like to Supabase:', err);

      // Rollback optimistic state immediately so user does not see an unsaved like or infinite likes!
      setLikedPostIds(prev => {
        const rollback = new Set(prev);
        if (isCurrentlyLiked) rollback.add(postId);
        else rollback.delete(postId);
        return rollback;
      });

      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return { ...p, likes_count: originalCount };
        }
        return p;
      }));

      if (err?.code === '42P01' || err?.message?.includes('schema cache') || err?.message?.includes('does not exist')) {
        setShowSqlGuide(true);
        triggerToast('⚠️ Database Setup Required: Run SQL in Supabase to enable likes');
      } else {
        triggerToast('Could not save like. Please try again.');
      }
    }
  };

  // Handle Following / Connecting with another Musician
  const handleToggleFollow = async (targetUserId, targetUserName = 'Musician') => {
    if (!user) {
      triggerToast('Please sign in to connect with musicians');
      return;
    }
    if (targetUserId === user.id) {
      triggerToast("You cannot follow your own profile");
      return;
    }
    if (busyUserIds.has(targetUserId)) return; // Prevent spam clicking

    setBusyUserIds(prev => new Set(prev).add(targetUserId));

    try {
      const isCurrentlyFollowing = followingUserIds.has(targetUserId);
      const hasSentRequest = sentRequestUserIds.has(targetUserId);

      // If currently following -> Unfollow / Disconnect
      if (isCurrentlyFollowing) {
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
          await supabase
            .from('profiles')
            .update({ connections_count: myRealCount })
            .eq('id', user.id);

          // Recalculate exact count for target user
          const { data: targetData } = await supabase
            .from('connections')
            .select('user_id, connected_user_id')
            .or(`user_id.eq.${targetUserId},connected_user_id.eq.${targetUserId}`);
          const targetRealCount = targetData ? new Set(targetData.map(r => r.user_id === targetUserId ? r.connected_user_id : r.user_id)).size : 0;

          await supabase
            .from('profiles')
            .update({ connections_count: targetRealCount })
            .eq('id', targetUserId);
        } catch (err) {
          console.warn('Error disconnecting from user:', err);
          setFollowingUserIds(prev => new Set(prev).add(targetUserId));
          if (updateConnectionsCount) updateConnectionsCount(1);
        }
        return;
      }

      // If request already sent -> Cancel pending request
      if (hasSentRequest) {
        setSentRequestUserIds(prev => {
          const next = new Set(prev);
          next.delete(targetUserId);
          return next;
        });
        triggerToast(`Cancelled connection request to ${targetUserName}`);

        try {
          await supabase
            .from('connection_requests')
            .delete()
            .eq('sender_id', user.id)
            .eq('receiver_id', targetUserId);
        } catch (err) {
          console.warn('Error cancelling request:', err);
          setSentRequestUserIds(prev => new Set(prev).add(targetUserId));
        }
        return;
      }

      // Check if target user requires connection requests
      try {
        let requiresRequest = false;
        const { data: targetProfile, error: profileErr } = await supabase
          .from('profiles')
          .select('require_connection_request')
          .eq('id', targetUserId)
          .maybeSingle();

        if (profileErr) {
          if (profileErr.code === '42703' || profileErr.message?.includes('does not exist')) {
            setShowSqlGuide(true);
            triggerToast('⚠️ Database Setup Required: Run SQL in Supabase to enable connection requests');
            return;
          }
        }

        if (targetProfile && targetProfile.require_connection_request) {
          requiresRequest = true;
        }

        if (requiresRequest) {
          // Optimistic UI for Request Sent
          setSentRequestUserIds(prev => new Set(prev).add(targetUserId));
          triggerToast(`Connection request sent to ${targetUserName} ⏳`);

          const { error: reqError } = await supabase
            .from('connection_requests')
            .insert([{
              sender_id: user.id,
              receiver_id: targetUserId,
              status: 'pending'
            }]);

          if (reqError) {
            if (reqError.code === '42P01' || reqError.code === '42703' || reqError.message?.includes('does not exist')) {
              setShowSqlGuide(true);
              triggerToast('⚠️ Please run the SQL schema update in Supabase');
            }
            throw reqError;
          }
          return;
        }

        // Direct connect if no request required
        setFollowingUserIds(prev => new Set(prev).add(targetUserId));
        if (updateConnectionsCount) updateConnectionsCount(1);
        triggerToast(`Connected! You are now following ${targetUserName} 🎉`);

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
        await supabase
          .from('profiles')
          .update({ connections_count: myRealCount })
          .eq('id', user.id);

        // Recalculate exact count for target user
        const { data: targetData } = await supabase
          .from('connections')
          .select('user_id, connected_user_id')
          .or(`user_id.eq.${targetUserId},connected_user_id.eq.${targetUserId}`);
        const targetRealCount = targetData ? new Set(targetData.map(r => r.user_id === targetUserId ? r.connected_user_id : r.user_id)).size : 0;

        await supabase
          .from('profiles')
          .update({ connections_count: targetRealCount })
          .eq('id', targetUserId);
      } catch (err) {
        console.warn('Could not connect / send request:', err);
        // Rollback
        setFollowingUserIds(prev => {
          const rollback = new Set(prev);
          rollback.delete(targetUserId);
          return rollback;
        });
        setSentRequestUserIds(prev => {
          const rollback = new Set(prev);
          rollback.delete(targetUserId);
          return rollback;
        });
        if (updateConnectionsCount) updateConnectionsCount(-1);

        if (err?.code === '42P01' || err?.message?.includes('schema cache') || err?.message?.includes('does not exist')) {
          setShowSqlGuide(true);
          triggerToast('⚠️ Database Setup Required: Run SQL in Supabase');
        } else {
          triggerToast('Could not save connection. Please try again.');
        }
      }
    } finally {
      setBusyUserIds(prev => {
        const next = new Set(prev);
        next.delete(targetUserId);
        return next;
      });
    }
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

  // Count current user's posts
  const myPostsCount = useMemo(() => {
    if (!user) return 0;
    return posts.filter(p => p.user_id === user.id || p.profiles?.id === user.id).length;
  }, [posts, user]);

  // Filtered Posts based on Feed Filter Tab
  const filteredPosts = useMemo(() => {
    return posts.filter(p => {
      if (feedTab === 'my_posts') {
        return user && (p.user_id === user.id || p.profiles?.id === user.id);
      }
      if (feedTab === 'bookings') return p.post_type === 'booking';
      if (feedTab === 'auditions') return p.post_type === 'audition';
      return true;
    });
  }, [posts, feedTab, user]);

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
            <div className="relative mb-2" style={{ position: 'relative', width: '80px', height: '80px' }}>
              <div className="w-20 h-20 rounded-full flex-shrink-0 overflow-hidden" style={{ border: '2px solid var(--accent-primary)', width: '100%', height: '100%' }}>
                <img src={profile?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop'} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <span 
                title={`Your status: ${myPresence === 'online' ? 'Active' : 'Offline'}`}
                style={{
                  position: 'absolute',
                  bottom: '2px',
                  right: '2px',
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: myPresence === 'online' ? '#10b981' : '#94a3b8',
                  border: '2.5px solid var(--bg-dark)',
                  boxShadow: myPresence === 'online' ? '0 0 8px #10b981' : 'none'
                }} 
              />
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
              <button
                onClick={() => setFeedTab('all')}
                className="flex items-center gap-3 p-2 rounded-md hover-bg"
                style={{
                  background: feedTab === 'all' ? 'rgba(255,255,255,0.06)' : 'transparent',
                  border: 'none',
                  color: feedTab === 'all' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  width: '100%',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                <Home size={18} className="text-muted" /> Home Feed
              </button>

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
              className="glass-panel p-4"
              style={{
                background: 'rgba(139, 92, 246, 0.12)',
                border: '1px solid rgba(139, 92, 246, 0.4)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.85rem'
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold flex items-center gap-1.5" style={{ color: 'var(--accent-secondary)' }}>
                  <Sparkles size={16} /> Supabase Setup Required for Likes & Connections
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
                To enable live post likes, follower tracking, and real-time syncing between accounts, run the SQL script in your <strong>Supabase SQL Editor</strong>. This creates the <code>post_likes</code> and <code>connections</code> tables with automatic triggers.
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

          {/* Feed Filter / Quick Nav */}
          <div className="flex gap-4 border-b" style={{ borderBottomColor: 'var(--border-color)', paddingBottom: '0.5rem', alignItems: 'center', overflowX: 'auto' }}>
            <button
              onClick={() => setFeedTab('all')}
              className="text-sm font-bold"
              style={{
                color: feedTab === 'all' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                borderBottom: feedTab === 'all' ? '2px solid var(--accent-primary)' : 'none',
                paddingBottom: '0.5rem',
                background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              All Updates ({posts.length})
            </button>

            {user && (
              <button
                onClick={() => setFeedTab('my_posts')}
                className="text-sm font-semibold flex items-center gap-1.5"
                style={{
                  color: feedTab === 'my_posts' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  borderBottom: feedTab === 'my_posts' ? '2px solid var(--accent-primary)' : 'none',
                  paddingBottom: '0.5rem',
                  background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                <User size={14} /> My Posts ({myPostsCount})
              </button>
            )}

            <button
              onClick={() => setFeedTab('bookings')}
              className="text-sm font-medium"
              style={{
                color: feedTab === 'bookings' ? 'var(--accent-secondary)' : 'var(--text-secondary)',
                borderBottom: feedTab === 'bookings' ? '2px solid var(--accent-secondary)' : 'none',
                paddingBottom: '0.5rem',
                background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer',
                whiteSpace: 'nowrap'
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
                background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer',
                whiteSpace: 'nowrap'
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
              {feedTab === 'my_posts' ? (
                <>
                  <User size={32} className="text-muted" style={{ margin: '0 auto 0.5rem auto', opacity: 0.6, color: 'var(--accent-secondary)' }} />
                  <h4 className="text-sm font-bold m-0">You haven't published any posts yet</h4>
                  <p className="text-xs text-muted mt-1">Use the composer above or click 'Post MO' to share your music, bookings, or auditions.</p>
                  <button
                    onClick={() => setFeedTab('all')}
                    className="btn-secondary text-xs mt-3"
                    style={{ padding: '0.35rem 0.85rem', borderRadius: 'var(--radius-full)' }}
                  >
                    View All Community Posts
                  </button>
                </>
              ) : (
                <>
                  <Music size={32} className="text-muted" style={{ margin: '0 auto 0.5rem auto', opacity: 0.5 }} />
                  <h4 className="text-sm font-bold m-0">No posts in this category</h4>
                  <p className="text-xs text-muted mt-1">Be the first to share an update above!</p>
                </>
              )}
            </div>
          ) : (
            filteredPosts.map((post) => {
              const author = post.profiles || {};
              const isMyPost = user && post.user_id === user.id;
              const isLiked = likedPostIds.has(post.id);
              const authorId = post.user_id || author.id;
              const isAuthorOnline = authorId ? isUserOnline(authorId) : false;

              return (
                <div key={post.id} className="glass-panel p-4 flex-col gap-3" style={{ display: 'flex' }}>

                  {/* Post Header: Author info & options */}
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3 items-center">
                      <div className="relative" style={{ position: 'relative', width: '40px', height: '40px', flexShrink: 0 }}>
                        <div className="w-10 h-10 rounded-full overflow-hidden" style={{ border: '1px solid var(--border-color)', width: '100%', height: '100%' }}>
                          <img
                            src={author.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop'}
                            alt={author.full_name || 'Member'}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                        {authorId && (
                          <span 
                            title={isAuthorOnline ? 'Online now' : 'Offline'}
                            style={{
                              position: 'absolute',
                              bottom: '0px',
                              right: '0px',
                              width: '11px',
                              height: '11px',
                              borderRadius: '50%',
                              background: isAuthorOnline ? '#10b981' : '#64748b',
                              border: '2px solid var(--bg-dark)',
                              boxShadow: isAuthorOnline ? '0 0 6px rgba(16, 185, 129, 0.8)' : 'none'
                            }} 
                          />
                        )}
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

                    {/* Author & Post Controls */}
                    {isMyPost && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          title="Delete your post"
                          className="text-muted hover-text-primary"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
                        >
                          <Trash2 size={16} color="#ef4444" />
                        </button>
                      </div>
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

                  {/* Post Footer Actions (Like, Connect/Following, Share) */}
                  <div className="flex gap-4 mt-2 border-t pt-3" style={{ borderTopColor: 'var(--border-color)', borderTopStyle: 'solid', borderTopWidth: '1px' }}>
                    <button
                      onClick={() => handleLikePost(post.id)}
                      className="flex items-center gap-2 text-sm text-muted"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: isLiked ? '#ef4444' : 'var(--text-secondary)',
                        transition: 'all 0.2s'
                      }}
                      title={isLiked ? 'Unlike post' : 'Like post'}
                    >
                      <Heart size={16} color={isLiked ? '#ef4444' : 'currentColor'} fill={isLiked ? '#ef4444' : 'none'} />
                      <span style={{ fontWeight: isLiked ? 700 : 500, color: isLiked ? '#ef4444' : 'inherit' }}>
                        {post.likes_count || 0}
                      </span>
                    </button>

                    {authorId && !isMyPost ? (
                      <button
                        onClick={() => handleToggleFollow(authorId, author.full_name || 'Member')}
                        className="flex items-center gap-2 text-sm text-muted hover-text-primary"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: followingUserIds.has(authorId) 
                            ? 'var(--accent-secondary)' 
                            : sentRequestUserIds.has(authorId)
                            ? '#f59e0b'
                            : 'var(--text-secondary)',
                          transition: 'color 0.2s'
                        }}
                        title={
                          followingUserIds.has(authorId)
                            ? 'Connected / Following'
                            : sentRequestUserIds.has(authorId)
                            ? 'Connection request pending (Click to cancel)'
                            : 'Connect with musician'
                        }
                      >
                        {followingUserIds.has(authorId) ? (
                          <>
                            <Check size={16} color="#10b981" /> Connected
                          </>
                        ) : sentRequestUserIds.has(authorId) ? (
                          <>
                            <Clock size={16} color="#f59e0b" /> Requested
                          </>
                        ) : (
                          <>
                            <UserPlus size={16} /> Connect
                          </>
                        )}
                      </button>
                    ) : (
                      <Link
                        to="/network"
                        className="flex items-center gap-2 text-sm text-muted hover-text-primary"
                        style={{ textDecoration: 'none', color: 'var(--text-secondary)', transition: 'color 0.2s' }}
                      >
                        <MessageCircle size={16} /> Network
                      </Link>
                    )}

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
            <h3 className="text-sm font-bold mb-4 flex items-center justify-between m-0" style={{ marginBottom: '1rem' }}>
              Suggested Connections <Users size={14} className="text-muted" />
            </h3>

            <div className="flex-col gap-3.5" style={{ display: 'flex' }}>
              {/* Real Registered Members First */}
              {communityMembers.map(member => {
                const online = isUserOnline(member.id);
                return (
                  <div key={member.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative" style={{ position: 'relative', width: '40px', height: '40px', flexShrink: 0 }}>
                        <div className="w-10 h-10 rounded-full overflow-hidden" style={{ border: online ? '2px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border-color)', width: '100%', height: '100%' }}>
                          <img src={member.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop'} alt={member.full_name || 'Member'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <span 
                          title={online ? 'Online now' : 'Offline'}
                          style={{
                            position: 'absolute',
                            bottom: '0px',
                            right: '0px',
                            width: '11px',
                            height: '11px',
                            borderRadius: '50%',
                            background: online ? '#10b981' : '#64748b',
                            border: '2px solid var(--bg-dark)',
                            boxShadow: online ? '0 0 6px rgba(16, 185, 129, 0.8)' : 'none'
                          }}
                        />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold m-0 flex items-center gap-1">
                          {member.full_name || 'Member'}
                        </h4>
                        <p className="text-xs text-muted m-0 flex items-center gap-1">
                          <span style={{ color: online ? '#10b981' : 'var(--text-secondary)' }}>
                            {online ? 'Active now' : 'Offline'}
                          </span>
                          {member.location && ` • ${member.location}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleToggleFollow(member.id, member.full_name || 'Member')}
                        className={
                          followingUserIds.has(member.id) 
                            ? 'btn-secondary' 
                            : sentRequestUserIds.has(member.id)
                            ? 'btn-secondary'
                            : 'btn-primary'
                        }
                        style={{
                          padding: '0.3rem 0.65rem',
                          fontSize: '0.7rem',
                          borderRadius: 'var(--radius-full)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          cursor: 'pointer',
                          color: sentRequestUserIds.has(member.id) ? '#f59e0b' : undefined,
                          borderColor: sentRequestUserIds.has(member.id) ? 'rgba(245, 158, 11, 0.4)' : undefined
                        }}
                        title={
                          followingUserIds.has(member.id) 
                            ? 'Click to unfollow' 
                            : sentRequestUserIds.has(member.id)
                            ? 'Request pending (Click to cancel)'
                            : 'Connect and follow'
                        }
                      >
                        {followingUserIds.has(member.id) ? (
                          <>
                            <Check size={11} color="#10b981" /> Following
                          </>
                        ) : sentRequestUserIds.has(member.id) ? (
                          <>
                            <Clock size={11} color="#f59e0b" /> Requested
                          </>
                        ) : (
                          <>
                            <UserPlus size={11} /> Follow
                          </>
                        )}
                      </button>
                      <Link to="/network" className="w-7 h-7 rounded-full flex items-center justify-center btn-secondary" style={{ padding: 0 }} title="Message on Network">
                        <Users size={12} />
                      </Link>
                    </div>
                  </div>
                );
              })}

              {/* Sample Connections if few members registered */}
              {communityMembers.length < 3 && (
                <>
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
                </>
              )}
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
