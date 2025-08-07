import { Search, Settings, Users, Code, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import type { ChatRoomWithDetails, User } from "@shared/schema";

interface SidebarProps {
  rooms: ChatRoomWithDetails[];
  selectedRoomId: string | null;
  onRoomSelect: (roomId: string) => void;
  currentUser?: User;
}

export default function Sidebar({ rooms, selectedRoomId, onRoomSelect, currentUser }: SidebarProps) {
  const { logout } = useAuth();
  const getRoomIcon = (room: ChatRoomWithDetails) => {
    if (room.avatar === "users") return Users;
    if (room.avatar === "code") return Code;
    return Users;
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(date));
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(word => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="w-80 bg-win-surface border-r border-win-panel flex flex-col">
      {/* User Profile Section */}
      <div className="p-4 border-b border-win-panel">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-win-accent rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-semibold">
              {currentUser ? getInitials(currentUser.displayName) : "U"}
            </span>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-win-text">
              {currentUser?.displayName || "User"}
            </h3>
            <p className="text-sm text-win-text-dim flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              Online
            </p>
          </div>
          <button className="p-2 hover:bg-win-panel rounded-lg transition-colors">
            <Settings className="w-4 h-4 text-win-text-dim hover:text-win-text" />
          </button>
          <button 
            onClick={() => logout()} 
            className="p-2 hover:bg-red-500/10 rounded-lg transition-colors group"
            title="Sign out"
          >
            <LogOut className="w-4 h-4 text-win-text-dim group-hover:text-red-400" />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-4 border-b border-win-panel">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-win-text-dim" />
          <input
            type="text"
            placeholder="Search conversations..."
            className="w-full bg-win-panel text-win-text placeholder-win-text-muted pl-10 pr-4 py-2 rounded-lg border border-transparent focus:border-win-accent focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Chat Rooms List */}
      <div className="flex-1 overflow-y-auto win-scrollbar">
        {rooms.map((room) => {
          const Icon = getRoomIcon(room);
          const isSelected = room.id === selectedRoomId;
          
          return (
            <div key={room.id} className="p-2">
              <div
                className={cn(
                  "p-3 rounded-lg cursor-pointer transition-colors group",
                  isSelected ? "bg-win-panel" : "hover:bg-win-panel"
                )}
                onClick={() => onRoomSelect(room.id)}
              >
                <div className="flex items-start space-x-3">
                  <div className="w-12 h-12 bg-win-accent rounded-full flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-win-text group-hover:text-white truncate">
                        {room.name}
                      </h4>
                      {room.lastMessage && room.lastMessage.timestamp && (
                        <span className="text-xs text-win-text-muted ml-2">
                          {formatTime(room.lastMessage.timestamp)}
                        </span>
                      )}
                    </div>
                    {room.lastMessage && (
                      <p className="text-sm text-win-text-dim truncate mt-1">
                        {room.lastMessage.sender.displayName}: {room.lastMessage.content}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 bg-win-success rounded-full"></span>
                        <span className="text-xs text-win-text-muted">
                          {room.members.length} members • {room.onlineCount} online
                        </span>
                      </div>
                      {room.unreadCount > 0 && (
                        <div className="w-5 h-5 bg-win-accent text-white text-xs rounded-full flex items-center justify-center">
                          {room.unreadCount}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
