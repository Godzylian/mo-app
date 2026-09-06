import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for changes on auth state (sign in, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      
      if (error) {
        console.error('Error fetching profile:', error.message)
      }
      
      if (data) {
        setProfile(data)
      } else {
        // Self-healing fallback: In case the database trigger has not run yet or for legacy users
        const { data: userData } = await supabase.auth.getUser()
        const fallbackProfile = {
          id: userId,
          full_name: userData?.user?.user_metadata?.full_name || 'Member',
          role: 'Musician',
          bio: '',
          connections_count: 0,
          gigs_count: 0,
          avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop'
        }
        
        // Attempt upsert safely
        const { data: upserted } = await supabase
          .from('profiles')
          .upsert(fallbackProfile)
          .select()
          .maybeSingle()

        setProfile(upserted || fallbackProfile)
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error)
    } finally {
      setLoading(false)
    }
  }

  // Helper functions
  const signIn = async (email, password) => {
    return supabase.auth.signInWithPassword({ email, password })
  }

  const signUp = async (email, password, fullName) => {
    return supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        }
      }
    })
  }

  const signOut = async () => {
    return supabase.auth.signOut()
  }

  const updateProfile = async (updates) => {
    if (!user) return { error: { message: 'Not authenticated' } };

    // Mass-assignment protection: Whitelist permitted fields only
    const allowedKeys = ['full_name', 'role', 'bio', 'avatar_url', 'location', 'website'];
    const payload = {};

    for (const key of allowedKeys) {
      if (key in updates && updates[key] !== undefined) {
        const val = updates[key];
        payload[key] = typeof val === 'string' ? val.trim() : val;
      }
    }

    if (Object.keys(payload).length === 0) {
      return { error: { message: 'No valid fields provided for update' } };
    }

    // Attempt saving. If the database schema lacks an optional column, automatically strip and retry.
    let workingPayload = { ...payload };
    let data = null;
    let error = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await supabase
        .from('profiles')
        .upsert({ id: user.id, ...workingPayload })
        .select()
        .maybeSingle();

      if (!res.error) {
        data = res.data || { id: user.id, ...workingPayload };
        error = null;
        break;
      }

      error = res.error;

      // Self-healing: if Supabase error is a missing schema column, strip it and retry
      const match = error.message?.match(/Could not find the '(.+?)' column/);
      if (match && match[1] && match[1] in workingPayload) {
        console.warn(`Supabase schema missing column '${match[1]}', retrying without it...`);
        delete workingPayload[match[1]];
      } else {
        break;
      }
    }

    if (!error) {
      const mergedProfile = { ...(profile || {}), ...payload, ...(data || {}) };
      setProfile(mergedProfile);

      // Synchronize full_name with auth user metadata if provided
      if (payload.full_name) {
        supabase.auth.updateUser({
          data: { full_name: payload.full_name }
        }).catch(err => console.warn('Could not sync user metadata:', err));
      }
    }

    return { error, data };
  }

  const value = {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  return useContext(AuthContext)
}
