# Shrug - A Social Platform for Questions and Answers

## Overview
Shrug is a social platform where users can ask questions and receive answers using a unique "totem" system. Users can like and interact with totems, creating a dynamic community of shared knowledge and perspectives.

## Table of Contents
1. [Quick Start](#quick-start)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Key Features](#key-features)
5. [Documentation](#documentation)
6. [Development Status](#development-status)

## Quick Start
1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see `.env.example`)
4. Run the development server: `npm run dev`
5. Access the site at http://localhost:3000

## Tech Stack
- Next.js 14+
- TypeScript
- Firebase (Authentication & Firestore)
- Tailwind CSS
- React Query
- Firebase Hosting (deployment)

## Project Structure
```
src/
├── app/                # Next.js app router pages
├── components/         # React components
│   ├── common/         # Shared components
│   ├── questions/      # Question-related components
│   └── totem/          # Totem-related components
├── contexts/           # React contexts for state management
├── hooks/              # Custom React hooks
├── services/           # Business logic and API calls
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

## Key Features
- User authentication
- Question creation and management
- Totem-based answer system
- Like/unlike functionality with "crispness" decay
- Profile management
- Responsive design

## Documentation
- [Implementation Plan](docs/IMPLEMENTATION_PLAN.md) - Current development roadmap
- [Firebase Setup](docs/FIREBASE_SETUP.md) - Firebase configuration details

## Development Status
The project is currently in a refactoring phase following the [Implementation Plan](docs/IMPLEMENTATION_PLAN.md). We are:
1. Standardizing data structures
2. Improving URL route consistency
3. Strengthening TypeScript typing
4. Enhancing code quality and maintainability

The app is functional in development mode (`npm run dev`) but needs implementation plan work before production deployment.

### Working Components
- Authentication (signup, login, logout)
- Question creation and viewing
- Totem-based interactions
- Basic user profiles

### Environment Requirements
- Node.js 18+
- npm 9+
- Firebase project with Firestore and Authentication enabled

## Deployment
We use Firebase Hosting for deployment. Once the initial implementation phase is complete:
1. Build the project: `npm run build`
2. Deploy to Firebase: `firebase deploy`

GitHub Actions are configured to automatically deploy the `main` branch to production.

## Learn More
To learn more about Next.js, take a look at the following resources:
- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel
The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
