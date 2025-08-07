import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertMessageSchema, insertUserSchema, insertTypingStatusSchema } from "@shared/schema";
import { z } from "zod";

// Simple session storage (in production, use proper session management)
const userSessions = new Map<string, string>(); // sessionId -> userId

export async function registerRoutes(app: Express): Promise<Server> {
  // Login endpoint
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      // Create session
      const sessionId = `session_${Date.now()}_${Math.random()}`;
      userSessions.set(sessionId, user.id);
      
      // Update user online status
      await storage.updateUserOnlineStatus(user.id, true);
      
      res.json({ ...user, sessionId });
    } catch (error) {
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Signup endpoint
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { username, displayName, password, confirmPassword } = req.body;
      
      if (!username || !displayName || !password) {
        return res.status(400).json({ message: "All fields are required" });
      }
      
      if (password !== confirmPassword) {
        return res.status(400).json({ message: "Passwords do not match" });
      }
      
      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }
      
      // Create user with password
      const newUser = await storage.createUser({
        username,
        displayName,
        password,
        avatar: displayName.slice(0, 2).toUpperCase(),
        isOnline: true,
      });
      
      // Create session
      const sessionId = `session_${Date.now()}_${Math.random()}`;
      userSessions.set(sessionId, newUser.id);
      
      // Create a welcome room for new user
      const welcomeRoom = await storage.createChatRoom({
        name: "Welcome",
        description: "Your first chat room",
        avatar: "users",
        type: "group",
      });
      
      await storage.addUserToRoom({
        userId: newUser.id,
        roomId: welcomeRoom.id,
      });
      
      res.json({ ...newUser, sessionId });
    } catch (error) {
      res.status(500).json({ message: "Signup failed" });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", async (req, res) => {
    try {
      const { sessionId } = req.body;
      
      if (sessionId && userSessions.has(sessionId)) {
        const userId = userSessions.get(sessionId);
        if (userId) {
          await storage.updateUserOnlineStatus(userId, false);
        }
        userSessions.delete(sessionId);
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Logout failed" });
    }
  });

  // Get current user using session
  app.get("/api/auth/me", async (req, res) => {
    try {
      const sessionId = req.headers['authorization']?.replace('Bearer ', '');
      
      if (!sessionId || !userSessions.has(sessionId)) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const userId = userSessions.get(sessionId);
      if (!userId) {
        return res.status(401).json({ message: "Invalid session" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        userSessions.delete(sessionId);
        return res.status(401).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // Get chat rooms for current user
  app.get("/api/rooms", async (req, res) => {
    try {
      const user = await storage.getUserByUsername("current_user");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const rooms = await storage.getChatRoomsForUser(user.id);
      res.json(rooms);
    } catch (error) {
      res.status(500).json({ message: "Failed to get chat rooms" });
    }
  });

  // Get messages for a room
  app.get("/api/rooms/:roomId/messages", async (req, res) => {
    try {
      const { roomId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const user = await storage.getUserByUsername("current_user");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user is in room
      const isInRoom = await storage.isUserInRoom(user.id, roomId);
      if (!isInRoom) {
        return res.status(403).json({ message: "Access denied" });
      }

      const messages = await storage.getMessages(roomId, limit, offset);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to get messages" });
    }
  });

  // Send a message
  app.post("/api/rooms/:roomId/messages", async (req, res) => {
    try {
      const { roomId } = req.params;
      
      const user = await storage.getUserByUsername("current_user");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user is in room
      const isInRoom = await storage.isUserInRoom(user.id, roomId);
      if (!isInRoom) {
        return res.status(403).json({ message: "Access denied" });
      }

      const messageData = insertMessageSchema.parse({
        ...req.body,
        senderId: user.id,
        roomId,
      });

      const message = await storage.createMessage(messageData);
      
      // Simulate message delivery after a short delay
      setTimeout(async () => {
        await storage.updateMessageStatus(message.id, "delivered");
      }, 1000);

      res.json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid message data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Update typing status
  app.post("/api/rooms/:roomId/typing", async (req, res) => {
    try {
      const { roomId } = req.params;
      
      const user = await storage.getUserByUsername("current_user");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user is in room
      const isInRoom = await storage.isUserInRoom(user.id, roomId);
      if (!isInRoom) {
        return res.status(403).json({ message: "Access denied" });
      }

      const typingData = insertTypingStatusSchema.parse({
        userId: user.id,
        roomId,
        isTyping: req.body.isTyping ?? true,
      });

      await storage.updateTypingStatus(typingData);
      res.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid typing data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update typing status" });
    }
  });

  // Get typing users for a room
  app.get("/api/rooms/:roomId/typing", async (req, res) => {
    try {
      const { roomId } = req.params;
      
      const user = await storage.getUserByUsername("current_user");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user is in room
      const isInRoom = await storage.isUserInRoom(user.id, roomId);
      if (!isInRoom) {
        return res.status(403).json({ message: "Access denied" });
      }

      const typingUsers = await storage.getTypingUsers(roomId);
      res.json(typingUsers.filter(u => u.id !== user.id)); // Exclude current user
    } catch (error) {
      res.status(500).json({ message: "Failed to get typing users" });
    }
  });

  // Get room details
  app.get("/api/rooms/:roomId", async (req, res) => {
    try {
      const { roomId } = req.params;
      
      const user = await storage.getUserByUsername("current_user");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user is in room
      const isInRoom = await storage.isUserInRoom(user.id, roomId);
      if (!isInRoom) {
        return res.status(403).json({ message: "Access denied" });
      }

      const room = await storage.getChatRoom(roomId);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }

      const members = await storage.getRoomMembers(roomId);
      const onlineCount = members.filter(member => member.isOnline).length;

      res.json({
        ...room,
        members,
        onlineCount,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get room details" });
    }
  });

  const httpServer = createServer(app);
  
  // Add WebSocket server for real-time communication
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store connected clients by room ID
  const roomClients = new Map<string, Set<WebSocket>>();
  
  wss.on('connection', (ws) => {
    let currentRoomId: string | null = null;
    let currentUserId: string | null = null;
    
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'join_room':
            // Leave previous room if any
            if (currentRoomId && roomClients.has(currentRoomId)) {
              roomClients.get(currentRoomId)?.delete(ws);
            }
            
            // Join new room
            currentRoomId = message.roomId;
            currentUserId = message.userId;
            
            if (!roomClients.has(currentRoomId)) {
              roomClients.set(currentRoomId, new Set());
            }
            roomClients.get(currentRoomId)?.add(ws);
            
            // Broadcast user joined
            broadcast(currentRoomId, {
              type: 'user_joined',
              userId: currentUserId,
              roomId: currentRoomId
            }, ws);
            break;
            
          case 'new_message':
            if (currentRoomId) {
              // Broadcast new message to all clients in the room
              broadcast(currentRoomId, {
                type: 'new_message',
                message: message.message
              });
            }
            break;
            
          case 'typing_status':
            if (currentRoomId) {
              // Broadcast typing status to other clients in the room
              broadcast(currentRoomId, {
                type: 'typing_status',
                userId: currentUserId,
                isTyping: message.isTyping,
                roomId: currentRoomId
              }, ws);
            }
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      // Remove client from room when disconnected
      if (currentRoomId && roomClients.has(currentRoomId)) {
        roomClients.get(currentRoomId)?.delete(ws);
        
        // Broadcast user left
        if (currentUserId) {
          broadcast(currentRoomId, {
            type: 'user_left',
            userId: currentUserId,
            roomId: currentRoomId
          }, ws);
        }
      }
    });
  });
  
  // Helper function to broadcast messages to all clients in a room
  function broadcast(roomId: string, message: any, exclude?: WebSocket) {
    const clients = roomClients.get(roomId);
    if (clients) {
      const messageStr = JSON.stringify(message);
      clients.forEach(client => {
        if (client !== exclude && client.readyState === WebSocket.OPEN) {
          client.send(messageStr);
        }
      });
    }
  }
  
  return httpServer;
}
