import { useState, useMemo, useRef, useEffect } from 'react';
import { Send, Search, Plus, X, Users, User, Hash } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getInitials, formatDate } from '../utils/helpers';
import { format } from 'date-fns';
import './Messages.css';

export default function Messages() {
  const { state, dispatch } = useApp();
  const { employees, currentUserId } = state;
  const conversations = state.conversations || [];
  const currentUser = employees.find((e) => e.id === currentUserId);
  const [activeConvId, setActiveConvId] = useState(null);
  const [search, setSearch] = useState('');
  const [messageText, setMessageText] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState('');
  const messagesEndRef = useRef(null);

  const activeConv = conversations.find((c) => c.id === activeConvId);

  const filteredConvs = useMemo(() => {
    return conversations.filter((c) => {
      if (!c.participantIds.includes(currentUserId)) return false;
      if (!search) return true;
      const otherNames = c.participantIds
        .filter((id) => id !== currentUserId)
        .map((id) => employees.find((e) => e.id === id)?.name || '')
        .join(' ');
      return otherNames.toLowerCase().includes(search.toLowerCase()) || (c.name || '').toLowerCase().includes(search.toLowerCase());
    }).sort((a, b) => {
      const aLast = a.messages?.length ? new Date(a.messages[a.messages.length - 1].timestamp) : new Date(0);
      const bLast = b.messages?.length ? new Date(b.messages[b.messages.length - 1].timestamp) : new Date(0);
      return bLast - aLast;
    });
  }, [conversations, currentUserId, search, employees]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConv?.messages?.length]);

  const getConversationName = (conv) => {
    if (conv.name) return conv.name;
    const others = conv.participantIds.filter((id) => id !== currentUserId).map((id) => employees.find((e) => e.id === id)?.name || 'Unknown');
    return others.join(', ');
  };

  const getConversationAvatar = (conv) => {
    if (conv.type === 'group') return <div className="msg-avatar msg-avatar--group"><Users size={18} /></div>;
    const otherId = conv.participantIds.find((id) => id !== currentUserId);
    const other = employees.find((e) => e.id === otherId);
    if (!other) return <div className="msg-avatar"><User size={18} /></div>;
    return <div className="msg-avatar" style={{ background: other.color }}>{getInitials(other.name)}</div>;
  };

  const getLastMessage = (conv) => {
    if (!conv.messages?.length) return 'No messages yet';
    const last = conv.messages[conv.messages.length - 1];
    const sender = last.senderId === currentUserId ? 'You' : (employees.find((e) => e.id === last.senderId)?.name?.split(' ')[0] || 'Unknown');
    return `${sender}: ${last.text.length > 40 ? last.text.slice(0, 40) + '...' : last.text}`;
  };

  const getUnreadCount = (conv) => {
    if (!conv.messages?.length) return 0;
    return conv.messages.filter((m) => m.senderId !== currentUserId && !m.readBy?.includes(currentUserId)).length;
  };

  const sendMessage = () => {
    if (!messageText.trim() || !activeConvId) return;
    dispatch({ type: 'SEND_MESSAGE', payload: { conversationId: activeConvId, senderId: currentUserId, text: messageText.trim() } });
    setMessageText('');
  };

  const startConversation = (employeeId) => {
    const existing = conversations.find((c) => c.type === 'direct' && c.participantIds.includes(currentUserId) && c.participantIds.includes(employeeId) && c.participantIds.length === 2);
    if (existing) {
      setActiveConvId(existing.id);
    } else {
      dispatch({ type: 'ADD_CONVERSATION', payload: { type: 'direct', participantIds: [currentUserId, employeeId], name: '' } });
      setTimeout(() => {
        const newConvs = state.conversations || [];
        const created = newConvs.find((c) => c.type === 'direct' && c.participantIds.includes(currentUserId) && c.participantIds.includes(employeeId));
        if (created) setActiveConvId(created.id);
      }, 50);
    }
    setShowNewChat(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const formatMessageTime = (timestamp) => {
    try { return format(new Date(timestamp), 'h:mm a'); } catch { return ''; }
  };

  const formatMessageDate = (timestamp) => {
    try { return format(new Date(timestamp), 'MMM d, yyyy'); } catch { return ''; }
  };

  const groupMessagesByDate = (messages) => {
    const groups = {};
    (messages || []).forEach((msg) => {
      const date = formatMessageDate(msg.timestamp);
      if (!groups[date]) groups[date] = [];
      groups[date].push(msg);
    });
    return groups;
  };

  return (
    <div className="messages-page">
      <div className="messages-layout">
        {/* Sidebar */}
        <div className={`messages-sidebar ${activeConvId ? 'messages-sidebar--hidden-mobile' : ''}`}>
          <div className="messages-sidebar__header">
            <h3>Messages</h3>
            <button className="btn-icon" onClick={() => setShowNewChat(true)}><Plus size={18} /></button>
          </div>
          <div className="messages-sidebar__search">
            <Search size={14} />
            <input type="text" placeholder="Search conversations..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="messages-sidebar__list">
            {filteredConvs.length === 0 ? (
              <div className="messages-empty-sidebar">
                <p>No conversations yet</p>
                <button className="btn btn-primary btn-sm" onClick={() => setShowNewChat(true)}>Start a Chat</button>
              </div>
            ) : (
              filteredConvs.map((conv) => {
                const unread = getUnreadCount(conv);
                return (
                  <div key={conv.id} className={`conv-item ${activeConvId === conv.id ? 'conv-item--active' : ''} ${unread > 0 ? 'conv-item--unread' : ''}`} onClick={() => { setActiveConvId(conv.id); dispatch({ type: 'MARK_MESSAGES_READ', payload: { conversationId: conv.id, userId: currentUserId } }); }}>
                    {getConversationAvatar(conv)}
                    <div className="conv-item__info">
                      <div className="conv-item__name">{getConversationName(conv)}</div>
                      <div className="conv-item__last">{getLastMessage(conv)}</div>
                    </div>
                    {unread > 0 && <span className="conv-item__badge">{unread}</span>}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`messages-chat ${!activeConvId ? 'messages-chat--hidden-mobile' : ''}`}>
          {!activeConv ? (
            <div className="messages-chat__empty">
              <Hash size={48} />
              <h3>Select a conversation</h3>
              <p>Choose from your existing conversations or start a new one</p>
            </div>
          ) : (
            <>
              <div className="messages-chat__header">
                <button className="btn-icon messages-back-btn" onClick={() => setActiveConvId(null)}><X size={18} /></button>
                {getConversationAvatar(activeConv)}
                <div>
                  <h4>{getConversationName(activeConv)}</h4>
                  <span className="messages-chat__participants">{activeConv.participantIds.length} participants</span>
                </div>
              </div>
              <div className="messages-chat__body">
                {Object.entries(groupMessagesByDate(activeConv.messages)).map(([date, msgs]) => (
                  <div key={date}>
                    <div className="messages-date-divider"><span>{date}</span></div>
                    {msgs.map((msg) => {
                      const isMe = msg.senderId === currentUserId;
                      const sender = employees.find((e) => e.id === msg.senderId);
                      return (
                        <div key={msg.id} className={`message ${isMe ? 'message--sent' : 'message--received'}`}>
                          {!isMe && (
                            <div className="message__avatar" style={{ background: sender?.color || 'var(--text-light)' }}>
                              {sender ? getInitials(sender.name) : '?'}
                            </div>
                          )}
                          <div className="message__content">
                            {!isMe && <div className="message__sender">{sender?.name || 'Unknown'}</div>}
                            <div className="message__bubble">{msg.text}</div>
                            <div className="message__time">{formatMessageTime(msg.timestamp)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <div className="messages-chat__input">
                <textarea value={messageText} onChange={(e) => setMessageText(e.target.value)} onKeyDown={handleKeyDown} placeholder="Type a message..." rows={1} />
                <button className="btn btn-primary btn-icon-round" onClick={sendMessage} disabled={!messageText.trim()}><Send size={18} /></button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="modal-overlay" onClick={() => setShowNewChat(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>New Message</h2>
              <button className="btn-icon" onClick={() => setShowNewChat(false)}><X size={20} /></button>
            </div>
            <div className="modal__body">
              <div className="form-group">
                <input type="text" placeholder="Search employees..." value={newChatSearch} onChange={(e) => setNewChatSearch(e.target.value)} />
              </div>
              <div className="new-chat-list">
                {employees.filter((e) => e.id !== currentUserId && (!newChatSearch || e.name.toLowerCase().includes(newChatSearch.toLowerCase()))).map((emp) => (
                  <div key={emp.id} className="new-chat-item" onClick={() => startConversation(emp.id)}>
                    <div className="msg-avatar" style={{ background: emp.color }}>{getInitials(emp.name)}</div>
                    <div>
                      <div className="new-chat-item__name">{emp.name}</div>
                      <div className="new-chat-item__role">{emp.roles?.join(', ')}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
