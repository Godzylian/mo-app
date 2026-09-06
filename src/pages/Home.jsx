import {
  Home, Users, Briefcase, Calendar, Bell, MessageSquare,
  Settings as SettingsIcon, Music, Search, Heart, MessageCircle, Share2,
  MoreHorizontal, MapPin, Star, LogOut,
  HomeIcon
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

function HomePage() {
  const { profile, signOut } = useAuth();
  return (
    <>
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
          <button className="btn-primary flex items-center gap-2" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
            <Briefcase size={16} /> Post MO
          </button>
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
            <p className="text-sm text-muted mb-1">{profile?.role || 'Setting up profile...'}</p>

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
              <div>
                <p className="font-bold m-0">{profile?.connections_count || 0}</p>
                <p className="text-xs text-muted m-0">Connections</p>
              </div>
              <div>
                <p className="font-bold m-0">{profile?.gigs_count || 0}</p>
                <p className="text-xs text-muted m-0">Gigs</p>
              </div>
            </div>

            <nav className="flex-col w-full text-left gap-2" style={{ display: 'flex' }}>
              <Link to="/" className="flex items-center gap-3 p-2 rounded-md" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <Home size={18} className="text-muted" /> Home
              </Link>
              <Link to="/network" className="flex items-center gap-3 p-2 rounded-md hover-bg" style={{ transition: 'background 0.2s', ':hover': { background: 'rgba(255,255,255,0.05)' } }}>
                <Users size={18} className="text-muted" /> My Network
              </Link>
              <a href="#" className="flex items-center gap-3 p-2 rounded-md hover-bg">
                <Calendar size={18} className="text-muted" /> Active Bookings
              </a>
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

          {/* Create Post */}
          <div className="glass-panel p-4 flex gap-4 items-center">
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
              <img src={profile?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop'} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <input
              type="text"
              placeholder="Share a booking, audition, or update..."
              className="w-full"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-full)',
                padding: '0.75rem 1.5rem',
                color: 'var(--text-primary)',
                outline: 'none'
              }}
            />
          </div>

          {/* Feed Filter */}
          <div className="flex gap-4 border-b" style={{ borderBottomColor: 'var(--border-color)', paddingBottom: '0.5rem' }}>
            <button className="text-sm font-bold" style={{ color: 'var(--accent-primary)', borderBottom: '2px solid var(--accent-primary)', paddingBottom: '0.5rem', background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer' }}>All Updates</button>
            <button className="text-sm font-medium text-muted" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>Bookings</button>
            <button className="text-sm font-medium text-muted" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>Auditions</button>
          </div>

          {/* Post 1 */}
          <div className="glass-panel p-4 flex-col gap-3" style={{ display: 'flex' }}>
            <div className="flex justify-between items-start">
              <div className="flex gap-3 items-center">
                <div className="w-10 h-10 rounded-full overflow-hidden">
                  <img src="https://i.pravatar.cc/150?img=32" alt="Venue" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div>
                  <h3 className="font-bold text-sm m-0">The Echo Room <span className="text-xs font-normal text-muted px-2 py-0.5 rounded-full ml-2" style={{ background: 'rgba(59, 130, 246, 0.2)', color: 'var(--accent-secondary)' }}>Venue</span></h3>
                  <p className="text-xs text-muted m-0">Posted 2 hours ago • Austin, TX</p>
                </div>
              </div>
              <MoreHorizontal size={18} className="text-muted" style={{ cursor: 'pointer' }} />
            </div>

            <div className="mt-2">
              <h4 className="font-bold m-0" style={{ fontSize: '1rem' }}>Opening Act Needed for Friday Night! 🎸</h4>
              <p className="text-sm text-muted mt-1 m-0">We had a last-minute cancellation for this Friday's indie rock showcase. Looking for an acoustic or indie band to fill a 45-minute slot. Paid gig. Message for details!</p>
            </div>

            <div className="mt-2 rounded-lg overflow-hidden h-48 bg-gray-800" style={{ background: 'url(https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1000&auto=format&fit=crop) center/cover', minHeight: '200px', borderRadius: '8px' }}>
            </div>

            <div className="flex gap-4 mt-4 border-t pt-3" style={{ borderTopColor: 'var(--border-color)', borderTopStyle: 'solid', borderTopWidth: '1px' }}>
              <button className="flex items-center gap-2 text-sm text-muted hover-text-primary" style={{ background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }}><Heart size={16} /> 24</button>
              <button className="flex items-center gap-2 text-sm text-muted hover-text-primary" style={{ background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }}><MessageCircle size={16} /> 5</button>
              <button className="flex items-center gap-2 text-sm text-muted ml-auto hover-text-primary" style={{ background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }}><Share2 size={16} /></button>
            </div>
          </div>

          {/* Post 2 */}
          <div className="glass-panel p-4 flex-col gap-3" style={{ display: 'flex' }}>
            <div className="flex justify-between items-start">
              <div className="flex gap-3 items-center">
                <div className="w-10 h-10 rounded-full overflow-hidden">
                  <img src="https://i.pravatar.cc/150?img=5" alt="Teacher" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div>
                  <h3 className="font-bold text-sm m-0">Sarah Jenkins <span className="text-xs font-normal text-muted px-2 py-0.5 rounded-full ml-2" style={{ background: 'rgba(139, 92, 246, 0.2)', color: 'var(--accent-primary)' }}>Teacher</span></h3>
                  <p className="text-xs text-muted m-0">Posted 5 hours ago</p>
                </div>
              </div>
              <MoreHorizontal size={18} className="text-muted" style={{ cursor: 'pointer' }} />
            </div>

            <div className="mt-2">
              <p className="text-sm text-muted mt-1 m-0">Extremely proud of my student Marcus for his performance at the state recitals today. Hard work pays off! 🎹✨ Accepting 2 new intermediate piano students starting next month.</p>
            </div>

            <div className="flex gap-4 mt-4 border-t pt-3" style={{ borderTopColor: 'var(--border-color)', borderTopStyle: 'solid', borderTopWidth: '1px' }}>
              <button className="flex items-center gap-2 text-sm text-muted" style={{ background: 'none', border: 'none', cursor: 'pointer' }}><Heart size={16} color="var(--accent-primary)" fill="var(--accent-primary)" /> 112</button>
              <button className="flex items-center gap-2 text-sm text-muted" style={{ background: 'none', border: 'none', cursor: 'pointer' }}><MessageCircle size={16} /> 18</button>
              <button className="flex items-center gap-2 text-sm text-muted ml-auto" style={{ background: 'none', border: 'none', cursor: 'pointer' }}><Share2 size={16} /></button>
            </div>
          </div>

        </section>

        {/* RIGHT PANEL */}
        <aside className="right-panel flex-col gap-4" style={{ display: 'flex' }}>

          <div className="glass-panel p-4">
            <h3 className="text-sm font-bold mb-4 flex items-center justify-between m-0" style={{ marginBottom: '1rem' }}>Suggested Connections <Users size={14} className="text-muted" /></h3>

            <div className="flex-col gap-4" style={{ display: 'flex' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                    <img src="https://i.pravatar.cc/150?img=47" alt="Record Label" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold m-0">Vibe Records</h4>
                    <p className="text-xs text-muted m-0 flex items-center gap-1"><MapPin size={10} /> Los Angeles</p>
                  </div>
                </div>
                <button className="w-8 h-8 rounded-full flex items-center justify-center btn-secondary" style={{ padding: 0 }}><Users size={14} /></button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                    <img src="https://i.pravatar.cc/150?img=12" alt="Teacher" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold m-0">Dr. Eva Kim</h4>
                    <p className="text-xs text-muted m-0 flex items-center gap-1"><Star size={10} /> Juilliard Faculty</p>
                  </div>
                </div>
                <button className="w-8 h-8 rounded-full flex items-center justify-center btn-secondary" style={{ padding: 0 }}><Users size={14} /></button>
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

            <button className="w-full mt-4 text-sm font-medium p-2 rounded-md" style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>View All Events</button>
          </div>
        </aside>

      </main>
    </>
  );
}

export default HomePage;
