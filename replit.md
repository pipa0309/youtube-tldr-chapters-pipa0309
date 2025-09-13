# YouTube TLDR API Tester

## Overview

This is a full-stack web application that provides an API testing interface for a YouTube video transcript processing service. The application allows users to extract transcripts from YouTube videos and generate AI-powered summaries (TLDR) and chapters without downloading video content. It features a React frontend built with TypeScript and Vite, an Express.js backend, and uses PostgreSQL with Drizzle ORM for data persistence.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **UI Library**: Radix UI components with shadcn/ui design system
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ESM modules
- **API Pattern**: RESTful API with structured error handling
- **Request Processing**: Built-in middleware for JSON parsing, logging, and error handling
- **Development**: Hot reload with Vite integration for full-stack development

### Data Storage Solutions
- **Database**: PostgreSQL with connection pooling
- **ORM**: Drizzle ORM with migrations support
- **Schema Management**: Centralized schema definitions in shared directory
- **Caching**: In-memory caching service for API responses with TTL expiration
- **Storage Interface**: Abstracted storage layer with in-memory fallback for development

### Database Schema Design
- **Users Table**: Basic user management with username/password authentication
- **Video Processing Jobs**: Tracks processing status, metadata, and results for each video
- **API Logs**: Comprehensive request logging with performance metrics and error tracking
- **Analytics**: Built-in support for processing statistics and usage metrics

### Authentication and Authorization
- **Session Management**: Connect-pg-simple for PostgreSQL-backed sessions
- **Storage**: Session data persisted in database
- **Security**: Environment-based configuration for sensitive credentials

### Service Layer Architecture
- **YouTube Service**: Handles video metadata extraction and transcript retrieval
- **LLM Service**: Integrates with OpenAI GPT models (defaulting to GPT-5) with Groq fallback
- **Analytics Service**: Request logging and usage statistics
- **Cache Service**: Response caching with automatic cleanup
- **Retry Logic**: Exponential backoff for external API calls

### API Design
- **Primary Endpoint**: `/api/build` for video processing with query parameters
- **Parameters**: Supports URL, language (default: ru), model selection, and cache control
- **Response Format**: Structured JSON with success/error indicators
- **Error Handling**: Comprehensive error responses with appropriate HTTP status codes
- **Performance**: Request/response time tracking and logging

## External Dependencies

### Core Technologies
- **Database**: Neon serverless PostgreSQL for cloud deployment
- **AI Services**: OpenAI API (GPT-5) with Groq as fallback provider
- **YouTube Integration**: YouTube Data API v3 for video metadata

### Development Tools
- **Build System**: Vite with React plugin and error overlay
- **Code Quality**: TypeScript strict mode with comprehensive type checking
- **Styling**: PostCSS with Tailwind CSS and autoprefixer
- **Fonts**: Google Fonts (Inter, JetBrains Mono) for typography

### UI Components
- **Component Library**: Radix UI primitives for accessible components
- **Icons**: Lucide React for consistent iconography
- **Utilities**: Class variance authority for component variants
- **Date Handling**: date-fns for date manipulation

### Monitoring and Analytics
- **Request Logging**: Custom middleware for API request/response tracking
- **Performance Metrics**: Response time measurement and success rate tracking
- **Error Tracking**: Structured error logging with contextual information

### Deployment Configuration
- **Environment**: Supports development and production modes
- **Static Assets**: Vite handles asset optimization and bundling
- **Hot Reload**: Development server with HMR support
- **Build Output**: Optimized production builds with code splitting