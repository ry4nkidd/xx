import { useState, useRef, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Paperclip, Smile, Send, Zap, Mic } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User, MessageWithSender } from "@shared/schema";

interface MessageInputProps {
  roomId: string;
  currentUser?: User;
  onSendMessage?: (message: MessageWithSender) => void;
  sendTypingStatus?: (isTyping: boolean) => void;
  broadcastNewMessage?: (message: MessageWithSender) => void;
}

export default function MessageInput({ 
  roomId, 
  currentUser, 
  onSendMessage, 
  sendTypingStatus, 
  broadcastNewMessage 
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", `/api/rooms/${roomId}/messages`, {
        content,
      });
      return response.json();
    },
    onSuccess: (newMessage: MessageWithSender) => {
      // Broadcast message via WebSocket for real-time updates
      broadcastNewMessage?.(newMessage);
      
      queryClient.invalidateQueries({ queryKey: ["/api/rooms", roomId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      setMessage("");
      adjustTextareaHeight();
      
      // Call onSendMessage callback if provided
      onSendMessage?.(newMessage);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateTypingMutation = useMutation({
    mutationFn: async (typing: boolean) => {
      // Use WebSocket if available, fallback to API
      const success = sendTypingStatus?.(typing);
      if (!success) {
        await apiRequest("POST", `/api/rooms/${roomId}/typing`, {
          isTyping: typing,
        });
      }
    },
  });

  const adjustTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, []);

  const handleTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
      updateTypingMutation.mutate(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      updateTypingMutation.mutate(false);
    }, 3000);
  }, [isTyping, updateTypingMutation]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    adjustTextareaHeight();
    
    if (e.target.value.trim()) {
      handleTyping();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendMessage = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || sendMessageMutation.isPending) return;

    // Clear typing status immediately
    if (isTyping) {
      setIsTyping(false);
      updateTypingMutation.mutate(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }

    sendMessageMutation.mutate(trimmedMessage);
  };

  return (
    <div className="bg-win-surface border-t border-win-panel p-4">
      <div className="flex items-end space-x-3">
        <button className="p-2 hover:bg-win-panel rounded-lg transition-colors" title="Attach file">
          <Paperclip className="w-4 h-4 text-win-text-dim hover:text-win-text" />
        </button>
        
        <div className="flex-1 bg-win-panel rounded-2xl border border-transparent focus-within:border-win-accent transition-colors">
          <div className="flex items-end">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="flex-1 bg-transparent text-win-text placeholder-win-text-muted px-4 py-3 resize-none focus:outline-none max-h-32 min-h-[44px]"
              rows={1}
            />
            <button className="p-2 hover:bg-win-surface rounded-lg transition-colors mr-2" title="Add emoji">
              <Smile className="w-4 h-4 text-win-text-dim hover:text-win-text" />
            </button>
          </div>
        </div>

        <button
          onClick={handleSendMessage}
          disabled={!message.trim() || sendMessageMutation.isPending}
          className="bg-win-accent hover:bg-win-accent-hover text-white p-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Actions Bar */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-win-panel/50">
        <div className="flex items-center space-x-4 text-xs text-win-text-muted">
          <span className="flex items-center space-x-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span>{currentUser?.isOnline ? "Online" : "Offline"}</span>
          </span>
          <span>Last seen 2 minutes ago</span>
        </div>
        <div className="flex items-center space-x-2">
          <button className="px-3 py-1 text-xs text-win-text-dim hover:text-win-text hover:bg-win-panel rounded-lg transition-colors">
            <Zap className="w-3 h-3 mr-1 inline" />
            Quick reply
          </button>
          <button className="px-3 py-1 text-xs text-win-text-dim hover:text-win-text hover:bg-win-panel rounded-lg transition-colors">
            <Mic className="w-3 h-3 mr-1 inline" />
            Voice message
          </button>
        </div>
      </div>
    </div>
  );
}