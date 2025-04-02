# Totem Crispness Calculation

## Overview

Totem crispness is a measure of how "fresh" or relevant a totem is based on user interactions over time. The crispness score ranges from 0 to 100, with 100 being completely fresh and 0 being completely stale. This document explains how the crispness calculation works.

## Core Concept

Each like on a totem has its own individual crispness score that decays over time. The totem's overall crispness is calculated as the average of all individual like crispness scores.

## Algorithm Explanation

1. **Individual Like Crispness**:
   - When a user likes a totem, that like starts with a crispness score of 100
   - Over time, the crispness of that individual like decays linearly
   - After a specified decay period (one week by default), the crispness reaches 0
   - The formula is: `likeCrispness = 100 * (1 - (timeSinceLike / decayPeriod))`

2. **Overall Totem Crispness**:
   - The totem's overall crispness is the average of all individual like crispness scores
   - If a totem has 5 likes with crispness values of 100, 75, 50, 25, and 0, its overall crispness would be 50

3. **Decay Models**:
   - FAST (default): Crispness decays to zero after 1 week (7 days)
   - MEDIUM: Crispness decays to zero after 1 year (365 days)
   - NONE: Crispness never decays (stays at 100)

## Example Scenarios

### Scenario 1: New Totem with One Like
- A totem receives its first like
- The totem's crispness is immediately set to 100
- After 3.5 days, the totem's crispness will be 50
- After 7 days, the totem's crispness will be 0

### Scenario 2: Totem with Multiple Likes Over Time
- A totem has 3 likes:
  - Like #1: 7 days old (crispness = 0)
  - Like #2: 3.5 days old (crispness = 50)
  - Like #3: Just received (crispness = 100)
- The totem's overall crispness would be (0 + 50 + 100) / 3 = 50

### Scenario 3: Totem with Many Old Likes Gets a New Like
- A totem has 10 likes that are all more than 7 days old (each with crispness = 0)
- The totem receives 1 new like (crispness = 100)
- The totem's overall crispness would be (0*10 + 100) / 11 = 9.09

## Implementation Details

The crispness calculation is implemented in the `TotemService.calculateCrispness` method. It:

1. Validates the input arrays of likes and timestamps
2. Handles special cases (no likes, single like)
3. Calculates individual crispness values for each like
4. Computes the average crispness
5. Ensures the result is bounded between 0 and 100

## Code Reference

```typescript
static calculateCrispness(
  likes: number[],
  timestamps: number[] | string[],
  decayModel: keyof typeof DECAY_PERIODS = 'FAST'
): number {
  // ... implementation details ...
  
  // Calculate individual crispness for each like
  timestamps.forEach((timestamp, index) => {
    const likeTime = typeof timestamp === 'string' 
      ? new Date(timestamp).getTime() 
      : timestamp;
      
    const timeSinceLike = now - likeTime;
    const likeCrispness = Math.max(0, 100 * (1 - (timeSinceLike / decayPeriod)));
    individualCrispnessValues.push(likeCrispness);
  });
  
  // Calculate average crispness
  const totalCrispness = individualCrispnessValues.reduce((sum, val) => sum + val, 0);
  const averageCrispness = individualCrispnessValues.length > 0 
    ? totalCrispness / individualCrispnessValues.length 
    : 0;
  
  return parseFloat(boundedCrispness.toFixed(2));
}
```

## Benefits of This Approach

1. **Accurate Representation**: The crispness score represents how recently users have interacted with the totem
2. **Smooth Transitions**: The score decays gradually rather than suddenly dropping
3. **Aggregation of Interest**: Multiple likes contribute to a sustained higher crispness
4. **Standardized Scale**: All crispness scores are on the same 0-100 scale

## Field Standardization

As part of the SHRUG App standardization effort, the crispness calculation now uses standardized field names:

- `TOTEM_FIELDS.CRISPNESS`: The calculated crispness score
- `TOTEM_FIELDS.LIKE_TIMES`: Array of timestamps when likes occurred
- `TOTEM_FIELDS.LIKE_VALUES`: Array of like values (typically all 1)
- `TOTEM_FIELDS.LIKED_BY`: Array of user IDs who liked the totem

Legacy field names are still supported for backward compatibility. 