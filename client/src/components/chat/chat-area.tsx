import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Phone, Video, MoreHorizontal, Users, Wifi, WifiOff } from "lucide-react";
import MessageBubble from "./message-bubble";
import MessageInput from "./message-input";
import { useWebSocket } from "@/hooks/use-websocket";
import type { ChatRoomWithDetails, User, MessageWithSender } from "@shared/schema";

interface ChatAreaProps {
  room: ChatRoomWithDetails;
  currentUser?: User;
}

export default function ChatArea({ room, currentUser }: ChatAreaProps) {
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [realtimeTypingUsers, setRealtimeTypingUsers] = useState<User[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch initial messages (no polling needed with WebSocket)
  const { data: fetchedMessages = [], isLoading } = useQuery({
    queryKey: ["/api/rooms", room.id, "messages"],
  });

  // Fallback polling for typing status (in case WebSocket is down)
  const { data: pollingTypingUsers = [] } = useQuery({
    queryKey: ["/api/rooms", room.id, "typing"],
    refetchInterval: 3000, // Reduced polling frequency
  });

  const { data: roomDetails } = useQuery({
    queryKey: ["/api/rooms", room.id],
    // No polling - will be updated via WebSocket user activity events
  });

  // WebSocket handlers
  const handleNewMessage = useCallback((message: MessageWithSender) => {
    setMessages(prev => {
      // Avoid duplicates
      if (prev.some(m => m.id === message.id)) return prev;
      return [...prev, message];
    });
    
    // Invalidate queries to keep cache in sync
    queryClient.invalidateQueries({ queryKey: ["/api/rooms", room.id, "messages"] });
    queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
  }, [room.id, queryClient]);

  const handleTypingStatus = useCallback(async (userId: string, isTyping: boolean) => {
    // Get user details from cache or API
    const user = await queryClient.fetchQuery({
      queryKey: ["/api/users", userId],
      queryFn: async () => {
        // For now, find user from room members
        const roomData = queryClient.getQueryData<any>(["/api/rooms", room.id]);
        return roomData?.members?.find((u: User) => u.id === userId);
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    });

    if (user && userId !== currentUser?.id) {
      setRealtimeTypingUsers(prev => {
        if (isTyping) {
          return prev.some(u => u.id === userId) ? prev : [...prev, user];
        } else {
          return prev.filter(u => u.id !== userId);
        }
      });
    }
  }, [room.id, currentUser?.id, queryClient]);

  const handleUserActivity = useCallback((userId: string, activity: 'joined' | 'left') => {
    // Invalidate room details to refresh member list
    queryClient.invalidateQueries({ queryKey: ["/api/rooms", room.id] });
  }, [room.id, queryClient]);

  // WebSocket connection
  const { connectionStatus, sendTypingStatus, broadcastNewMessage } = useWebSocket({
    roomId: room.id,
    currentUser,
    onNewMessage: handleNewMessage,
    onTypingStatus: handleTypingStatus,
    onUserActivity: handleUserActivity,
  });

  // Initialize messages from API (only once)
  useEffect(() => {
    if (fetchedMessages.length > 0 && messages.length === 0) {
      setMessages(fetchedMessages as MessageWithSender[]);
    }
  }, [fetchedMessages]); // Removed messages dependency to prevent infinite loop

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Combine realtime and polling typing users
  const typingUsers = connectionStatus === 'connected' 
    ? realtimeTypingUsers 
    : (pollingTypingUsers as User[]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const getRoomIcon = () => {
    if (room.avatar === "users") return Users;
    return Users;
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "Today";
    const today = new Date();
    const messageDate = new Date(date);
    
    if (messageDate.toDateString() === today.toDateString()) {
      return "Today";
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (messageDate.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }
    
    return messageDate.toLocaleDateString();
  };

  const Icon = getRoomIcon();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-win-dark">
        <div className="text-win-text">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-win-dark">
      {/* Chat Header */}
      <div className="bg-win-surface border-b border-win-panel p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-win-accent rounded-full flex items-center justify-center">
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-win-text">{room.name}</h2>
            <p className="text-sm text-win-text-dim flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              {roomDetails?.members?.length || room.members.length} members • {roomDetails?.onlineCount || room.onlineCount} online
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {/* Connection Status Indicator */}
          <div className="flex items-center space-x-2 px-3 py-1 rounded-lg bg-win-panel">
            {connectionStatus === 'connected' ? (
              <>
                <Wifi className="w-4 h-4 text-green-500" />
                <span className="text-xs text-win-text-dim">Live</span>
              </>
            ) : connectionStatus === 'connecting' ? (
              <>
                <Wifi className="w-4 h-4 text-yellow-500 animate-pulse" />
                <span className="text-xs text-win-text-dim">Connecting...</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-red-500" />
                <span className="text-xs text-win-text-dim">Offline</span>
              </>
            )}
          </div>
          
          <button className="p-2 hover:bg-win-panel rounded-lg transition-colors" title="Voice call">
            <Phone className="w-4 h-4 text-win-text-dim hover:text-win-text" />
          </button>
          <button className="p-2 hover:bg-win-panel rounded-lg transition-colors" title="Video call">
            <Video className="w-4 h-4 text-win-text-dim hover:text-win-text" />
          </button>
          <button className="p-2 hover:bg-win-panel rounded-lg transition-colors" title="More options">
            <MoreHorizontal className="w-4 h-4 text-win-text-dim hover:text-win-text" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto win-scrollbar p-4 space-y-4">
        {/* Date Separator */}
        {messages.length > 0 && (
          <div className="flex items-center justify-center my-6">
            <div className="px-3 py-1 bg-win-panel rounded-full text-xs text-win-text-dim">
              {formatDate(messages[0].timestamp)}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((message, index) => {
          const isFromCurrentUser = message.sender.id === currentUser?.id;
          const showSender = index === 0 || messages[index - 1].sender.id !== message.sender.id;
          
          return (
            <MessageBubble
              key={message.id}
              message={message}
              isFromCurrentUser={isFromCurrentUser}
              showSender={showSender}
            />
          );
        })}

        {/* Typing Indicators */}
        {typingUsers.map((user) => (
          <div key={user.id} className="flex items-start space-x-3 animate-fade-in">
            <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-semibold">
                {user.avatar || user.displayName.split(" ").map(n => n[0]).join("").toUpperCase()}
              </span>
            </div>
            <div className="flex-1 max-w-md">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-sm font-medium text-win-text">{user.displayName}</span>
                <span className="text-xs text-win-text-dim">typing...</span>
              </div>
              <div className="bg-win-surface message-bubble rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-win-text-dim rounded-full animate-bounce-typing"></div>
                  <div className="w-2 h-2 bg-win-text-dim rounded-full animate-bounce-typing" style={{ animationDelay: "0.2s" }}></div>
                  <div className="w-2 h-2 bg-win-text-dim rounded-full animate-bounce-typing" style={{ animationDelay: "0.4s" }}></div>
                </div>
              </div>
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Area */}
      <MessageInput 
        roomId={room.id} 
        currentUser={currentUser}
        onSendMessage={handleNewMessage}
        sendTypingStatus={sendTypingStatus}
        broadcastNewMessage={broadcastNewMessage}
      />
    </div>
  );
}
