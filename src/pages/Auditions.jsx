import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, Calendar as CalendarIcon, Clock, MapPin,  //icons
  Mic2, Plus, Lock, Globe, X, ChevronLeft, ChevronRight, 
  Check, MessageSquare, Sparkles, FileText, UserCheck, Star
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const INITIAL_AUDITIONS = [ //seed posts
  {
    id: 'a-1',
    role: 'Lead Touring Guitarist',
    production: 'Neon Mirage 2026 North American Tour',
    director: 'Marcus Bell (Music Director)',
    directorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop',
    date: '2026-09-15',
    time: '2:30 PM - 3:15 PM',
    location: 'Soundcheck Studios, Rehearsal Room B (Los Angeles, CA)',
    compensation: '$2,500/week on tour + per diem',
    visibility: 'private', // 'private' | 'public'
    status: 'scheduled',   // 'scheduled' | 'callback' | 'completed'
    requirements: 'Prepare live performance of the 2 single tracks provided in stems. Sight-reading test will follow.',
    materialsLink: 'https://m-o.app/materials/tour-stems.zip'
  },
  {
    id: 'a-2',
    role: 'First Chair Session Cellist',
    production: 'Echoes of the Forest (Feature Film Original Score)',
    director: 'Maya Lin (Film Composer)',
    directorAvatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=200&auto=format&fit=crop',
    date: '2026-09-22',
    time: '11:00 AM - 12:00 PM',
    location: 'Skyline Scoring Stage (Seattle, WA)',
    compensation: 'Union Scale ($145/hr AFM rate)',
    visibility: 'private',
    status: 'scheduled',
    requirements: 'Prepare solo theme movement in D minor. Demonstrates emotional vibrato control and clean dynamics.',
    materialsLink: 'https://m-o.app/materials/theme-sheet.pdf'
  },
  {
    id: 'a-3',
    role: 'R&B / Soul Backing Vocalists (Soprano & Alto)',
    production: 'Starlight Records Showcase & Recording Sessions',
    director: 'Amara Johnson (A&R Director)',
    directorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop',
    date: '2026-09-28',
    time: '4:00 PM - 6:30 PM',
    location: 'Open Studio Call • Track Room 1 (Chicago, IL)',
    compensation: '$400/session',
    visibility: 'public',
    status: 'callback',
    requirements: 'Open casting call for backing harmonies. Be prepared to blend tight 3-part vocal stacks on the spot.',
    materialsLink: 'https://m-o.app/materials/harmonies.mp3'
  },
  {
    id: 'a-4',
    role: 'Resident Keyboardist / Synth Designer',
    production: 'The Midnight City Residency 2026',
    director: 'Soren Lindqvist',
    directorAvatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=200&auto=format&fit=crop',
    date: '2026-10-05',
    time: '3:00 PM - 4:30 PM',
    location: 'Live Stream Remote Audition (HD Audio Room)',
    compensation: '$800/weekend show',
    visibility: 'public',
    status: 'scheduled',
    requirements: 'Demonstrate analog subtractive synth programming and proficiency with MIDI CC automation.',
    materialsLink: 'https://m-o.app/materials/patch-presets.syx'
  }
];

