# Route Standardization

This document defines the standard route structure for the Shrug application. All components should follow these patterns when generating links or defining routes.

## Core Principles

1. **Consistency**: Routes use the same patterns throughout the application
2. **Hierarchy**: Routes reflect the hierarchical relationship between resources
3. **Plural for Collections**: Collection names are always plural (e.g., `/answers/`)
4. **Simplicity**: Routes use the minimum necessary nesting
5. **Semantic**: Route names clearly indicate the resource being accessed

## Standard Routes

### Public Content

| Route | Description | Example |
|-------|-------------|---------|
| `/` | Home/feed page | `/` |
| `/post/[id]` | View a question and its answers | `/post/khleMdiBWBv2U3Giofor` |
| `/post/[id]/answers/[answerId]` | View a specific answer | `/post/khleMdiBWBv2U3Giofor/answers/87m5IW...` |
| `/post/[id]/totem/[totemName]` | View a specific totem for a post | `/post/khleMdiBWBv2U3Giofor/totem/Example` |
| `/profile/[userId]` | View a user's profile | `/profile/87m5IWrx3pUplWg2eKVyg76bM5g1` |
| `/search` | Search results page | `/search?q=example` |

### User Management

| Route | Description | Example |
|-------|-------------|---------|
| `/login` | User login | `/login` |
| `/signup` | User registration | `/signup` |
| `/settings` | User settings hub | `/settings` |
| `/settings/profile` | Edit profile | `/settings/profile` |

### Content Creation

| Route | Description | Example |
|-------|-------------|---------|
| `/post/new` | Create a new question | `/post/new` |
| `/post/[id]/answer` | Add an answer to a question | `/post/khleMdiBWBv2U3Giofor/answer` |

### Admin/Moderation

| Route | Description | Example |
|-------|-------------|---------|
| `/admin/reports` | View reported content | `/admin/reports` |
| `/admin/users` | User management | `/admin/users` |

## Route Parameters

| Parameter | Format | Description |
|-----------|--------|-------------|
| `[id]` | String | Firebase document ID for a post |
| `[answerId]` | String | Firebase document ID or compound ID (userId_timestamp) for an answer |
| `[userId]` | String | Firebase user ID (auth UID) |
| `[totemName]` | String | Name of a totem, URL-encoded |

## URL Generation Utilities

All components should use the utility functions for generating URLs rather than hardcoding routes. These utilities are defined in `src/utils/routes.ts`.

## Important Changes

1. **Singular vs Plural**: We've standardized on plural form for collections (`/answers/` not `/answer/`)
2. **Redirects**: Legacy routes (like `/post/[id]/answer/[answerId]`) redirect to the standardized versions
3. **Consistent Parameters**: Parameter names are consistent across all routes

## Accessibility Considerations

- Routes are designed to be clean and readable when voiced by screen readers
- URL structure provides context about the content hierarchy 