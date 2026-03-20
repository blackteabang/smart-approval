import React, { useState } from 'react';
import { ChatRoom, User, ChatMessage } from '../types';
import UserPicker from './UserPicker';
import { formatUserNameWithPosition } from '../utils/userDisplay';

interface ChatRoomListProps {
  currentUser: User;
  users: User[]; // Add users prop for picker
  chatRooms: ChatRoom[];
  onSelectRoom: (roomId: string) => void;
  onCreateRoom: (participants: User[], name?: string) => void;
  activeRoomId?: string;
}

const ChatRoomList: React.FC<ChatRoomListProps> = ({ 
  currentUser, 
  users,
  chatRooms, 
  onSelectRoom, 
  onCreateRoom,
  activeRoomId
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState<User[]>([]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const startCreating = () => {
    setSelectedParticipants([]);
    setIsPickerOpen(true);
  };

  const handleSelectUser = (user: User) => {
    // In a real app, this would be a multi-select flow
    // For now, we'll just create a 1:1 chat or add to existing selection if we had multi-select UI
    const participants = [user, currentUser];
    let roomName = user.name;
    
    onCreateRoom(participants, roomName);
    setIsPickerOpen(false);
  };

  const getRoomDisplayName = (room: ChatRoom) => {
    if (room.participants.length <= 2) {
      const other = room.participants.find(p => p.id !== currentUser.id);
      return other ? formatUserNameWithPosition(other) : room.name;
    }
    return room.name;
  };

  const getRoomAvatar = (room: ChatRoom) => {
    if (room.participants.length <= 2) {
      const other = room.participants.find(p => p.id !== currentUser.id);
      return other?.avatar;
    }
    return null; // Use default group icon
  };

  return (
    <div className="flex flex-col h-full bg-white md:border-r border-slate-200 w-full md:w-80">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <h2 className="font-bold text-slate-800 text-lg">채팅 목록</h2>
        <button 
          onClick={startCreating}
          className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
          title="새 채팅"
        >
          ➕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {chatRooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center">
            <span className="text-4xl mb-2">💬</span>
            <p className="text-sm">대화방이 없습니다.<br/>새 채팅을 시작해보세요.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {chatRooms.sort((a, b) => new Date(b.lastMessageTime || 0).getTime() - new Date(a.lastMessageTime || 0).getTime()).map(room => (
              <div 
                key={room.id}
                onClick={() => onSelectRoom(room.id)}
                className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors flex gap-3 items-start relative ${activeRoomId === room.id ? 'bg-blue-50/50' : ''}`}
              >
                <div className="relative flex-shrink-0">
                  {getRoomAvatar(room) ? (
                    <img src={getRoomAvatar(room)} alt="" className="w-12 h-12 rounded-full border border-slate-200 object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-500 flex items-center justify-center text-xl font-bold border border-indigo-200">
                      👥
                    </div>
                  )}
                  {room.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                      {room.unreadCount}
                    </span>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="font-bold text-slate-900 truncate text-sm">{getRoomDisplayName(room)}</h3>
                    {room.lastMessageTime && (
                      <span className="text-[10px] text-slate-400 flex-shrink-0">
                        {new Date(room.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    {room.lastMessage || <span className="text-slate-300 italic">대화를 시작하세요</span>}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isPickerOpen && (
        <UserPicker 
          users={users} // Pass all users
          onClose={() => setIsPickerOpen(false)}
          onSelect={handleSelectUser}
          excludeIds={[currentUser.id]} 
        />
      )}
    </div>
  );
};

export default ChatRoomList;
