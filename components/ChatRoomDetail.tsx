import React, { useState, useEffect, useRef } from 'react';
import { ChatRoom, ChatMessage, User, Attachment } from '../types';
import UserPicker from './UserPicker';

interface ChatRoomDetailProps {
  currentUser: User;
  users: User[];
  room: ChatRoom;
  onSendMessage: (roomId: string, content: string, type: 'text' | 'system' | 'file' | 'image', attachment?: Attachment) => void;
  onInviteUser: (roomId: string, user: User) => void;
  onClose: () => void;
}

const ChatRoomDetail: React.FC<ChatRoomDetailProps> = ({ 
  currentUser, 
  users,
  room, 
  onSendMessage, 
  onInviteUser,
  onClose 
}) => {
  const [message, setMessage] = useState('');
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [room.messages]);

  const handleSend = () => {
    if (!message.trim()) return;
    onSendMessage(room.id, message, 'text');
    setMessage('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const isImage = file.type.startsWith('image/');
      
      const attachment: Attachment = {
        id: `att-${Date.now()}`,
        name: file.name,
        size: file.size,
        type: file.type,
        data: base64
      };

      onSendMessage(room.id, isImage ? '사진을 보냈습니다.' : '파일을 보냈습니다.', isImage ? 'image' : 'file', attachment);
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset input
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderTextWithLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, idx) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={`link-${idx}`}
            href={part}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 underline"
          >
            {part}
          </a>
        );
      }
      const lines = part.split('\n');
      return (
        <React.Fragment key={`text-${idx}`}>
          {lines.map((line, lineIdx) => (
            <React.Fragment key={`line-${idx}-${lineIdx}`}>
              {line}
              {lineIdx < lines.length - 1 ? <br /> : null}
            </React.Fragment>
          ))}
        </React.Fragment>
      );
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 border-l border-slate-200 shadow-xl flex-1 max-w-2xl min-w-[320px] overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          {room.participants.length > 2 ? (
            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-500 flex items-center justify-center text-lg font-bold">
              👥
            </div>
          ) : (
            <img 
              src={room.participants.find(p => p.id !== currentUser.id)?.avatar} 
              alt="" 
              className="w-10 h-10 rounded-full object-cover border border-slate-100" 
            />
          )}
          <div>
            <h3 className="font-bold text-slate-800 text-sm">
              {room.participants.length > 2 
                ? `${room.name} (${room.participants.length})` 
                : room.participants.find(p => p.id !== currentUser.id)?.name
              }
            </h3>
            <p className="text-[10px] text-slate-500 truncate max-w-[200px]">
              {room.participants.map(p => p.name).join(', ')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsInviteOpen(true)}
            className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg text-xs font-bold"
            title="초대하기"
          >
            + 초대
          </button>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg">✕</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {room.messages.map((msg, index) => {
          const isMe = msg.senderId === currentUser.id;
          const sender = room.participants.find(p => p.id === msg.senderId);
          const showAvatar = !isMe && (index === 0 || room.messages[index - 1].senderId !== msg.senderId);

          if (msg.type === 'system') {
            return (
              <div key={msg.id} className="flex justify-center my-2">
                <div className="bg-slate-100 text-slate-500 text-[10px] px-3 py-1 rounded-full text-center whitespace-pre-wrap max-w-[90%]">
                  {renderTextWithLinks(msg.content)}
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
              {!isMe && (
                <div className="w-8 flex-shrink-0">
                  {showAvatar && (
                    <img 
                      src={sender?.avatar} 
                      alt={sender?.name} 
                      className="w-8 h-8 rounded-full border border-slate-100 object-cover" 
                      title={sender?.name}
                    />
                  )}
                </div>
              )}
              
              <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                {!isMe && showAvatar && (
                  <span className="text-[10px] text-slate-500 mb-1 ml-1">{sender?.name}</span>
                )}
                
                {msg.type === 'image' && msg.attachment ? (
                  <div className="mb-1">
                    <img 
                      src={msg.attachment.data} 
                      alt={msg.attachment.name} 
                      className="max-w-[200px] max-h-[200px] rounded-xl border border-slate-200 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setPreviewImage(msg.attachment?.data || null)}
                    />
                  </div>
                ) : msg.type === 'file' && msg.attachment ? (
                  <div className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl mb-1 min-w-[200px]">
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-xl">
                      📄
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{msg.attachment.name}</p>
                      <p className="text-[10px] text-slate-500">{(msg.attachment.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <a 
                      href={msg.attachment.data} 
                      download={msg.attachment.name}
                      className="p-2 hover:bg-slate-100 rounded-lg text-blue-500"
                    >
                      ⬇️
                    </a>
                  </div>
                ) : (
                  <div 
                    className={`px-4 py-2 rounded-2xl text-sm leading-relaxed shadow-sm ${
                      isMe 
                        ? 'bg-blue-600 text-white rounded-tr-none' 
                        : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                    }`}
                  >
                    {msg.content}
                  </div>
                )}
                <span className="text-[10px] text-slate-400 mt-1 px-1">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-slate-200 flex-shrink-0">
        <input 
          type="file" 
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileUpload}
        />
        <div className="flex gap-2 items-end">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-3 text-slate-400 hover:text-blue-500 hover:bg-slate-50 rounded-xl transition-colors"
            title="파일 첨부"
          >
            📎
          </button>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none h-[46px] max-h-[120px] scrollbar-hide"
            rows={1}
          />
          <button 
            onClick={handleSend}
            disabled={!message.trim()}
            className={`px-4 py-3 rounded-xl font-bold text-sm transition-all ${
              message.trim() 
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-100' 
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            전송
          </button>
        </div>
      </div>

      {isInviteOpen && (
        <UserPicker 
          users={users}
          onClose={() => setIsInviteOpen(false)}
          onSelect={(user) => {
            onInviteUser(room.id, user);
            setIsInviteOpen(false);
          }}
          excludeIds={room.participants.map(p => p.id)}
        />
      )}

      {previewImage && (
        <div 
          className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-8 cursor-pointer animate-in fade-in duration-200"
          onClick={() => setPreviewImage(null)}
        >
          <img 
            src={previewImage} 
            alt="Preview" 
            className="max-w-full max-h-full rounded-lg shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button 
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatRoomDetail;
