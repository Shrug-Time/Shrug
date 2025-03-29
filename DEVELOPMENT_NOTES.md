# Shrug Development Notes

## TotemButton Implementation: Cautionary Tale

This document serves as a warning and guide for future development on the TotemButton component and like functionality.

### History of Issues

In March 2025, we encountered significant problems with the TotemButton like functionality that are documented here to prevent similar issues in the future.

#### Problem Description
The like functionality (TotemButton component) became overly complex with multiple layers of state management:

1. UI Component State (TotemButton internal state)
2. Parent Component State (QuestionList) 
3. Local Storage State (likedTotems.ts)
4. Server State (Firebase)

This complexity resulted in:
- Like counts flashing updates then reverting
- Like status disagreements between UI and server
- Error handling causing additional state confusion
- Difficult debugging across multiple components

#### Git Commits Involved
```
03088c1 Fix totem like/unlike functionality and answer creation bug
d2e8100 Fix totem like/unlike functionality with localStorage persistence and proper handler binding
```

These commits attempted to fix the issues by adding more complexity to manage state across components, but ultimately created more problems than they solved.

### Root Causes Analysis

1. **Architectural Issues**:
   - Too many layers of state management
   - Unclear source of truth (Firebase vs. localStorage)
   - Overly complex data flow between components

2. **Implementation Issues**:
   - Optimistic updates without proper rollback mechanisms
   - Race conditions between state updates
   - Excessive caching in localStorage
   - Error handling that left state inconsistent

3. **Process Issues**:
   - Adding features (like localStorage persistence) before ensuring the core functionality worked
   - Testing primarily in happy-path scenarios without considering edge cases
   - Each fix adding more complexity rather than addressing the root causes

### Future Implementation Guidelines

When implementing or modifying the TotemButton component:

1. **Keep It Simple**:
   - Firebase should be the single source of truth
   - Component state should be minimal
   - Avoid creating complex state management layers

2. **Clean Data Flow**:
   - Use unidirectional data flow (parent → child)
   - Avoid side effects in component rendering
   - Clearly define component responsibilities

3. **Test Edge Cases**:
   - Network failures during like operations
   - Rapid clicking on like buttons
   - Concurrent updates from multiple tabs
   - Page refreshes during operations

4. **Implementation Strategy**:
   - Implement the core functionality first (click → update Firebase → update UI)
   - Add optimistic UI updates with proper rollback mechanisms
   - Consider using React Context for global state if necessary
   - Add persistence features only after core functionality is stable

A detailed implementation plan is available in the main README.md file under "TotemButton Implementation Plan".

## Other Development Notes

(Add other development notes here as needed) 

How to Better Use Me as Your AI Coding Partner
Start with a Clear Architecture: Before writing lots of code, discuss the overall approach and data flow.
Address Core Functionality First: Make sure the basic features work reliably before adding optimizations.
Keep Things Simple: Always prefer simpler solutions even if they're slightly less "clever."
Test Edge Cases Early: Consider how the code will handle errors, network issues, and rapid user interactions.
Review Changes Critically: After I propose changes, ask specifically about:
"What are the potential downsides of this approach?"
"How will this handle [specific edge case]?"
"Is there a simpler way to accomplish this?"
Plan in Smaller Iterations: Break large features into smaller, testable chunks that we can verify before moving on.
The key lesson is that in software development, complexity is the enemy of reliability. When we try to be too clever or add too many features at once, we often create more problems than we solve.