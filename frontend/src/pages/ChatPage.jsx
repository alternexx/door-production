import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../lib/auth.jsx';
import { Send, MessageCircle, Hash } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || '';

const ROOMS = [
  { id: 'general',    label: 'General',        desc: 'Open chat for all users' },
  { id: 'listings',   label: 'Listings Help',  desc: 'Questions about apartments' },
  { id: 'qual',       label: 'Qualification',  desc: 'Verify income, credit, ID' },
  { id: 'brokers',    label: 'Broker Desk',    desc: 'Connect with a broker' },
];

export default function ChatPage() {
  const { user } = useAuth();
  const [activeRoom, setActiveRoom] = useState('general');
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [connected, setConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [error, setError] = useState('');
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimerRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  useEffect(() => {
    if (!user) return;

    const socket = io(API_BASE || window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setError('');
      socket.emit('join_room', {
        roomId: activeRoom,
        userId: user.id,
        userName: user.full_name || user.email.split('@')[0],
      });
    });

    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setError('Connection lost. Retrying…'));

    socket.on('message', (msg) => {
      setMessages(prev => {
        // Avoid duplicates
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    socket.on('user_joined', ({ userName }) => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'system',
        text: `${userName} joined the room`,
        created_at: new Date().toISOString(),
      }]);
    });

    socket.on('user_typing', ({ userName, isTyping }) => {
      setTypingUsers(prev => {
        const filtered = prev.filter(u => u !== userName);
        return isTyping ? [...filtered, userName] : filtered;
      });
    });

    return () => socket.disconnect();
  }, [user, activeRoom]);

  const switchRoom = (roomId) => {
    if (roomId === activeRoom) return;
    setMessages([]);
    setTypingUsers([]);
    const socket = socketRef.current;
    if (socket) {
      socket.emit('join_room', {
        roomId,
        userId: user.id,
        userName: user.full_name || user.email.split('@')[0],
      });
    }
    setActiveRoom(roomId);
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!text.trim() || !connected) return;

    const socket = socketRef.current;
    if (!socket) return;

    socket.emit('send_message', {
      roomId: activeRoom,
      senderId: user.id,
      senderName: user.full_name || user.email.split('@')[0],
      text: text.trim(),
    });

    setText('');
    socket.emit('typing', { roomId: activeRoom, userName: user.full_name || user.email.split('@')[0], isTyping: false });
  };

  const handleTyping = (e) => {
    setText(e.target.value);
    const socket = socketRef.current;
    if (!socket) return;

    const name = user.full_name || user.email.split('@')[0];
    socket.emit('typing', { roomId: activeRoom, userName: name, isTyping: true });

    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socket.emit('typing', { roomId: activeRoom, userName: name, isTyping: false });
    }, 2000);
  };

  const room = ROOMS.find(r => r.id === activeRoom);

  return (
    <div className="fade-in" style={{ height: 'calc(100vh - 120px)', display: 'flex', gap: 20 }}>
      {/* Room list */}
      <div style={{
        width: 220, flexShrink: 0,
        background: 'rgba(17,17,17,0.5)', borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.08)',
        padding: 12, display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        <div style={{ padding: '8px 12px', marginBottom: 4 }}>
          <h3 style={{ fontSize: 12, fontWeight: 700, color: 'rgba(245,245,247,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Rooms
          </h3>
        </div>
        {ROOMS.map(r => (
          <button
            key={r.id}
            onClick={() => switchRoom(r.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 12px', borderRadius: 10, border: 'none',
              background: activeRoom === r.id ? 'rgba(255,255,255,0.08)' : 'transparent',
              color: activeRoom === r.id ? '#f5f5f7' : 'rgba(245,245,247,0.45)',
              cursor: 'pointer', textAlign: 'left', width: '100%',
              transition: 'all 0.15s',
            }}
          >
            <Hash size={14} />
            <span style={{ fontSize: 13, fontWeight: activeRoom === r.id ? 600 : 400 }}>{r.label}</span>
          </button>
        ))}
      </div>

      {/* Chat area */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        background: 'rgba(17,17,17,0.5)', borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.08)',
        minWidth: 0,
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Hash size={16} color="rgba(245,245,247,0.5)" />
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{room?.label}</div>
              <div style={{ fontSize: 12, color: 'rgba(245,245,247,0.35)' }}>{room?.desc}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: connected ? '#30d158' : '#ff453a',
            }} />
            <span style={{ fontSize: 12, color: 'rgba(245,245,247,0.35)' }}>
              {connected ? 'Live' : 'Connecting…'}
            </span>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.length === 0 && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, opacity: 0.4 }}>
              <MessageCircle size={36} />
              <p style={{ fontSize: 14 }}>No messages yet. Say hello!</p>
            </div>
          )}

          {messages.map((msg) => {
            const isOwn = msg.sender_id === user?.id;
            const isSystem = msg.type === 'system';

            if (isSystem) {
              return (
                <div key={msg.id} style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: 11, color: 'rgba(245,245,247,0.25)', background: 'rgba(255,255,255,0.04)', padding: '3px 10px', borderRadius: 100 }}>
                    {msg.text}
                  </span>
                </div>
              );
            }

            return (
              <div key={msg.id} style={{ display: 'flex', flexDirection: isOwn ? 'row-reverse' : 'row', gap: 10, alignItems: 'flex-end' }}>
                {!isOwn && (
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, #0071e3, #30d158)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700,
                  }}>
                    {(msg.sender_name || '?')[0].toUpperCase()}
                  </div>
                )}
                <div style={{ maxWidth: '70%', display: 'flex', flexDirection: 'column', gap: 3, alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
                  {!isOwn && (
                    <span style={{ fontSize: 11, color: 'rgba(245,245,247,0.35)', paddingLeft: 4 }}>
                      {msg.sender_name}
                    </span>
                  )}
                  <div style={{
                    padding: '10px 14px', borderRadius: isOwn ? '18px 18px 6px 18px' : '18px 18px 18px 6px',
                    background: isOwn ? '#0071e3' : 'rgba(255,255,255,0.08)',
                    color: '#f5f5f7', fontSize: 14, lineHeight: 1.5,
                    wordBreak: 'break-word',
                  }}>
                    {msg.text}
                  </div>
                  <span style={{ fontSize: 10, color: 'rgba(245,245,247,0.2)', paddingLeft: 4, paddingRight: 4 }}>
                    {new Date(msg.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })}

          {typingUsers.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', gap: 3 }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{
                    width: 5, height: 5, borderRadius: '50%',
                    background: 'rgba(245,245,247,0.4)',
                    animation: `pulse 1.2s ${i*0.2}s infinite`,
                  }} />
                ))}
              </div>
              <span style={{ fontSize: 12, color: 'rgba(245,245,247,0.35)' }}>
                {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing…
              </span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          {error && (
            <p style={{ fontSize: 12, color: '#ff453a', marginBottom: 8 }}>{error}</p>
          )}
          <form onSubmit={sendMessage} style={{ display: 'flex', gap: 10 }}>
            <input
              value={text}
              onChange={handleTyping}
              placeholder={connected ? `Message #${room?.label}…` : 'Connecting…'}
              disabled={!connected}
              className="form-input"
              style={{ flex: 1, borderRadius: 10 }}
              maxLength={1000}
            />
            <button
              type="submit"
              disabled={!text.trim() || !connected}
              className="btn btn-primary btn-icon"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
