import { 
  type User, 
  type InsertUser, 
  type ChatRoom, 
  type InsertChatRoom,
  type Message,
  type InsertMessage,
  type RoomMember,
  type InsertRoomMember,
  type TypingStatus,
  type InsertTypingStatus,
  type MessageWithSender,
  type ChatRoomWithDetails
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserOnlineStatus(id: string, isOnline: boolean): Promise<void>;
  
  // Chat rooms
  getChatRoom(id: string): Promise<ChatRoom | undefined>;
  getChatRoomsForUser(userId: string): Promise<ChatRoomWithDetails[]>;
  createChatRoom(room: InsertChatRoom): Promise<ChatRoom>;
  
  // Messages
  getMessages(roomId: string, limit?: number, offset?: number): Promise<MessageWithSender[]>;
  createMessage(message: InsertMessage): Promise<MessageWithSender>;
  updateMessageStatus(messageId: string, status: string): Promise<void>;
  
  // Room members
  addUserToRoom(roomMember: InsertRoomMember): Promise<RoomMember>;
  getRoomMembers(roomId: string): Promise<User[]>;
  isUserInRoom(userId: string, roomId: string): Promise<boolean>;
  
  // Typing status
  updateTypingStatus(typing: InsertTypingStatus): Promise<void>;
  getTypingUsers(roomId: string): Promise<User[]>;
  clearTypingStatus(userId: string, roomId: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private chatRooms: Map<string, ChatRoom> = new Map();
  private messages: Map<string, Message> = new Map();
  private roomMembers: Map<string, RoomMember> = new Map();
  private typingStatuses: Map<string, TypingStatus> = new Map();

  constructor() {
    this.initializeData();
  }

  private initializeData() {
    // Clean slate - no placeholder data
    // Users and chat rooms will be created through the API as needed
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      ...insertUser,
      id: randomUUID(),
      lastSeen: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async updateUserOnlineStatus(id: string, isOnline: boolean): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.isOnline = isOnline;
      user.lastSeen = new Date();
      this.users.set(id, user);
    }
  }

  async getChatRoom(id: string): Promise<ChatRoom | undefined> {
    return this.chatRooms.get(id);
  }

  async getChatRoomsForUser(userId: string): Promise<ChatRoomWithDetails[]> {
    const userRooms = Array.from(this.roomMembers.values())
      .filter(member => member.userId === userId)
      .map(member => member.roomId);

    const rooms = Array.from(this.chatRooms.values())
      .filter(room => userRooms.includes(room.id));

    const roomsWithDetails: ChatRoomWithDetails[] = [];

    for (const room of rooms) {
      const members = await this.getRoomMembers(room.id);
      const roomMessages = Array.from(this.messages.values())
        .filter(msg => msg.roomId === room.id)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      let lastMessage: MessageWithSender | undefined;
      if (roomMessages.length > 0) {
        const lastMsg = roomMessages[0];
        const sender = await this.getUser(lastMsg.senderId);
        if (sender) {
          lastMessage = { ...lastMsg, sender };
        }
      }

      const onlineCount = members.filter(member => member.isOnline).length;
      
      roomsWithDetails.push({
        ...room,
        members,
        lastMessage,
        unreadCount: 0, // TODO: Implement unread count logic
        onlineCount,
      });
    }

    return roomsWithDetails.sort((a, b) => {
      const aTime = a.lastMessage?.timestamp ? new Date(a.lastMessage.timestamp).getTime() : 0;
      const bTime = b.lastMessage?.timestamp ? new Date(b.lastMessage.timestamp).getTime() : 0;
      return bTime - aTime;
    });
  }

  async createChatRoom(insertRoom: InsertChatRoom): Promise<ChatRoom> {
    const room: ChatRoom = {
      ...insertRoom,
      id: randomUUID(),
      createdAt: new Date(),
    };
    this.chatRooms.set(room.id, room);
    return room;
  }

  async getMessages(roomId: string, limit = 50, offset = 0): Promise<MessageWithSender[]> {
    const roomMessages = Array.from(this.messages.values())
      .filter(msg => msg.roomId === roomId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .slice(offset, offset + limit);

    const messagesWithSenders: MessageWithSender[] = [];
    
    for (const message of roomMessages) {
      const sender = await this.getUser(message.senderId);
      if (sender) {
        messagesWithSenders.push({ ...message, sender });
      }
    }

    return messagesWithSenders;
  }

  async createMessage(insertMessage: InsertMessage): Promise<MessageWithSender> {
    const message: Message = {
      ...insertMessage,
      id: randomUUID(),
      timestamp: new Date(),
      status: "sent",
    };
    this.messages.set(message.id, message);

    const sender = await this.getUser(message.senderId);
    if (!sender) {
      throw new Error("Sender not found");
    }

    return { ...message, sender };
  }

  async updateMessageStatus(messageId: string, status: string): Promise<void> {
    const message = this.messages.get(messageId);
    if (message) {
      message.status = status;
      this.messages.set(messageId, message);
    }
  }

  async addUserToRoom(insertRoomMember: InsertRoomMember): Promise<RoomMember> {
    const roomMember: RoomMember = {
      ...insertRoomMember,
      id: randomUUID(),
      joinedAt: new Date(),
    };
    this.roomMembers.set(roomMember.id, roomMember);
    return roomMember;
  }

  async getRoomMembers(roomId: string): Promise<User[]> {
    const memberIds = Array.from(this.roomMembers.values())
      .filter(member => member.roomId === roomId)
      .map(member => member.userId);

    const members: User[] = [];
    for (const userId of memberIds) {
      const user = await this.getUser(userId);
      if (user) {
        members.push(user);
      }
    }

    return members;
  }

  async isUserInRoom(userId: string, roomId: string): Promise<boolean> {
    return Array.from(this.roomMembers.values())
      .some(member => member.userId === userId && member.roomId === roomId);
  }

  async updateTypingStatus(insertTyping: InsertTypingStatus): Promise<void> {
    const key = `${insertTyping.userId}-${insertTyping.roomId}`;
    const existing = this.typingStatuses.get(key);
    
    const typingStatus: TypingStatus = {
      id: existing?.id || randomUUID(),
      ...insertTyping,
      lastUpdate: new Date(),
    };
    
    this.typingStatuses.set(key, typingStatus);

    // Auto-clear typing status after 3 seconds
    setTimeout(() => {
      this.clearTypingStatus(insertTyping.userId, insertTyping.roomId);
    }, 3000);
  }

  async getTypingUsers(roomId: string): Promise<User[]> {
    const typingUserIds = Array.from(this.typingStatuses.values())
      .filter(status => 
        status.roomId === roomId && 
        status.isTyping && 
        Date.now() - new Date(status.lastUpdate).getTime() < 5000 // 5 seconds timeout
      )
      .map(status => status.userId);

    const users: User[] = [];
    for (const userId of typingUserIds) {
      const user = await this.getUser(userId);
      if (user) {
        users.push(user);
      }
    }

    return users;
  }

  async clearTypingStatus(userId: string, roomId: string): Promise<void> {
    const key = `${userId}-${roomId}`;
    this.typingStatuses.delete(key);
  }
}

export const storage = new MemStorage();
