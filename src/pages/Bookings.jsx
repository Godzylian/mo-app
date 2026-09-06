import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, Calendar as CalendarIcon, Clock, MapPin, DollarSign, 
  Briefcase, Plus, CheckCircle2, AlertCircle, Lock, Globe, X, 
  ChevronLeft, ChevronRight, Users, Check, MessageSquare, Sparkles
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const INITIAL_BOOKINGS = [
  {
    id: 'b-1',
    title: 'Friday Night Indie Showcase',
    venue: 'The Echo Room',
    location: 'Austin, TX',
    hostName: 'David K. (Booking Manager)',
    hostAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop',
    date: '2026-09-11',
    time: '8:30 PM - 10:45 PM',
    pay: '$750 Guaranteed',
    visibility: 'private', // 'private' | 'public'
    status: 'confirmed',   // 'confirmed' | 'pending' | 'completed'
    setDuration: '75 min slot',
    notes: 'Full backline provided (drums, amps). Soundcheck at 6:00 PM.'
  },
  {
    id: 'b-2',
    title: 'Sunset Rooftop Acoustic Set',
    venue: 'Skyline Lounge & Terrace',
    location: 'Los Angeles, CA',
    hostName: 'Vibe Hospitality Group',
    hostAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200&auto=format&fit=crop',
    date: '2026-09-18',
    time: '6:00 PM - 8:30 PM',
    pay: '$500 + tips',
    visibility: 'public',
    status: 'confirmed',
    setDuration: '2x 45 min sets',
    notes: 'Acoustic guitar and vocal setup. Intimate crowd of ~120 guests.'
  },
  {
    id: 'b-3',
    title: 'Downtown Jazz & Fusion Night',
    venue: 'Blue Note Bistro',
    location: 'New York, NY',
    hostName: 'Julian Thorne',
    hostAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop',
    date: '2026-09-25',
    time: '9:00 PM - 12:00 AM',
    pay: '$1,200 Band Fee',
    visibility: 'private',
    status: 'pending',
    setDuration: '3x 40 min sets',
    notes: 'Invited as lead guest guitarist. Requires chart reading.'
  },
  {
    id: 'b-4',
    title: 'Fall Arts & Music Festival Stage',
    venue: 'Civic Center Amphitheater',
    location: 'Nashville, TN',
    hostName: 'Tennessee Live Arts',
    hostAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop',
    date: '2026-10-03',
    time: '4:00 PM - 5:15 PM',
    pay: '$1,500 Festival Stipend',
    visibility: 'public',
    status: 'confirmed',
    setDuration: '60 min set',
    notes: 'Outdoor main stage. In-ear monitors and wireless system provided.'
  }
];

