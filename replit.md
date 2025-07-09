# HireOS - Recruitment Management System

## Overview

HireOS is a comprehensive full-stack recruitment management system built on React + Express architecture. The application streamlines the entire hiring process from job creation to candidate onboarding, featuring automated workflows, AI-powered job description generation, assessment management, and role-based access control.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with custom configuration
- **UI Library**: Radix UI components with Tailwind CSS styling
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation
- **Styling**: Tailwind CSS with shadcn/ui design system

### Backend Architecture
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js with session-based authentication
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with local strategy and bcrypt password hashing
- **Session Storage**: PostgreSQL-backed session store
- **File Storage**: Supabase for resume uploads

### Database Design
- **ORM**: Drizzle with schema-first approach
- **Primary Tables**: users, jobs, candidates, interviews, notifications, activity logs
- **Key Features**: Role-based access control, audit trails, automated workflow triggers

## Key Components

### Authentication & Authorization
- Session-based authentication with Passport.js
- Role-based access control (CEO, COO, Hiring Manager, Project Manager, Director, Admin)
- Protected routes with role-specific permissions
- Secure password hashing with scrypt

### Job Management
- AI-powered job description generation using OpenRouter API
- HiPeople assessment integration for candidate evaluation
- Multi-platform job posting capabilities
- Approval workflows for job postings

### Candidate Management
- Comprehensive candidate profiles with assessment scores
- Status tracking through hiring pipeline
- Automated email notifications and scheduling
- Resume upload and storage via Supabase
- Advanced filtering and search capabilities

### Assessment Integration
- HiPeople assessment platform integration
- Automated assessment delivery with configurable delays
- Score tracking and percentile calculations
- Assessment completion monitoring

### Email System
- Nodemailer integration for automated communications
- Template-based email system for consistency
- Notification queue for scheduled email delivery
- Interview and offer email automation

## Data Flow

### Hiring Process Flow
1. **Job Creation**: Hiring managers submit job requirements
2. **AI Generation**: OpenRouter API generates job descriptions
3. **Approval**: Stakeholders review and approve job postings
4. **Candidate Application**: Candidates apply through various channels
5. **Assessment**: Automated HiPeople assessment delivery
6. **Screening**: HR reviews candidates and assessment scores
7. **Interview**: Scheduling and conducting interviews
8. **Decision**: Final approval by senior leadership
9. **Offer**: Automated offer letter generation and delivery

### Data Synchronization
- Real-time candidate status updates
- Activity logging for audit trails
- Automated notification triggers
- Cross-platform data consistency

## External Dependencies

### AI Services
- **OpenRouter API**: Job description generation using various LLM models
- **Primary Model**: google/gemini-2.0-flash-001 for cost-effective generation

### Assessment Platform
- **HiPeople**: Third-party assessment platform integration
- **Custom Scraper**: Cloud function for extracting assessment results

### Communication Services
- **Gmail SMTP**: Email delivery through Nodemailer
- **Slack Webhooks**: Team notifications and alerts

### CRM Integration
- **GoHighLevel API**: Automatic contact creation and sync
- **Bidirectional Sync**: Two-way data flow between HireOS and GHL
- **Smart Tagging**: Job role-specific tags and application status tracking

### Infrastructure Services
- **Neon Database**: Serverless PostgreSQL hosting
- **Supabase**: File storage for resume uploads
- **Replit**: Development and hosting platform

### Testing Tools
- **GoHighLevel**: CRM integration testing scripts and full bidirectional sync
- **Axios**: HTTP client for external API communications

## Deployment Strategy

### Development Environment
- **Platform**: Replit with live development server
- **Database**: Neon PostgreSQL with connection pooling
- **Hot Reload**: Vite development server with HMR
- **Environment Variables**: Secure credential management

### Production Considerations
- **Build Process**: Vite build for frontend, esbuild for backend
- **Session Security**: Production-grade session configuration
- **Database Migrations**: Drizzle Kit for schema management
- **Error Handling**: Comprehensive error logging and monitoring

### Security Measures
- **Authentication**: Secure session management with PostgreSQL storage
- **Password Security**: Scrypt-based password hashing
- **API Security**: Request validation with Zod schemas
- **File Upload**: Secure resume storage with Supabase

## User Preferences

Preferred communication style: Simple, everyday language.

## Changelog

Changelog:
- July 02, 2025. Initial setup
- July 08, 2025. Enhanced GHL integration with bidirectional sync capabilities
  - Added `ghl_contact_id` column to candidates table for perfect ID matching
  - Updated GHL integration to store contact IDs when creating candidates
  - Added functions for updating and retrieving GHL contacts
  - Maintained data integrity by keeping existing integer primary keys intact
- July 09, 2025. Completed automated GHL contact sync functionality
  - Implemented automatic sync between GHL contacts and candidates table
  - Added name-based matching with case normalization
  - Created sync scripts: `sync-ghl-contacts.js` and `run-ghl-sync.js`
  - Successfully synced 16 candidates with GHL contact IDs
  - Added comprehensive error handling and logging
  - Optimized performance with contact fetching limits