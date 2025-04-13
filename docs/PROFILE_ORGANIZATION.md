# Creator-Controlled Profile Organization

This document outlines the profile organization system for Shrug, focusing on a creator-controlled approach that leverages the totem system to organize content.

## Overview

The profile organization system will allow users to customize how their content is displayed on their profile, creating a personalized knowledge space that visitors can explore. The system uses totems as organizing principles and allows creators to define how their content should be structured.

## Key Features

### 1. Totem-Based Organization

- **Personal Totem Curation**: Users select which totems appear on their profile
- **Hierarchy Visualization**: Totems can be arranged in parent-child relationships
- **Content Categorization**: Posts and answers are organized under relevant totems

Example profile structure:
```
USER PROFILE: Jane Smith

MY TOTEMS:
[Photography] [Cooking] [Travel] [Books]

PHOTOGRAPHY:
  ├── Cameras
  |    ├── DSLR
  |    └── Mirrorless
  |
  ├── Techniques
       ├── Lighting
       └── Composition

MY POSTS: (organized under Photography > Techniques > Lighting)
• "Understanding natural light" (Question)
• "Studio lighting basics" (Answer)
• "Golden hour photography tips" (Post)
```

### 2. Content Organization Options

Users can organize content within each totem/category using different methods:

- **By Complexity**: Beginner → Advanced
- **Chronologically**: Oldest → Newest (great for evolving topics or current events)
- **By Sequence**: Step-by-step organization (for tutorials or processes)
- **By Popularity**: Most liked/viewed content first

### 3. Template-Based Customization

Rather than overwhelming users with unlimited customization options, the system will provide templates that can be customized:

- **Section Templates**: Pre-designed profile sections with customization slots
- **Featured Content**: Options to pin important content at the top
- **Visual Themes**: A selection of design themes for the knowledge organization
- **Layout Options**: Several layout options for different types of content

## Implementation Approach

### Phase 1: Basic Totem Organization

- Implement basic profile with totem organization
- Create drag-and-drop interface for arranging totems
- Add toggle controls for enabling/disabling profile sections

### Phase 2: Enhanced Customization

- Add custom section creation capability
- Implement content grouping functionality
- Create featured content showcasing

### Phase 3: Knowledge Paths

- Allow creators to define "learning paths" through their content
- Implement rich content relationship visualizations
- Add context annotations between related posts

## Technical Considerations

### Data Structure

```typescript
interface UserProfileOrganization {
  userId: string;
  sections: ProfileSection[];
  featuredTotems: string[];
  layoutPreferences: LayoutPreferences;
  customizationTheme: string;
}

interface ProfileSection {
  id: string;
  title: string;
  type: 'totem' | 'collection' | 'learningPath';
  organizationMethod: 'complexity' | 'chronological' | 'sequence' | 'popularity';
  contentIds: string[];
  position: number;
  isVisible: boolean;
  totemId?: string;
}

interface LayoutPreferences {
  profileStyle: 'compact' | 'detailed' | 'visual';
  totemVisualization: 'list' | 'grid' | 'tree' | 'bubble';
  contentDisplay: 'cards' | 'list' | 'timeline';
}
```

### Firestore Structure

```
userProfiles/{userId}/
  - basic profile info

userProfiles/{userId}/organization/
  - profile organization preferences
  
userProfiles/{userId}/sections/
  - custom sections configuration
  
userProfiles/{userId}/featuredContent/
  - pinned/featured content
```

## UI Mockups

### Profile Editor Interface

```
PROFILE EDITOR

[✓] Enable Totem Organization
[✓] Show Profile Sections
[ ] Enable Learning Paths

ARRANGE TOTEMS:
[Photography] [Cooking] [Travel]  (drag to reorder)

FEATURED SECTIONS:
[My Photography Journey] ↕️
  > Organization Method: [Timeline ▼]
  > Visibility: [Public ▼]
  > Content selection: [Select posts]

[Cooking Masterclass] ↕️
  > Organization Method: [Difficulty ▼]
  > Visibility: [Public ▼]
  > Content selection: [Select posts]

+ Add New Section
```

### Visitor View

```
JANE'S PROFILE

About Jane:
[Profile information]

My Knowledge Areas:
[Photography] [Cooking] [Travel]

FEATURED: Photography Journey
------------------------
BEGINNER
• "Understanding camera basics" (2022)
• "My first portrait session" (2022)

INTERMEDIATE
• "Advanced composition techniques" (2023)
• "Working with difficult lighting" (2023)

ADVANCED
• "Creating fine art photography" (2024)
```

## Benefits Over Current Social Models

Unlike typical social media profiles that are chronological feeds, this approach:

1. **Organizes by topic** rather than by time
2. **Shows expertise development** rather than just latest activity
3. **Creates pathways for others** to follow and learn
4. **Balances customization with structure** for better user experience

## Q&A About Implementation

### Q: How complex is this to implement?
A: Using a template-based approach makes this moderately complex but quite feasible. By implementing in phases and using React components with Firebase storage, we can gradually build sophistication.

### Q: How does this compare to current social media models?
A: This is more structured than typical chronological feeds (Twitter/Instagram) but more customizable than professional profiles (LinkedIn). It's closer to a mix of Pinterest boards and Notion pages.

### Q: Is it adaptable for future growth?
A: Yes, the template-based approach allows us to add new organization methods and visualization options without disrupting existing profiles. The underlying data structure supports extension.

### Q: How will this handle the various ways content might evolve?
A: The multiple organization methods (complexity, chronological, sequence) provide flexibility for different content types, and the section-based approach allows users to group content in ways that make sense for their specific knowledge areas. 

https://www.figma.com/community/plugin/1434599500152464568/figma-to-cursor