export default function BookingsPage() {
  const { profile } = useAuth();

  const [bookings, setBookings] = useState(INITIAL_BOOKINGS);
  const [selectedDate, setSelectedDate] = useState('2026-09-11');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'confirmed' | 'pending' | 'private' | 'public'
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // New Booking Form State
  const [newTitle, setNewTitle] = useState('');
  const [newVenue, setNewVenue] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newDate, setNewDate] = useState('2026-09-20');
  const [newTime, setNewTime] = useState('8:00 PM - 10:00 PM');
  const [newPay, setNewPay] = useState('');
  const [newVisibility, setNewVisibility] = useState('private'); // 'private' | 'public'
  const [newSetDuration, setNewSetDuration] = useState('60 mins');
  const [newNotes, setNewNotes] = useState('');

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      if (statusFilter === 'confirmed') return b.status === 'confirmed';
      if (statusFilter === 'pending') return b.status === 'pending';
      if (statusFilter === 'private') return b.visibility === 'private';
      if (statusFilter === 'public') return b.visibility === 'public';
      return true;
    });
  }, [bookings, statusFilter]);

  // Calendar dates representation for September 2026
  const calendarDays = useMemo(() => {
    const days = [];
    for (let i = 1; i <= 30; i++) {
      const dayStr = i < 10 ? `0${i}` : `${i}`;
      const dateString = `2026-09-${dayStr}`;
      const hasBooking = bookings.some(b => b.date === dateString);
      days.push({
        dayNum: i,
        dateString,
        hasBooking,
        bookingCount: bookings.filter(b => b.date === dateString).length
      });
    }
    return days;
  }, [bookings]);

  const handleCreateBooking = (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newVenue.trim()) return;

    const newBooking = {
      id: `b-${Date.now()}`,
      title: newTitle.trim(),
      venue: newVenue.trim(),
      location: newLocation.trim() || (profile?.location || 'Local Venue'),
      hostName: profile?.full_name || 'Event Host',
      hostAvatar: profile?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop',
      date: newDate,
      time: newTime.trim() || 'TBD',
      pay: newPay.trim() || 'Paid Gig',
      visibility: newVisibility,
      status: 'pending',
      setDuration: newSetDuration.trim() || '60 mins',
      notes: newNotes.trim()
    };

    setBookings(prev => [newBooking, ...prev]);
    setSelectedDate(newDate);
    setIsCreateModalOpen(false);
    triggerToast(`Booking created as ${newVisibility.toUpperCase()} request!`);

    // Reset Form
    setNewTitle('');
    setNewVenue('');
    setNewPay('');
    setNewNotes('');
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
                <h1 className="m-0" style={{ fontSize: '1.35rem' }}>Active Bookings</h1>
                <span 
                  className="px-2 py-0.5 rounded-full text-xs font-bold"
                  style={{ background: 'rgba(59, 130, 246, 0.2)', color: 'var(--accent-secondary)' }}
                >
                  Venues & Gigs
                </span>
              </div>
              <p className="text-xs text-muted m-0">Venue invitations, live performance calendar, and booking requests</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link 
              to="/auditions" 
              className="btn-secondary flex items-center gap-1.5"
              style={{ padding: '0.5rem 0.9rem', fontSize: '0.8rem', borderRadius: 'var(--radius-full)' }}
            >
              Switch to Auditions →
            </Link>
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="btn-primary flex items-center gap-1.5"
              style={{ padding: '0.5rem 1rem', fontSize: '0.825rem' }}
            >
              <Plus size={16} /> New Booking
            </button>
          </div>
        </div>

        {/* Overview Banner Explaining Bookings */}
        <div className="glass-panel p-4 mb-4 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(139, 92, 246, 0.08))', borderColor: 'rgba(59, 130, 246, 0.25)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(59, 130, 246, 0.2)', color: 'var(--accent-secondary)' }}>
              <Briefcase size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold m-0">What are Bookings on M.O.?</h3>
              <p className="text-xs text-muted m-0" style={{ maxWidth: '640px' }}>
                Bookings are direct invitations from venues, concert promoters, and hosts hiring artists to perform live. They can be dispatched as <strong>Private</strong> (direct to a contact in your network) or <strong>Public</strong> (published to the gig feed).
              </p>
            </div>
          </div>
        </div>

        {/* Main Grid: Calendar on Left, Booking Items on Right */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '1rem' }}>
          
          {/* LEFT: Mini Calendar Widget */}
          <div className="glass-panel p-4 flex-col gap-3" style={{ display: 'flex' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarIcon size={18} color="var(--accent-secondary)" />
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
                      border: isSelected ? '1px solid var(--accent-secondary)' : '1px solid transparent',
                      background: isSelected 
                        ? 'rgba(59, 130, 246, 0.25)' 
                        : (d.hasBooking ? 'rgba(255,255,255,0.06)' : 'transparent'),
                      color: isSelected ? 'white' : (d.hasBooking ? 'var(--text-primary)' : 'var(--text-secondary)'),
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: d.hasBooking ? 700 : 400,
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s'
                    }}
                  >
                    <span>{d.dayNum}</span>
                    {d.hasBooking && (
                      <span 
                        style={{ 
                          width: '4px', 
                          height: '4px', 
                          borderRadius: '50%', 
                          background: 'var(--accent-secondary)',
                          boxShadow: '0 0 6px var(--accent-secondary)'
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
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-secondary)' }} />
                <span>Scheduled Gig</span>
              </div>
              <span>Total Bookings: {bookings.length}</span>
            </div>
          </div>

          {/* RIGHT: Bookings List & Filter */}
          <div className="flex-col gap-3" style={{ display: 'flex' }}>
            
            {/* Filter Chips */}
            <div className="flex gap-2" style={{ overflowX: 'auto', paddingBottom: '0.25rem' }}>
              {['all', 'confirmed', 'pending', 'private', 'public'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  style={{
                    background: statusFilter === tab ? 'var(--accent-secondary)' : 'rgba(255,255,255,0.05)',
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

            {/* Booking Cards */}
            {filteredBookings.length === 0 ? (
              <div className="glass-panel p-4 text-center" style={{ padding: '3rem 1rem' }}>
                <CalendarIcon size={32} className="text-muted" style={{ margin: '0 auto 0.75rem auto', opacity: 0.4 }} />
                <h4 className="text-sm font-bold m-0">No bookings match this filter</h4>
                <p className="text-xs text-muted mt-1">Select another filter or click "New Booking" to create one.</p>
              </div>
            ) : (
              filteredBookings.map((b) => (
                <div 
                  key={b.id}
                  className="glass-panel p-4 flex-col gap-3"
                  style={{ 
                    display: 'flex',
                    borderLeft: `4px solid ${b.status === 'confirmed' ? 'var(--accent-secondary)' : '#f59e0b'}`
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span 
                          className="text-xs px-2 py-0.5 rounded-full font-semibold"
                          style={{
                            background: b.status === 'confirmed' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: b.status === 'confirmed' ? '#10b981' : '#f59e0b'
                          }}
                        >
                          {b.status === 'confirmed' ? 'Confirmed Gig' : 'Pending Review'}
                        </span>

                        <span 
                          className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1 font-medium"
                          style={{
                            background: b.visibility === 'private' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                            color: b.visibility === 'private' ? 'var(--accent-primary)' : 'var(--accent-secondary)'
                          }}
                        >
                          {b.visibility === 'private' ? <Lock size={10} /> : <Globe size={10} />}
                          {b.visibility === 'private' ? 'Private Booking' : 'Public Post'}
                        </span>
                      </div>

                      <h3 className="font-bold text-base m-0">{b.title}</h3>
                      <p className="text-xs text-muted m-0 flex items-center gap-1 mt-0.5">
                        <MapPin size={12} color="var(--accent-secondary)" /> {b.venue} • {b.location}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="font-bold text-sm" style={{ color: '#10b981' }}>{b.pay}</span>
                      <p className="text-xs text-muted m-0">{b.setDuration}</p>
                    </div>
                  </div>

                  {/* Date & Time details */}
                  <div 
                    className="p-2.5 rounded-lg flex items-center justify-between text-xs"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                  >
                    <span className="flex items-center gap-1.5 font-medium">
                      <CalendarIcon size={14} color="var(--accent-secondary)" /> {b.date}
                    </span>
                    <span className="flex items-center gap-1.5 text-muted">
                      <Clock size={14} /> {b.time}
                    </span>
                  </div>

                  {/* Notes / Backline */}
                  {b.notes && (
                    <p className="text-xs text-muted m-0" style={{ fontStyle: 'italic', opacity: 0.9 }}>
                      "{b.notes}"
                    </p>
                  )}

                  {/* Host info and actions */}
                  <div className="flex items-center justify-between pt-2 border-t" style={{ borderTopColor: 'var(--border-color)' }}>
                    <div className="flex items-center gap-2">
                      <img src={b.hostAvatar} alt={b.hostName} className="w-6 h-6 rounded-full" style={{ objectFit: 'cover' }} />
                      <span className="text-xs text-muted">{b.hostName}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link 
                        to="/network"
                        className="btn-secondary flex items-center gap-1"
                        style={{ padding: '0.3rem 0.65rem', fontSize: '0.725rem', borderRadius: '6px' }}
                      >
                        <MessageSquare size={12} /> Message
                      </Link>
                      {b.status === 'pending' && (
                        <button 
                          onClick={() => {
                            setBookings(prev => prev.map(item => item.id === b.id ? { ...item, status: 'confirmed' } : item));
                            triggerToast('Booking accepted and confirmed on calendar!');
                          }}
                          className="btn-primary"
                          style={{ padding: '0.3rem 0.65rem', fontSize: '0.725rem', borderRadius: '6px' }}
                        >
                          Accept Gig
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              ))
            )}

          </div>
        </div>

        {/* CREATE BOOKING REQUEST MODAL (Private vs Public selection) */}
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
                  <Briefcase size={18} color="var(--accent-secondary)" />
                  <h3 className="text-base font-bold m-0">Send Booking Request</h3>
                </div>
                <button 
                  onClick={() => setIsCreateModalOpen(false)}
                  className="btn-secondary flex items-center justify-center"
                  style={{ padding: '0.35rem', borderRadius: '50%' }}
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateBooking} className="flex-col gap-3.5" style={{ display: 'flex' }}>
                
                {/* Visibility Selection: Private vs Public */}
                <div className="flex-col gap-1.5" style={{ display: 'flex' }}>
                  <label className="text-xs font-bold text-muted">Booking Type (Private vs Public)</label>
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
                        <Lock size={13} /> Private Booking
                      </div>
                      <p className="text-xs text-muted m-0 mt-1" style={{ fontSize: '0.7rem' }}>
                        Invite a specific artist or contact directly through My Network.
                      </p>
                    </button>

                    {/* Public Option */}
                    <button
                      type="button"
                      onClick={() => setNewVisibility('public')}
                      style={{
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: newVisibility === 'public' ? '2px solid var(--accent-secondary)' : '1px solid var(--border-color)',
                        background: newVisibility === 'public' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.03)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs" style={{ color: 'var(--accent-secondary)' }}>
                        <Globe size={13} /> Public Post
                      </div>
                      <p className="text-xs text-muted m-0 mt-1" style={{ fontSize: '0.7rem' }}>
                        Post openly to the community feed for any musician to apply.
                      </p>
                    </button>

                  </div>
                </div>

                {/* Gig Title */}
                <div className="flex-col gap-1" style={{ display: 'flex' }}>
                  <label className="text-xs font-bold text-muted">Gig / Event Title *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Weekend Headliner Set"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                    className="w-full"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.6rem 0.8rem', color: 'white', outline: 'none' }}
                  />
                </div>

                {/* Venue & Location */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div className="flex-col gap-1" style={{ display: 'flex' }}>
                    <label className="text-xs font-bold text-muted">Venue Name *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. The Echo Room"
                      value={newVenue}
                      onChange={(e) => setNewVenue(e.target.value)}
                      required
                      className="w-full"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.6rem 0.8rem', color: 'white', outline: 'none' }}
                    />
                  </div>
                  <div className="flex-col gap-1" style={{ display: 'flex' }}>
                    <label className="text-xs font-bold text-muted">City / Location</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Austin, TX"
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      className="w-full"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.6rem 0.8rem', color: 'white', outline: 'none' }}
                    />
                  </div>
                </div>

                {/* Date & Time */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div className="flex-col gap-1" style={{ display: 'flex' }}>
                    <label className="text-xs font-bold text-muted">Date</label>
                    <input 
                      type="date" 
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.6rem 0.8rem', color: 'white', outline: 'none' }}
                    />
                  </div>
                  <div className="flex-col gap-1" style={{ display: 'flex' }}>
                    <label className="text-xs font-bold text-muted">Time / Slot</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 8:00 PM - 10:30 PM"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="w-full"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.6rem 0.8rem', color: 'white', outline: 'none' }}
                    />
                  </div>
                </div>

                {/* Compensation & Set Length */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div className="flex-col gap-1" style={{ display: 'flex' }}>
                    <label className="text-xs font-bold text-muted">Pay / Guarantee</label>
                    <input 
                      type="text" 
                      placeholder="e.g. $600 + Bar Tab"
                      value={newPay}
                      onChange={(e) => setNewPay(e.target.value)}
                      className="w-full"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.6rem 0.8rem', color: 'white', outline: 'none' }}
                    />
                  </div>
                  <div className="flex-col gap-1" style={{ display: 'flex' }}>
                    <label className="text-xs font-bold text-muted">Set Duration</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 2x 45 min sets"
                      value={newSetDuration}
                      onChange={(e) => setNewSetDuration(e.target.value)}
                      className="w-full"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.6rem 0.8rem', color: 'white', outline: 'none' }}
                    />
                  </div>
                </div>

                {/* Notes / Backline */}
                <div className="flex-col gap-1" style={{ display: 'flex' }}>
                  <label className="text-xs font-bold text-muted">Requirements & Backline Notes</label>
                  <textarea 
                    rows="2"
                    placeholder="e.g. Drums & PA provided. Bring own breakables and pedalboard."
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
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
                    style={{ padding: '0.5rem 1.25rem', fontSize: '0.8rem' }}
                  >
                    Send Booking Request
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
