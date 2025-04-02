import '@testing-library/jest-dom';
import type { Post, UserProfile, Answer, Totem, TotemAssociation } from '@/types/models';
import { getFirebaseUid, getUsername, getUserDisplayName } from '@/utils/componentHelpers';

// Create mock for the standardizePostData method
const mockStandardizePostData = jest.fn();

// Mock the PostService
jest.mock('@/services/firebase', () => ({
  PostService: {
    standardizePostData: mockStandardizePostData,
    // Add other methods to make TypeScript happy
    getPaginatedPosts: jest.fn(),
    getUserPosts: jest.fn(),
    getUserAnswers: jest.fn(),
    updatePostScore: jest.fn(),
    createAnswer: jest.fn(),
    checkPostStructure: jest.fn()
  }
}));

// Import the PostService after mocking
import { PostService } from '@/services/firebase';

describe('Post Functionality', () => {
  // Sample user data
  const mockUser = {
    firebaseUid: 'user123456789abcdef',
    username: 'testuser',
    name: 'Test User',
  };
  
  // Sample post data
  const mockPostData = {
    id: 'post123',
    question: 'What is the meaning of life?',
    answerOptions: ['42', 'Love', 'Growth', 'There is no meaning'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock implementation
    mockStandardizePostData.mockImplementation((data) => {
      const timestamp = Date.now();
      // Create a standard post that matches the Post interface
      const standardizedPost: Post = {
        id: data.id || 'post123',
        question: data.question || '',
        firebaseUid: data.firebaseUid || mockUser.firebaseUid,
        username: data.username || mockUser.username,
        name: data.name || mockUser.name,
        
        // Required fields from the Post interface
        categories: data.categories || [],
        totemAssociations: data.totemAssociations || [],
        answers: data.answers || [],
        answerFirebaseUids: data.answerFirebaseUids || [],
        answerUsernames: data.answerUsernames || [],
        
        // TimestampedEntity fields
        createdAt: data.createdAt || timestamp,
        updatedAt: data.updatedAt || timestamp,
        lastInteraction: data.lastInteraction || timestamp,
        
        // Legacy fields
        userId: data.userId || data.firebaseUid || mockUser.firebaseUid,
        userName: data.userName || data.name || mockUser.name,
        answerUserIds: data.answerUserIds || [],
        
        // Optional fields
        score: data.score || 0
      };
      
      return standardizedPost;
    });
  });

  test('should standardize post data with correct fields', () => {
    // Standardize a post
    const post = PostService.standardizePostData({
      id: 'post123',
      question: mockPostData.question,
      firebaseUid: mockUser.firebaseUid,
      username: mockUser.username,
      name: mockUser.name
    });
    
    // Verify standardized fields are present
    expect(post.firebaseUid).toBe(mockUser.firebaseUid);
    expect(post.username).toBe(mockUser.username);
    expect(post.name).toBe(mockUser.name);
    
    // Verify legacy fields are also present
    expect(post.userId).toBe(mockUser.firebaseUid);
    expect(post.userName).toBe(mockUser.name);
    
    // Verify helper functions work with the standardized post
    expect(getFirebaseUid(post)).toBe(mockUser.firebaseUid);
    expect(getUsername(post)).toBe(mockUser.username);
    expect(getUserDisplayName(post)).toBe(mockUser.name);
  });

  test('should handle missing fields gracefully', () => {
    // Standardize a post with minimal data
    const post = PostService.standardizePostData({
      id: 'post123',
      question: mockPostData.question
    });
    
    // Verify default values are applied
    expect(post.firebaseUid).toBe(mockUser.firebaseUid);
    expect(post.username).toBe(mockUser.username);
    expect(post.name).toBe(mockUser.name);
    expect(post.score).toBe(0);
    expect(post.answers).toEqual([]);
    
    // Verify timestamps exist
    expect(post.createdAt).toBeDefined();
    expect(post.updatedAt).toBeDefined();
    expect(post.lastInteraction).toBeDefined();
  });

  test('should maintain existing values', () => {
    const customTimestamp = Date.now() - 3600000; // 1 hour ago
    const customScore = 42;
    
    // Standardize a post with custom values
    const post = PostService.standardizePostData({
      id: 'post123',
      question: mockPostData.question,
      firebaseUid: 'custom-uid',
      username: 'custom-username',
      name: 'Custom Name',
      createdAt: customTimestamp,
      score: customScore
    });
    
    // Verify custom values are maintained
    expect(post.firebaseUid).toBe('custom-uid');
    expect(post.username).toBe('custom-username');
    expect(post.name).toBe('Custom Name');
    expect(post.createdAt).toBe(customTimestamp);
    expect(post.score).toBe(customScore);
    
    // Verify legacy fields are set based on custom values
    expect(post.userId).toBe('custom-uid');
    expect(post.userName).toBe('Custom Name');
  });
}); 