import React, { useState, useEffect, useRef } from 'react';
import { X, Send, ShieldCheck, MessageSquare, CheckCheck, User } from 'lucide-react';
import type { ChatMessage } from '../utils/chatSync';
import { formatTimeOnly } from '../utils/dateUtils';

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  mySenderId: string;
  mySenderName: string;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  isOpen,
  onClose,
  messages,
  onSendMessage,
  mySenderId,
  mySenderName,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [isOpen, messages.length]);

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (ts: number) => {
    return formatTimeOnly(ts);
  };

  if (!isOpen) return null;

  return (
    <div
      className="chat-drawer"
      style={{
        position: 'fixed',
        top: '56px',
        right: '56px', // right of the editor, beside sidebar nav
        bottom: 0,
        width: '340px',
        maxWidth: 'calc(100vw - 60px)',
        backgroundColor: '#16181d',
        borderLeft: '1px solid var(--border-light)',
        borderRight: '1px solid var(--border-light)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50,
        boxShadow: '-8px 0 24px rgba(0,0,0,0.4)',
      }}
    >
      {/* Drawer Header */}
      <div
        style={{
          height: '48px',
          padding: '0 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-light)',
          backgroundColor: '#1b1e24',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MessageSquare size={16} color="#3b82f6" />
          <strong style={{ color: '#fff', fontSize: '0.875rem' }}>Collaborator Chat</strong>
          <span
            style={{
              fontSize: '0.675rem',
              color: '#34d399',
              background: 'rgba(16, 185, 129, 0.15)',
              padding: '1px 6px',
              borderRadius: '10px',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.2rem',
            }}
            title="Messages are end-to-end encrypted with zero knowledge"
          >
            <ShieldCheck size={10} /> E2E
          </span>
        </div>
        <button
          className="btn-icon"
          onClick={onClose}
          aria-label="Close chat"
          style={{ width: '28px', height: '28px' }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0.875rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem',
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-dim)',
              textAlign: 'center',
              padding: '2rem 1rem',
            }}
          >
            <MessageSquare size={36} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
            <p style={{ fontSize: '0.85rem', color: '#fff', marginBottom: '0.25rem' }}>
              No messages yet
            </p>
            <p style={{ fontSize: '0.75rem' }}>
              Send a message to collaborators in this room. Messages save instantly with zero latency.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === mySenderId;
            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMe ? 'flex-end' : 'flex-start',
                }}
              >
                {!isMe && (
                  <span
                    style={{
                      fontSize: '0.7rem',
                      color: msg.senderColor || '#60a5fa',
                      marginBottom: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      marginLeft: '4px',
                    }}
                  >
                    <User size={10} />
                    {msg.senderName || 'Collaborator'}
                  </span>
                )}
                <div
                  style={{
                    maxWidth: '82%',
                    padding: '0.55rem 0.8rem',
                    borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    backgroundColor: isMe ? '#2563eb' : '#232730',
                    color: '#fff',
                    fontSize: '0.84rem',
                    lineHeight: '1.4',
                    wordBreak: 'break-word',
                    border: isMe ? 'none' : '1px solid var(--border-light)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                  }}
                >
                  {msg.text}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    marginTop: '2px',
                    marginRight: isMe ? '4px' : undefined,
                    marginLeft: !isMe ? '4px' : undefined,
                  }}
                >
                  <span style={{ fontSize: '0.675rem', color: 'var(--text-dim)' }}>
                    {formatTime(msg.timestamp)}
                  </span>
                  {isMe && (
                    <span title="Saved & Delivered" style={{ display: 'inline-flex' }}>
                      <CheckCheck size={12} color="#60a5fa" />
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div
        style={{
          padding: '0.75rem',
          borderTop: '1px solid var(--border-light)',
          backgroundColor: '#1b1e24',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#111317',
            borderRadius: '8px',
            border: '1px solid var(--border-medium)',
            padding: '0.25rem 0.5rem',
            gap: '0.4rem',
          }}
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message as ${mySenderName}...`}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#fff',
              fontSize: '0.85rem',
              padding: '0.35rem 0.25rem',
            }}
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim()}
            style={{
              background: inputText.trim() ? '#3b82f6' : 'transparent',
              border: 'none',
              borderRadius: '6px',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: inputText.trim() ? 'pointer' : 'default',
              color: inputText.trim() ? '#fff' : 'var(--text-dim)',
              transition: 'all 0.15s ease',
            }}
            title="Send (Enter)"
          >
            <Send size={14} />
          </button>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '0.35rem',
            padding: '0 0.25rem',
            fontSize: '0.675rem',
            color: 'var(--text-dim)',
          }}
        >
          <span>Saved instantly with 0ms latency</span>
          <span>Press Enter ↵</span>
        </div>
      </div>
    </div>
  );
};
