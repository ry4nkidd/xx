# Replit Markdown

## Overview

This is a full-stack chat application built with React, Express, and TypeScript. The application provides a modern messaging interface with real-time-like features through polling, user management, and a Windows 10-inspired dark theme. It includes a comprehensive UI component library based on shadcn/ui and Radix UI primitives.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript in strict mode
- **Styling**: Tailwind CSS with a custom Windows 10 dark theme using CSS variables
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Build Tool**: Vite with React plugin for fast development and builds

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database Layer**: Drizzle ORM configured for PostgreSQL with Neon serverless driver
- **Storage Pattern**: Interface-based storage layer with in-memory implementation for development
- **API Design**: RESTful endpoints with polling-based real-time updates
- **Session Management**: Express sessions with PostgreSQL session store

### Database Schema
- **Users**: Profile management with online status and avatar support
- **Chat Rooms**: Group and direct message room types with metadata
- **Messages**: Content storage with delivery status tracking (sent/delivered/read)
- **Room Members**: Many-to-many relationship between users and chat rooms
- **Typing Status**: Real-time typing indicators with automatic cleanup

### Key Design Patterns
- **Polling Architecture**: Uses aggressive polling (1-5 second intervals) instead of WebSockets for simplicity
- **Component Composition**: Extensive use of compound components and render props patterns
- **Type Safety**: Full TypeScript coverage with shared schema validation using Zod
- **Error Boundaries**: Comprehensive error handling with toast notifications
- **Responsive Design**: Mobile-first approach with adaptive layouts

### Development Workflow
- **Hot Reload**: Vite development server with React Fast Refresh
- **Database Migrations**: Drizzle Kit for schema management and migrations
- **Code Organization**: Monorepo structure with shared types and utilities
- **Path Aliases**: Configured import aliases for cleaner import statements

## External Dependencies

### Core Infrastructure
- **Database**: PostgreSQL (configured for Neon serverless)
- **ORM**: Drizzle ORM with drizzle-zod for schema validation
- **Session Store**: connect-pg-simple for PostgreSQL session persistence

### UI Framework
- **Component Library**: Radix UI primitives for accessibility and behavior
- **Styling**: Tailwind CSS for utility-first styling
- **Icons**: Lucide React for consistent iconography
- **Theming**: CSS variables with dark mode support

### State Management
- **Server State**: TanStack Query for caching and synchronization
- **Form Handling**: React Hook Form with Hookform Resolvers
- **Validation**: Zod for runtime type checking and validation

### Build Tools
- **Development**: Vite with TypeScript and React plugins
- **Production**: esbuild for server bundling
- **Package Management**: npm with lockfile for dependency consistency

### Development Tools
- **Replit Integration**: Custom Vite plugins for Replit development environment
- **Error Handling**: Runtime error overlay for development debugging
- **Code Analysis**: Cartographer plugin for code navigation in Replit