export default function AuditionsPage() {
  const { profile } = useAuth();

  const [auditions, setAuditions] = useState(INITIAL_AUDITIONS);
  const [selectedDate, setSelectedDate] = useState('2026-09-15');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'scheduled' | 'callback' | 'private' | 'public'
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // New Audition Form State
  const [newRole, setNewRole] = useState('');
  const [newProduction, setNewProduction] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newDate, setNewDate] = useState('2026-09-24');
  const [newTime, setNewTime] = useState('2:00 PM - 3:00 PM');
  const [newCompensation, setNewCompensation] = useState('');
  const [newVisibility, setNewVisibility] = useState('private'); // 'private' | 'public'
  const [newRequirements, setNewRequirements] = useState('');

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const filteredAuditions = useMemo(() => {
    return auditions.filter(a => {
      if (statusFilter === 'scheduled') return a.status === 'scheduled';
      if (statusFilter === 'callback') return a.status === 'callback';
      if (statusFilter === 'private') return a.visibility === 'private';
      if (statusFilter === 'public') return a.visibility === 'public';
      return true;
    });
  }, [auditions, statusFilter]);

  // Calendar dates representation for September 2026
  const calendarDays = useMemo(() => {
    const days = [];
    for (let i = 1; i <= 30; i++) {
      const dayStr = i < 10 ? `0${i}` : `${i}`;
      const dateString = `2026-09-${dayStr}`;
      const hasAudition = auditions.some(a => a.date === dateString);
      days.push({
        dayNum: i,
        dateString,
        hasAudition,
        auditionCount: auditions.filter(a => a.date === dateString).length
      });
    }
    return days;
  }, [auditions]);

  const handleCreateAudition = (e) => {
    e.preventDefault();
    if (!newRole.trim() || !newProduction.trim()) return;

    const newAudition = {
      id: `a-${Date.now()}`,
      role: newRole.trim(),
      production: newProduction.trim(),
      director: profile?.full_name || 'Casting Director',
      directorAvatar: profile?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop',
      date: newDate,
      time: newTime.trim() || 'TBD',
      location: newLocation.trim() || (profile?.location || 'Live Studio Call'),
      compensation: newCompensation.trim() || 'Competitive / Contracted Role',
      visibility: newVisibility,
      status: 'scheduled',
      requirements: newRequirements.trim() || 'Standard audition pieces. Arrive 15 minutes before your time slot.',
      materialsLink: 'https://m-o.app/materials'
    };

    setAuditions(prev => [newAudition, ...prev]);
    setSelectedDate(newDate);
    setIsCreateModalOpen(false);
    triggerToast(`Audition request published as ${newVisibility.toUpperCase()}!`);

    // Reset Form
    setNewRole('');
    setNewProduction('');
    setNewCompensation('');
    setNewRequirements('');
  };

  return (
    <div className="app-container" style={{ minHeight: '100vh', padding: '1.5rem 1rem', display: 'flex', justifyContent: 'center' }}>
      <div className="w-full" style={{ maxWidth: '900px' }}>

        {/* Toast Notification */}
        {toastMessage && (
          <div 
            style={{
              position: 'fixed',
              top: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: 'white',
              padding: '0.65rem 1.25rem',
              borderRadius: 'var(--radius-full)',
              boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)',
              zIndex: 9999,
              fontSize: '0.875rem',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Check size={16} /> {toastMessage}
          </div>
        )}

        {/* Top Header */}
        <div className="glass-panel p-4 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="btn-secondary flex items-center justify-center" style={{ padding: '0.5rem', borderRadius: '8px' }}>
              <ArrowLeft size={18} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="m-0" style={{ fontSize: '1.35rem' }}>Active Auditions</h1>
                <span 
                  className="px-2 py-0.5 rounded-full text-xs font-bold"
                  style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }}
                >
                  Roles & Casting
                </span>
              </div>
              <p className="text-xs text-muted m-0">Role applications, scheduled try-outs, and casting calls</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link 
              to="/bookings" 
              className="btn-secondary flex items-center gap-1.5"
              style={{ padding: '0.5rem 0.9rem', fontSize: '0.8rem', borderRadius: 'var(--radius-full)' }}
            >
              Switch to Bookings →
            </Link>
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="btn-primary flex items-center gap-1.5"
              style={{ 
                padding: '0.5rem 1rem', 
                fontSize: '0.825rem',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.39)'
              }}
            >
              <Plus size={16} /> New Audition Call
            </button>
          </div>
        </div>

        {/* Overview Banner Explaining Auditions */}
        <div className="glass-panel p-4 mb-4 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(59, 130, 246, 0.08))', borderColor: 'rgba(16, 185, 129, 0.25)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }}>
              <Mic2 size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold m-0">What are Auditions on M.O.?</h3>
              <p className="text-xs text-muted m-0" style={{ maxWidth: '640px' }}>
                Auditions occur when bands, musical directors, or casting producers ask artists to play to evaluate them for an open role. Auditions can be sent as <strong>Private</strong> (an invitation directly to a chosen artist in your network) or <strong>Public</strong> (an open casting call posted on the community feed).
              </p>
            </div>
          </div>
        </div>

        {/* Main Grid: Calendar on Left, Audition Items on Right */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '1rem' }}>
          
          {/* LEFT: Mini Calendar Widget */}
          <div className="glass-panel p-4 flex-col gap-3" style={{ display: 'flex' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarIcon size={18} color="#10b981" />
                <h3 className="text-sm font-bold m-0">September 2026</h3>
              </div>
              <div className="flex items-center gap-1 text-muted">
                <button className="btn-secondary" style={{ padding: '0.25rem 0.5rem', borderRadius: '4px' }}><ChevronLeft size={14} /></button>
                <button className="btn-secondary" style={{ padding: '0.25rem 0.5rem', borderRadius: '4px' }}><ChevronRight size={14} /></button>
              </div>
            </div>

            {/* Days of Week Header */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
            </div>

            {/* Calendar Days Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
              {/* Empty placeholder days for Sept 1 start (Tuesday) */}
              <div style={{ height: '36px' }}></div>
              <div style={{ height: '36px' }}></div>

              {calendarDays.map((d) => {
                const isSelected = selectedDate === d.dateString;
                return (
                  <button
                    key={d.dayNum}
                    onClick={() => setSelectedDate(d.dateString)}
                    style={{
                      height: '36px',
                      borderRadius: '8px',
                      border: isSelected ? '1px solid #10b981' : '1px solid transparent',
                      background: isSelected 
                        ? 'rgba(16, 185, 129, 0.25)' 
                        : (d.hasAudition ? 'rgba(255,255,255,0.06)' : 'transparent'),
                      color: isSelected ? 'white' : (d.hasAudition ? 'var(--text-primary)' : 'var(--text-secondary)'),
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: d.hasAudition ? 700 : 400,
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s'
                    }}
                  >
                    <span>{d.dayNum}</span>
                    {d.hasAudition && (
                      <span 
                        style={{ 
                          width: '4px', 
                          height: '4px', 
                          borderRadius: '50%', 
                          background: '#10b981',
                          boxShadow: '0 0 6px #10b981'
                        }} 
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-between border-t pt-3 mt-1" style={{ borderTopColor: 'var(--border-color)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <div className="flex items-center gap-1.5">
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                <span>Audition Slot</span>
              </div>
              <span>Total Auditions: {auditions.length}</span>
            </div>
          </div>

          {/* RIGHT: Auditions List & Filter */}
          <div className="flex-col gap-3" style={{ display: 'flex' }}>
            
            {/* Filter Chips */}
            <div className="flex gap-2" style={{ overflowX: 'auto', paddingBottom: '0.25rem' }}>
              {['all', 'scheduled', 'callback', 'private', 'public'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  style={{
                    background: statusFilter === tab ? '#10b981' : 'rgba(255,255,255,0.05)',
                    color: statusFilter === tab ? 'white' : 'var(--text-secondary)',
                    border: '1px solid var(--border-color)',
                    padding: '0.35rem 0.8rem',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Audition Cards */}
            {filteredAuditions.length === 0 ? (
              <div className="glass-panel p-4 text-center" style={{ padding: '3rem 1rem' }}>
                <Mic2 size={32} className="text-muted" style={{ margin: '0 auto 0.75rem auto', opacity: 0.4 }} />
                <h4 className="text-sm font-bold m-0">No auditions match this filter</h4>
                <p className="text-xs text-muted mt-1">Select another filter or create a new audition call.</p>
              </div>
            ) : (
              filteredAuditions.map((a) => (
                <div 
                  key={a.id}
                  className="glass-panel p-4 flex-col gap-3"
                  style={{ 
                    display: 'flex',
                    borderLeft: `4px solid ${a.status === 'callback' ? 'var(--accent-primary)' : '#10b981'}`
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span 
                          className="text-xs px-2 py-0.5 rounded-full font-semibold"
                          style={{
                            background: a.status === 'callback' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(16, 185, 129, 0.15)',
                            color: a.status === 'callback' ? 'var(--accent-primary)' : '#10b981'
                          }}
                        >
                          {a.status === 'callback' ? '★ Callback Requested' : 'Scheduled Audition'}
                        </span>

                        <span 
                          className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1 font-medium"
                          style={{
                            background: a.visibility === 'private' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                            color: a.visibility === 'private' ? 'var(--accent-primary)' : 'var(--accent-secondary)'
                          }}
                        >
                          {a.visibility === 'private' ? <Lock size={10} /> : <Globe size={10} />}
                          {a.visibility === 'private' ? 'Private Audition' : 'Public Call'}
                        </span>
                      </div>

                      <h3 className="font-bold text-base m-0">{a.role}</h3>
                      <p className="text-xs font-semibold text-muted m-0 mt-0.5" style={{ color: 'var(--text-primary)' }}>
                        {a.production}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="font-bold text-xs" style={{ color: '#10b981' }}>{a.compensation}</span>
                    </div>
                  </div>

                  {/* Date, Time & Studio Location */}
                  <div 
                    className="p-2.5 rounded-lg flex-col gap-1 text-xs"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex' }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-medium">
                        <CalendarIcon size={14} color="#10b981" /> {a.date}
                      </span>
                      <span className="flex items-center gap-1.5 text-muted">
                        <Clock size={14} /> {a.time}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted mt-0.5" style={{ fontSize: '0.725rem' }}>
                      <MapPin size={12} color="var(--text-secondary)" /> {a.location}
                    </div>
                  </div>

                  {/* Audition Requirements */}
                  {a.requirements && (
                    <div className="text-xs text-muted m-0 p-2 rounded" style={{ background: 'rgba(0,0,0,0.2)', border: '1px dashed var(--border-color)' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>Audition Material: </strong>
                      {a.requirements}
                    </div>
                  )}

                  {/* Casting Director & Actions */}
                  <div className="flex items-center justify-between pt-2 border-t" style={{ borderTopColor: 'var(--border-color)' }}>
                    <div className="flex items-center gap-2">
                      <img src={a.directorAvatar} alt={a.director} className="w-6 h-6 rounded-full" style={{ objectFit: 'cover' }} />
                      <span className="text-xs text-muted">{a.director}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link 
                        to="/network"
                        className="btn-secondary flex items-center gap-1"
                        style={{ padding: '0.3rem 0.65rem', fontSize: '0.725rem', borderRadius: '6px' }}
                      >
                        <MessageSquare size={12} /> Message
                      </Link>
                      <button 
                        onClick={() => triggerToast(`Confirmed attendance for ${a.role} audition!`)}
                        className="btn-primary flex items-center gap-1"
                        style={{ 
                          padding: '0.3rem 0.65rem', 
                          fontSize: '0.725rem', 
                          borderRadius: '6px',
                          background: 'linear-gradient(135deg, #10b981, #059669)'
                        }}
                      >
                        <UserCheck size={12} /> Confirm Slot
                      </button>
                    </div>
                  </div>

                </div>
              ))
            )}

          </div>
        </div>

        {/* CREATE AUDITION CALL MODAL (Private vs Public selection) */}
        {isCreateModalOpen && (
          <div 
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(8px)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem'
            }}
            onClick={() => setIsCreateModalOpen(false)}
          >
            <div 
              className="glass-panel"
              style={{
                width: '100%',
                maxWidth: '520px',
                padding: '1.5rem',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid rgba(255,255,255,0.15)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                maxHeight: '90vh',
                overflowY: 'auto'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b mb-4" style={{ borderBottomColor: 'var(--border-color)' }}>
                <div className="flex items-center gap-2">
                  <Mic2 size={18} color="#10b981" />
                  <h3 className="text-base font-bold m-0">Send Audition Request</h3>
                </div>
                <button 
                  onClick={() => setIsCreateModalOpen(false)}
                  className="btn-secondary flex items-center justify-center"
                  style={{ padding: '0.35rem', borderRadius: '50%' }}
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateAudition} className="flex-col gap-3.5" style={{ display: 'flex' }}>
                
                {/* Visibility Selection: Private vs Public */}
                <div className="flex-col gap-1.5" style={{ display: 'flex' }}>
                  <label className="text-xs font-bold text-muted">Audition Scope (Private vs Public)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    
                    {/* Private Option */}
                    <button
                      type="button"
                      onClick={() => setNewVisibility('private')}
                      style={{
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: newVisibility === 'private' ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                        background: newVisibility === 'private' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255,255,255,0.03)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs" style={{ color: 'var(--accent-primary)' }}>
                        <Lock size={13} /> Private Audition
                      </div>
                      <p className="text-xs text-muted m-0 mt-1" style={{ fontSize: '0.7rem' }}>
                        Invite an individual musician from your network to audition for a role.
                      </p>
                    </button>

                    {/* Public Option */}
                    <button
                      type="button"
                      onClick={() => setNewVisibility('public')}
                      style={{
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: newVisibility === 'public' ? '2px solid #10b981' : '1px solid var(--border-color)',
                        background: newVisibility === 'public' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.03)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs" style={{ color: '#10b981' }}>
                        <Globe size={13} /> Public Casting Call
                      </div>
                      <p className="text-xs text-muted m-0 mt-1" style={{ fontSize: '0.7rem' }}>
                        Post an open audition call to the feed for any artist to apply.
                      </p>
                    </button>

                  </div>
                </div>

                {/* Role Title */}
                <div className="flex-col gap-1" style={{ display: 'flex' }}>
                  <label className="text-xs font-bold text-muted">Role Being Cast *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Lead Session Guitarist, Touring Bassist, Vocalist"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    required
                    className="w-full"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.6rem 0.8rem', color: 'white', outline: 'none' }}
                  />
                </div>

                {/* Production / Band */}
                <div className="flex-col gap-1" style={{ display: 'flex' }}>
                  <label className="text-xs font-bold text-muted">Band, Production, or Project *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Album Recording Session / 2026 Festival Tour"
                    value={newProduction}
                    onChange={(e) => setNewProduction(e.target.value)}
                    required
                    className="w-full"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.6rem 0.8rem', color: 'white', outline: 'none' }}
                  />
                </div>

                {/* Date & Time */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div className="flex-col gap-1" style={{ display: 'flex' }}>
                    <label className="text-xs font-bold text-muted">Audition Date</label>
                    <input 
                      type="date" 
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.6rem 0.8rem', color: 'white', outline: 'none' }}
                    />
                  </div>
                  <div className="flex-col gap-1" style={{ display: 'flex' }}>
                    <label className="text-xs font-bold text-muted">Time Slot</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 2:00 PM - 3:00 PM"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="w-full"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.6rem 0.8rem', color: 'white', outline: 'none' }}
                    />
                  </div>
                </div>

                {/* Location & Compensation */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div className="flex-col gap-1" style={{ display: 'flex' }}>
                    <label className="text-xs font-bold text-muted">Studio / Stream Location</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Studio Room 2, Los Angeles or Zoom"
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      className="w-full"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.6rem 0.8rem', color: 'white', outline: 'none' }}
                    />
                  </div>
                  <div className="flex-col gap-1" style={{ display: 'flex' }}>
                    <label className="text-xs font-bold text-muted">Role Compensation</label>
                    <input 
                      type="text" 
                      placeholder="e.g. $2,000/week or Union Scale"
                      value={newCompensation}
                      onChange={(e) => setNewCompensation(e.target.value)}
                      className="w-full"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.6rem 0.8rem', color: 'white', outline: 'none' }}
                    />
                  </div>
                </div>

                {/* Requirements / Prepared Material */}
                <div className="flex-col gap-1" style={{ display: 'flex' }}>
                  <label className="text-xs font-bold text-muted">Pieces & Prepared Material</label>
                  <textarea 
                    rows="2"
                    placeholder="e.g. Prepare 2 contrasting pieces: 1 rhythm chart and 1 lead improvisation."
                    value={newRequirements}
                    onChange={(e) => setNewRequirements(e.target.value)}
                    className="w-full"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.6rem 0.8rem', color: 'white', outline: 'none', resize: 'vertical' }}
                  />
                </div>

                <div className="flex items-center justify-end gap-2 mt-2">
                  <button 
                    type="button" 
                    onClick={() => setIsCreateModalOpen(false)}
                    className="btn-secondary"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn-primary"
                    style={{ 
                      padding: '0.5rem 1.25rem', 
                      fontSize: '0.8rem',
                      background: 'linear-gradient(135deg, #10b981, #059669)'
                    }}
                  >
                    Publish Audition Request
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
