import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, Users, ArrowLeft, MessageSquare, Circle, Check, X, 
  Sparkles, Music, MapPin, Send, MoreVertical, SlidersHorizontal,
  BellRing, UserPlus, PhoneCall, Radio, CheckCheck, Calendar, Mic2, Briefcase
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

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

export default function NetworkPage() {
  const { profile } = useAuth();

  const [contacts, setContacts] = useState(INITIAL_CONTACTS);
  const [requests, setRequests] = useState(INITIAL_REQUESTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'online' | 'unread' | 'requests'
  const [myPresence, setMyPresence] = useState('online'); // 'online' | 'offline'

  // Quick message modal / sheet state
  const [activeChatContact, setActiveChatContact] = useState(null);
  const [newMessageText, setNewMessageText] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Filter contacts by search query & tab
  const filteredContacts = useMemo(() => {
    return contacts.filter((contact) => {
      const matchesSearch = 
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.handle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.recentMessage.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.location.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (filterTab === 'online') return contact.isOnline;
      if (filterTab === 'unread') return contact.isUnread;

      return true;
    });
  }, [contacts, searchQuery, filterTab]);

  const onlineCount = useMemo(() => contacts.filter(c => c.isOnline).length, [contacts]);
  const unreadCount = useMemo(() => contacts.filter(c => c.isUnread).length, [contacts]);

  // Handle Accept Connection Request
  const handleAcceptRequest = (req) => {
    setRequests(prev => prev.filter(r => r.id !== req.id));

    // Convert request to a new contact
    const newContact = {
      id: `contact-${Date.now()}`,
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
      isSenderMe: false
    };

    setContacts(prev => [newContact, ...prev]);
    triggerToast(`Connected with ${req.name}! Added to your network.`);
  };

  // Handle Decline Connection Request
  const handleDeclineRequest = (reqId) => {
    setRequests(prev => prev.filter(r => r.id !== reqId));
    triggerToast('Connection request dismissed.');
  };

  // Toggle online status for a specific contact (demonstrates real-time presence capability)
  const toggleContactOnline = (e, contactId) => {
    e.stopPropagation();
    setContacts(prev => prev.map(c => {
      if (c.id === contactId) {
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

  // Send a quick message in the chat drawer
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessageText.trim() || !activeChatContact) return;

    const text = newMessageText.trim();

    setContacts(prev => prev.map(c => {
      if (c.id === activeChatContact.id) {
        return {
          ...c,
          recentMessage: `You: ${text}`,
          recentMessageTime: 'Just now',
          isUnread: false,
          unreadCount: 0,
          isSenderMe: true
        };
      }
      return c;
    }));

    setNewMessageText('');
    triggerToast(`Message sent to ${activeChatContact.name}`);
    setActiveChatContact(null);
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

        {/* CONTACTS LIST (INSTAGRAM DM / CONTACTS STYLE) */}
        {filterTab !== 'requests' && (
          <div className="glass-panel p-2">
            <div className="flex items-center justify-between p-3 border-b" style={{ borderBottomColor: 'var(--border-color)' }}>
              <span className="text-xs font-bold text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Known Contacts ({filteredContacts.length})
              </span>
              <span className="text-xs text-muted flex items-center gap-1">
                <Radio size={12} color="#10b981" /> Click online dot to test presence
              </span>
            </div>

            {filteredContacts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <Users size={36} className="text-muted" style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
                <h3 className="text-sm font-bold mb-1">No contacts found</h3>
                <p className="text-xs text-muted">
                  {searchQuery ? `No connections match "${searchQuery}"` : 'Your contact list is currently empty.'}
                </p>
              </div>
            ) : (
              <div className="flex-col" style={{ display: 'flex' }}>
                {filteredContacts.map((contact) => (
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
                          style={{ border: contact.isOnline ? '2px solid rgba(16, 185, 129, 0.4)' : '2px solid transparent' }}
                        >
                          <img 
                            src={contact.avatar} 
                            alt={contact.name} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          />
                        </div>

                        {/* Interactive Online Dot */}
                        <button
                          onClick={(e) => toggleContactOnline(e, contact.id)}
                          title={`Status: ${contact.isOnline ? 'Online now' : contact.lastSeen}. Click to toggle.`}
                          style={{
                            position: 'absolute',
                            bottom: '1px',
                            right: '1px',
                            width: '15px',
                            height: '15px',
                            borderRadius: '50%',
                            background: contact.isOnline ? '#10b981' : '#64748b',
                            border: '2.5px solid var(--bg-dark)',
                            boxShadow: contact.isOnline ? '0 0 8px rgba(16, 185, 129, 0.8)' : 'none',
                            cursor: 'pointer',
                            padding: 0
                          }}
                        />
                      </div>

                      {/* Contact Info & Recent Message */}
                      <div style={{ minWidth: 0 }}>
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 
                            className="text-sm font-bold m-0" 
                            style={{ 
                              color: 'var(--text-primary)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            {contact.name}
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

                    {/* Right side: Time & Status Badge */}
                    <div className="flex-col items-end gap-1.5 flex-shrink-0" style={{ display: 'flex', textAlign: 'right', marginLeft: '0.75rem' }}>
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
                        <span className="text-xs" style={{ fontSize: '0.7rem', color: contact.isOnline ? '#10b981' : 'var(--text-secondary)', opacity: 0.8 }}>
                          {contact.isOnline ? 'online' : ''}
                        </span>
                      )}
                    </div>

                  </div>
                ))}
              </div>
            )}
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
                        background: activeChatContact.isOnline ? '#10b981' : '#64748b',
                        border: '2px solid var(--bg-dark)'
                      }} 
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold m-0">{activeChatContact.name}</h3>
                    <p className="text-xs text-muted m-0 flex items-center gap-1">
                      {activeChatContact.isOnline ? (
                        <span style={{ color: '#10b981' }}>Active now</span>
                      ) : (
                        <span>{activeChatContact.lastSeen}</span>
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

              {/* Message History Mock */}
              <div 
                style={{
                  background: 'rgba(0,0,0,0.25)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  marginBottom: '1rem',
                  minHeight: '140px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  gap: '0.75rem'
                }}
              >
                <div style={{ alignSelf: 'flex-start', maxWidth: '80%', background: 'rgba(255,255,255,0.08)', padding: '0.6rem 0.9rem', borderRadius: '12px 12px 12px 2px', fontSize: '0.85rem' }}>
                  {activeChatContact.recentMessage.replace(/^You:\s*/, '')}
                  <span className="text-muted" style={{ display: 'block', fontSize: '0.65rem', marginTop: '0.2rem', textAlign: 'right' }}>
                    {activeChatContact.recentMessageTime} ago
                  </span>
                </div>
              </div>

              {/* Message Input Form */}
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input 
                  type="text"
                  placeholder={`Message ${activeChatContact.name.split(' ')[0]}...`}
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
                  disabled={!newMessageText.trim()}
                  className="btn-primary flex items-center justify-center"
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    padding: 0,
                    flexShrink: 0,
                    opacity: newMessageText.trim() ? 1 : 0.5,
                    cursor: newMessageText.trim() ? 'pointer' : 'not-allowed'
                  }}
                >
                  <Send size={16} />
                </button>
              </form>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
