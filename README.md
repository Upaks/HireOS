# HireOS  
**An Automated Hiring Platform**

HireOS is a full-stack Applicant Tracking System (ATS) designed to help teams manage job postings, candidates, and hiring workflows in a structured and scalable way.

The platform separates concerns across client, server, API, and background workers, making it suitable for real-world production use and future expansion.

**Live Demo:**  
https://hire-os-lyart.vercel.app

---

## ✨ Core Features

- **Job Posting Management**
  - Create and manage job listings
  - Control job lifecycle and visibility

- **Candidate Tracking**
  - Store and update candidate information
  - Track candidates through hiring stages

- **Structured Hiring Data**
  - Centralized data model for jobs and candidates
  - Designed for extensibility and reporting

- **API-Driven Architecture**
  - Clean separation between frontend and backend
  - Serverless-ready API layer

---

## 🏗 Architecture Overview

HireOS follows a modular, production-oriented architecture:

HireOS/
├── client/ # Frontend application
├── server/ # Backend application logic
├── api/ # Serverless API routes (Vercel)
├── worker/ # Background / async workers
├── shared/ # Shared types & utilities
├── scripts/ # Utility scripts
├── migrations/ # Database migrations
├── package.json
└── README.md


This structure allows independent scaling of frontend, backend, and workers.

---

## 🛠 Tech Stack

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS

### Backend
- Node.js
- Express-style server architecture
- API routes optimized for serverless deployment

### Database & ORM
- PostgreSQL
- Drizzle ORM
- SQL migrations

### Tooling & Infrastructure
- Vercel (deployment)
- TypeScript (end-to-end)
- ESLint & modern build tooling

---

## ⚙️ Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm

### Install Dependencies

```bash
npm install

 
## 🚀 Deployment

- HireOS is configured for deployment on Vercel.

Deployment steps:

- Push the repository to GitHub

- Import the project into Vercel

- Configure environment variables

## Deploy

- Vercel handles build, serverless APIs, and routing automatically.

## 📌 Project Status

- HireOS is under active development.
- New features, optimizations, and improvements are being added incrementally.