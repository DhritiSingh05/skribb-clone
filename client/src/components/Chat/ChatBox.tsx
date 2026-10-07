import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, PlayerData } from '../../types';
import { Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { Avatar } from '../Avatar/Avatar';

interface ChatBoxProps {
  messages: ChatMessage[];
  currentPlayer: PlayerData | null;
  isDrawer: boolean;
  hasGuessed: boolean;
  onSendMessage: (text: string) => void;
}

export const ChatBox: React.FC<ChatBoxProps> = ({
  messages,
  currentPlayer,
  isDrawer,
  hasGuessed,
  onSendMessage,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setInputText('');
  };

  const getPlaceholder = () => {
    if (isDrawer) return "You are drawing! (Don't spoil)";
    if (hasGuessed) return 'You guessed the word! Chat here...';
    return 'Type your guess here...';
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-lg border-4 border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-800 text-white font-bold flex items-center justify-between">
        <span className="tracking-wide">Chat & Guesses</span>
        <span className="text-xs font-normal text-slate-300">
          {messages.length} messages
        </span>
      </div>

      {/* Message List */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2 bg-slate-50 text-sm">
        {messages.map((msg) => {
          if (msg.type === 'system') {
            return (
              <div
                key={msg.id}
                className="text-center py-1 px-3 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold border border-blue-100"
              >
                {msg.text}
              </div>
            );
          }

          if (msg.type === 'correct') {
            return (
              <div
                key={msg.id}
                className="p-2 bg-emerald-100 text-emerald-800 rounded-xl font-bold flex items-center gap-2 border border-emerald-300 shadow-sm animate-bounce-short"
              >
                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                <span>{msg.text}</span>
              </div>
            );
          }

          if (msg.type === 'close') {
            return (
              <div
                key={msg.id}
                className="p-2 bg-amber-100 text-amber-900 rounded-xl font-semibold flex items-center gap-2 border border-amber-300"
              >
                <AlertCircle size={16} className="text-amber-600 flex-shrink-0" />
                <span>{msg.text}</span>
              </div>
            );
          }

          if (msg.type === 'secret') {
            return (
              <div
                key={msg.id}
                className="flex items-start gap-2 p-1.5 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200"
              >
                {msg.avatar && <Avatar config={msg.avatar} size="xs" />}
                <div className="flex-1 leading-snug">
                  <span className="font-bold text-emerald-700 mr-1.5">{msg.playerName}:</span>
                  <span className="italic">{msg.text}</span>
                </div>
              </div>
            );
          }

          // Regular chat or guess message
          const isMe = msg.playerId === currentPlayer?.id;
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2 p-1.5 rounded-lg ${
                isMe ? 'bg-blue-50' : 'bg-white'
              } border border-slate-200`}
            >
              {msg.avatar && <Avatar config={msg.avatar} size="xs" />}
              <div className="flex-1 leading-snug break-words">
                <span className="font-bold text-slate-800 mr-1.5">{msg.playerName}:</span>
                <span className="text-slate-700">{msg.text}</span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSubmit}
        className="p-2.5 bg-white border-t-2 border-slate-200 flex items-center gap-2"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={getPlaceholder()}
          maxLength={100}
          className="flex-1 px-3.5 py-2.5 bg-slate-100 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 placeholder:text-slate-400 text-sm"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl shadow-md font-semibold transition-transform active:scale-95 flex items-center justify-center"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};
