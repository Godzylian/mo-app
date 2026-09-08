import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const PresenceContext = createContext(null);

export function PresenceProvider({ children }) {
  const { user, profile } = useAuth();
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());
  const [myPresence, setMyPresenceState] = useState('online'); // 'online' | 'offline'
  const channelRef = useRef(null);
  const myPresenceRef = useRef('online');

  // Keep myPresenceRef in sync with state
  useEffect(() => {
    myPresenceRef.current = myPresence;
  }, [myPresence]);

  // Track or untrack user presence on the channel
  const syncSelfPresence = useCallback(async (channel, presenceStatus) => {
    if (!channel || !user) return;
    try {
      if (presenceStatus === 'online') {
        await channel.track({
          user_id: user.id,
          full_name: profile?.full_name || 'Member',
          avatar_url: profile?.avatar_url || '',
          online_at: new Date().toISOString()
        });
      } else {
        await channel.untrack();
      }
    } catch (err) {
      console.warn('[Presence] Failed to track/untrack presence:', err);
    }
  }, [user, profile?.full_name, profile?.avatar_url]);

  useEffect(() => {
    if (!user) {
      setOnlineUserIds(new Set());
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    // Connect to the global Supabase Realtime presence channel
    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: user.id
        }
      }
    });

    channelRef.current = channel;

    // Helper to refresh online set from presence state
    const updatePresenceFromState = () => {
      const state = channel.presenceState();
      const ids = new Set(Object.keys(state));
      // Always ensure self is marked online locally if myPresence is 'online'
      if (myPresenceRef.current === 'online' && user?.id) {
        ids.add(user.id);
      }
      setOnlineUserIds(ids);
    };

    channel
      .on('presence', { event: 'sync' }, () => {
        updatePresenceFromState();
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        setOnlineUserIds(prev => {
          const next = new Set(prev);
          next.add(key);
          return next;
        });
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setOnlineUserIds(prev => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          if (myPresenceRef.current === 'online') {
            await syncSelfPresence(channel, 'online');
          }
        }
      });

    // Handle tab close or page hide cleanly
    const handleUnload = () => {
      if (channelRef.current) {
        channelRef.current.untrack();
      }
    };

    // Re-verify presence when returning to tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && channelRef.current && myPresenceRef.current === 'online') {
        syncSelfPresence(channelRef.current, 'online');
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (channelRef.current) {
        channelRef.current.untrack();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id, profile?.full_name, profile?.avatar_url, syncSelfPresence]);

  // Toggle or explicitly set self presence ('online' | 'offline')
  const setMyPresence = useCallback(async (newStatus) => {
    const targetStatus = typeof newStatus === 'function' ? newStatus(myPresenceRef.current) : newStatus;
    setMyPresenceState(targetStatus);
    myPresenceRef.current = targetStatus;

    if (channelRef.current) {
      await syncSelfPresence(channelRef.current, targetStatus);
    }

    // Update local set immediately
    setOnlineUserIds(prev => {
      const next = new Set(prev);
      if (user?.id) {
        if (targetStatus === 'online') next.add(user.id);
        else next.delete(user.id);
      }
      return next;
    });
  }, [user?.id, syncSelfPresence]);

  // Helper function to check if a specific user ID is online
  const isUserOnline = useCallback((userId) => {
    if (!userId) return false;
    if (user && userId === user.id) {
      return myPresence === 'online';
    }
    return onlineUserIds.has(userId);
  }, [user, myPresence, onlineUserIds]);

  const value = {
    onlineUserIds,
    onlineCount: onlineUserIds.size,
    myPresence,
    setMyPresence,
    isUserOnline,
    channel: channelRef.current
  };

  return (
    <PresenceContext.Provider value={value}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresence() {
  const context = useContext(PresenceContext);
  if (!context) {
    return {
      onlineUserIds: new Set(),
      onlineCount: 0,
      myPresence: 'online',
      setMyPresence: () => {},
      isUserOnline: () => false,
      channel: null
    };
  }
  return context;
}
