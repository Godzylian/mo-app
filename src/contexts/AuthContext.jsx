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
        .single()
      
      if (error) {
        console.error('Error fetching profile:', error)
      } else {
        setProfile(data)
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
    if (!user) return { error: { message: 'Not logged in' } };
    
    if (user.id === 'dev-user-id') {
      setProfile(prev => ({ ...prev, ...updates }));
      return { error: null };
    }

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);
      
    if (!error) {
      setProfile(prev => ({ ...prev, ...updates }));
    }
    
    return { error };
  }

  // Developer Backdoor logic
  // This just manually sets a mock profile/user in state without hitting the database
  const devBackdoorLogin = () => {
    setUser({ id: 'dev-user-id', email: 'dev@m-o.app' })
    setProfile({
      id: 'dev-user-id',
      full_name: 'Alex Chen (Dev Mode)',
      role: 'Producer & Session Guitarist',
      connections_count: 1200,
      gigs_count: 14,
      avatar_url: 'https://i.pravatar.cc/150?img=11'
    })
    setLoading(false)
  }

  const value = {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    devBackdoorLogin
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
