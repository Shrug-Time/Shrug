# Shrug - A Social Platform for Questions and Answers

## Overview
Shrug is a social platform where users can ask questions and receive answers using a unique "totem" system. Users can like and interact with totems, creating a dynamic community of shared knowledge and perspectives.

## Table of Contents
1. [Quick Start](#quick-start)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Key Features](#key-features)
5. [Documentation](#documentation)
6. [Implementation Plan](#implementation-plan)

## Quick Start
1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see `.env.example`)
4. Run the development server: `npm run dev`

## Tech Stack
- Next.js 14
- TypeScript
- Firebase (Authentication & Firestore)
- Tailwind CSS
- React Query

## Project Structure
```
src/
├── app/                 # Next.js app router pages
├── components/         # React components
│   ├── common/        # Shared components
│   ├── questions/     # Question-related components
│   └── totem/         # Totem-related components
├── lib/               # Utility functions and configurations
├── services/          # Business logic and API calls
└── types/            # TypeScript type definitions
```

## Key Features
- User authentication
- Question creation and management
- Totem-based answer system
- Like/unlike functionality
- Real-time updates
- Responsive design

## Documentation
- [Implementation Plan](docs/IMPLEMENTATION_PLAN.md) - Current development roadmap
- [Architecture](docs/ARCHITECTURE.md) - System design and data models
- [Development](docs/DEVELOPMENT.md) - Development guidelines and patterns
- [Changelog](docs/CHANGELOG.md) - Version history and future plans

## Implementation Plan
For the current development roadmap and detailed implementation plan, see [IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md).

## Learn More
To learn more about Next.js, take a look at the following resources:
- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel
The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
