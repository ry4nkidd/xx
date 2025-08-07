import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/chat/sidebar";
import ChatArea from "@/components/chat/chat-area";
import type { ChatRoomWithDetails, User } from "@shared/schema";

export default function ChatPage() {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const { data: rooms = [], isLoading } = useQuery<ChatRoomWithDetails[]>({
    queryKey: ["/api/rooms"],
    refetchInterval: 15000, // Reduced polling - WebSocket handles real-time updates
  });

  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/auth/me"],
  });

  // Auto-select first room if none selected
  useEffect(() => {
    if (!selectedRoomId && rooms.length > 0) {
      setSelectedRoomId(rooms[0].id);
    }
  }, [rooms, selectedRoomId]);

  const selectedRoom = rooms.find((room: ChatRoomWithDetails) => room.id === selectedRoomId);

  if (isLoading) {
    return (
      <div className="h-screen bg-win-dark flex items-center justify-center">
        <div className="text-win-text">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-win-dark flex overflow-hidden">
      <Sidebar 
        rooms={rooms}
        selectedRoomId={selectedRoomId}
        onRoomSelect={setSelectedRoomId}
        currentUser={currentUser}
      />
      {selectedRoom ? (
        <ChatArea 
          room={selectedRoom}
          currentUser={currentUser}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center bg-win-dark">
          <div className="text-win-text-dim">Select a chat room to start messaging</div>
        </div>
      )}
    </div>
  );
}
