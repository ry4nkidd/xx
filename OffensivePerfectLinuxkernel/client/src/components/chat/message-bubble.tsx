import { ThumbsUp, Reply, Check, CheckCheck } from "lucide-react";
import type { MessageWithSender } from "@shared/schema";

interface MessageBubbleProps {
  message: MessageWithSender;
  isFromCurrentUser: boolean;
  showSender: boolean;
}

export default function MessageBubble({ message, isFromCurrentUser, showSender }: MessageBubbleProps) {
  const formatTime = (date: Date | null) => {
    if (!date) return "";
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

  const getStatusIcon = () => {
    switch (message.status) {
      case "sent":
        return <Check className="w-3 h-3 text-win-text-muted" />;
      case "delivered":
        return <CheckCheck className="w-3 h-3 text-win-success" />;
      case "read":
        return <CheckCheck className="w-3 h-3 text-win-accent" />;
      default:
        return null;
    }
  };

  if (isFromCurrentUser) {
    return (
      <div className="flex items-start space-x-3 justify-end animate-slide-up">
        <div className="flex-1 max-w-md">
          {showSender && (
            <div className="flex items-center justify-end space-x-2 mb-1">
              <span className="text-xs text-win-text-muted">{formatTime(message.timestamp)}</span>
              <span className="text-sm font-medium text-win-text">You</span>
            </div>
          )}
          <div className="bg-win-accent message-bubble rounded-2xl rounded-tr-sm px-4 py-3 ml-auto">
            <p className="text-white">{message.content}</p>
          </div>
          <div className="flex items-center justify-end mt-2 text-xs text-win-text-muted space-x-2">
            {getStatusIcon()}
            <span className="capitalize">{message.status}</span>
          </div>
        </div>
        <div className="w-8 h-8 bg-win-accent rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-semibold">
            {message.sender.avatar || getInitials(message.sender.displayName)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start space-x-3 animate-slide-up">
      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
        <span className="text-white text-xs font-semibold">
          {message.sender.avatar || getInitials(message.sender.displayName)}
        </span>
      </div>
      <div className="flex-1 max-w-md">
        {showSender && (
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-sm font-medium text-win-text">{message.sender.displayName}</span>
            <span className="text-xs text-win-text-muted">{formatTime(message.timestamp)}</span>
          </div>
        )}
        <div className="bg-win-surface message-bubble rounded-2xl rounded-tl-sm px-4 py-3">
          <p className="text-win-text">{message.content}</p>
        </div>
        <div className="flex items-center mt-2 text-xs text-win-text-muted space-x-4">
          <button className="hover:text-win-text transition-colors flex items-center space-x-1">
            <ThumbsUp className="w-3 h-3" />
            <span>0</span>
          </button>
          <button className="hover:text-win-text transition-colors">
            <Reply className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}