# Creator-Controlled Profile Organization

This document outlines the profile organization system for Shrug, focusing on a creator-controlled approach that leverages the totem system to organize content.

## Overview

The profile organization system will allow users to customize how their content is displayed on their profile, creating a personalized knowledge space that visitors can explore. The system uses totems as organizing principles and allows creators to define how their content should be structured.

## Key Features

### 1. Sections (MVP Focus)

- **Default Sections**: Automatically generated for all users
  - "Recent" (chronologically organized)
  - "Popular" (organized by engagement)
  - Totem-based sections for user's most active totems
- **Custom Sections**: User-created content groupings
  - Named by the user
  - Content manually selected or filtered by totems
  - Simple organization options

### 2. Content Organization Options

Users can organize content within each section using different methods:

- **By Complexity**: Beginner → Advanced
- **Chronologically**: Oldest → Newest (great for evolving topics or current events)
- **By Popularity**: Most liked/viewed content first

### 3. Implementation Approach

**MVP Implementation (Phase 1)**:
- Automatic generation of default sections
- Basic section creation and management 
- Simple content selection into sections
- Basic sorting options
- Mobile-responsive design

**Future Enhancements (Post-MVP)**:
- Drag-and-drop interface for arranging sections and content
- Visual themes and layout options
- Knowledge paths showing relationships between content
- Advanced hierarchy visualization

## Technical Considerations

### Data Structure

```typescript
interface UserProfileOrganization {
  userId: string;
  sections: ProfileSection[];
  layoutPreferences: LayoutPreferences;
}

interface ProfileSection {
  id: string;
  title: string;
  type: 'default' | 'custom';
  organizationMethod: 'complexity' | 'chronological' | 'popularity';
  contentIds: string[];
  position: number;
  isVisible: boolean;
  totemId?: string;
}

interface LayoutPreferences {
  profileStyle: 'compact' | 'detailed';
  contentDisplay: 'cards' | 'list';
}
```

### Firestore Structure

```
userProfiles/{userId}/
  - basic profile info

userProfiles/{userId}/sections/
  - section configuration
  
userProfiles/{userId}/customContent/
  - custom content selection for sections
```

## UI Approach

### Profile View

- Maintain existing tab structure (Home, About, Comments, Activity)
- Display sections within the Home tab
- "Customize Page" button to manage profile and sections

### Section Management

- Simple interface to create and edit sections
- Content selection through filters and manual selection
- Basic organization controls (sorting, ordering)
- Toggle visibility for sections

## Benefits

1. **Low Implementation Complexity**: Achievable within MVP timeline
2. **User Value**: Immediate organization benefit even for users who don't customize
3. **Framework for Growth**: Data structure supports future enhancements
4. **Mobile Friendly**: Simple controls work well on all devices

## Q&A About Implementation

### Q: How complex is this to implement?
A: The MVP approach is relatively simple, focusing on functional organization rather than advanced UI capabilities like drag-and-drop.

### Q: Will this meet user expectations for customization?
A: Yes - by providing default sections and simple customization options, users get immediate value while having the ability to personalize when desired.

### Q: How will this handle new users with minimal content?
A: Default sections will automatically adjust to show what content exists, and empty state designs will guide users on how to add content.

### Q: How does this compare to current social media profiles?
A: This provides more topic-based organization than chronological feeds (Twitter/Instagram) while remaining simpler to implement than complex customization systems.

https://www.figma.com/community/plugin/1434599500152464568/figma-to-cursor