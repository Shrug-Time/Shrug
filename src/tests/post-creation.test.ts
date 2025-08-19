import '@testing-library/jest-dom';
import type { Post, UserProfile, Answer, Totem } from '@/types/models';
import { normalizePostUserIds } from '@/utils/userIdHelpers';
import { getFirebaseUid, getUsername, getUserDisplayName } from '@/utils/componentHelpers';

// Create mocks for the PostService APIs
const mockStandardizePostData = jest.fn();
const mockGetUserPosts = jest.fn();
const mockCreateAnswer = jest.fn();
const mockGetPostById = jest.fn();

// Mock the entire firebase.ts module
jest.mock('@/services/firebase', () => ({
  PostService: {
    standardizePostData: mockStandardizePostData,
    getUserPosts: mockGetUserPosts,
    createAnswer: mockCreateAnswer,
    getPaginatedPosts: jest.fn(),
    getUserAnswers: jest.fn(),
    checkPostStructure: jest.fn(),
    getPostById: mockGetPostById
  }
}));

// Import the PostService *after* mocking it
import { PostService } from '@/services/firebase';

describe('Post Creation Functionality', () => {
  // Sample user data with all required fields
  const mockUser: UserProfile = {
    firebaseUid: 'user123456789abcdef',
    username: 'testuser',
    name: 'Test User',
    email: 'test@example.com',
    bio: 'A test user',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lastInteraction: Date.now(),
    refreshesRemaining: 5,
    verificationStatus: 'email_verified',
    membershipTier: 'free',
    refreshResetTime: new Date().toISOString(),
    followers: [],
    following: [],
    totems: {
      created: [],
      frequently_used: [],
      recent: []
    },
    expertise: []
  };
  
  // Sample post data
  const mockPostData = {
    question: 'What is the meaning of life?',
    answerOptions: ['42', 'Love', 'Growth', 'There is no meaning'],
  };

  // Sample empty totem for testing
  const emptyTotems: Totem[] = [];

  // Sample answer data with required totems field
  const mockAnswer: Omit<Answer, 'createdAt' | 'id'> = {
    text: '42 is the answer to everything',
    firebaseUid: mockUser.firebaseUid,
    username: mockUser.username,
    name: mockUser.name,
    updatedAt: Date.now(),
    lastInteraction: Date.now(),
    totems: emptyTotems
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock implementations
    mockStandardizePostData.mockImplementation((data) => {
      const timestamp = Date.now();
      const standardizedPost: Post = {
        id: data.id || 'post123',
        question: data.question || mockPostData.question,
        ...data,
        createdAt: data.createdAt || timestamp,
        updatedAt: data.updatedAt || timestamp,
        lastInteraction: data.lastInteraction || timestamp,
        firebaseUid: data.firebaseUid || mockUser.firebaseUid,
        username: data.username || mockUser.username,
        name: data.name || mockUser.name,
        likes: data.likes || 0,
        views: data.views || 0,
        answers: data.answers || [],
        categories: data.categories || [],
        totemAssociations: data.totemAssociations || [],
        answerFirebaseUids: data.answerFirebaseUids || [],
        answerUsernames: data.answerUsernames || [],
        // Legacy fields
        userId: data.userId || data.firebaseUid || mockUser.firebaseUid,
        userName: data.userName || data.name || mockUser.name,
        answerUserIds: data.answerUserIds || []
      };
      
      // Apply normalization to simulate the real service
      return normalizePostUserIds(standardizedPost);
    });
    
    mockGetPostById.mockImplementation(async (id) => {
      if (id === 'post123') {
        const timestamp = Date.now();
        const post = {
          id: 'post123',
          question: mockPostData.question,
          answerOptions: mockPostData.answerOptions,
          createdAt: timestamp,
          updatedAt: timestamp,
          lastInteraction: timestamp,
          firebaseUid: mockUser.firebaseUid,
          username: mockUser.username,
          name: mockUser.name,
          likes: 0,
          views: 0,
          answers: []
        };
        return mockStandardizePostData(post);
      }
      return null;
    });
    
    mockCreateAnswer.mockImplementation(async (postId, answer) => {
      const timestamp = Date.now();
      const newAnswer = {
        ...answer,
        id: `${answer.firebaseUid}_${timestamp}`,
        createdAt: timestamp
      };
      
      const post = await mockGetPostById(postId);
      if (!post) return { success: false, error: new Error('Post not found') };
      
      const updatedPost = {
        ...post,
        answers: [...(post.answers || []), newAnswer],
        updatedAt: timestamp,
        lastInteraction: timestamp
      };
      
      return { 
        success: true, 
        newAnswer,
        updatedPost: mockStandardizePostData(updatedPost)
      };
    });
    
    mockGetUserPosts.mockImplementation(async (userId) => {
      if (userId === mockUser.firebaseUid) {
        const timestamp = Date.now();
        const posts = [
          {
            id: 'post123',
            question: mockPostData.question,
            answerOptions: mockPostData.answerOptions,
            createdAt: timestamp,
            updatedAt: timestamp,
            lastInteraction: timestamp,
            firebaseUid: mockUser.firebaseUid,
            username: mockUser.username,
            name: mockUser.name,
            likes: 0,
            views: 0,
            answers: []
          }
        ];
        return posts.map(post => mockStandardizePostData(post));
      }
      return [];
    });
  });

  test('should standardize post data with correct fields', () => {
    // Standardize a post
    const post = PostService.standardizePostData({
      id: 'post123',
      question: mockPostData.question,
      answerOptions: mockPostData.answerOptions,
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

  test('should retrieve a post with all required fields', async () => {
    // Get a post by ID
    const post = await PostService.getPostById('post123');
    
    // Verify post exists
    expect(post).not.toBeNull();
    
    if (post) {
      // Verify question and answers
      expect(post.question).toBe(mockPostData.question);
      expect(post.answerOptions).toEqual(mockPostData.answerOptions);
      
      // Verify standardized fields are present
      expect(post.firebaseUid).toBe(mockUser.firebaseUid);
      expect(post.username).toBe(mockUser.username);
      expect(post.name).toBe(mockUser.name);
      
      // Verify legacy fields are also present
      expect(post.userId).toBe(mockUser.firebaseUid);
      expect(post.userName).toBe(mockUser.name);
      
      // Verify timestamps
      expect(post.createdAt).toBeDefined();
      expect(post.updatedAt).toBeDefined();
      expect(post.lastInteraction).toBeDefined();
    }
  });

  test('should add an answer to a post with standardized fields', async () => {
    // Create an answer for a post
    const result = await PostService.createAnswer('post123', mockAnswer);
    
    // Verify success and updatedPost exists
    expect(result.success).toBe(true);
    expect(result.updatedPost).toBeDefined();
    
    if (result.updatedPost) {
      const post = result.updatedPost;
      
      // Verify the answer was added
      expect(post.answers).toHaveLength(1);
      
      // Get the added answer
      const answer = post.answers[0];
      
      // Verify standardized fields in the answer
      expect(answer.firebaseUid).toBe(mockUser.firebaseUid);
      expect(answer.username).toBe(mockUser.username);
      expect(answer.name).toBe(mockUser.name);
      
      // These fields are the current standard - no legacy fields needed
    }
  });

  test('should handle non-existent posts', async () => {
    // Try to get a non-existent post
    const post = await PostService.getPostById('nonexistent');
    
    // Verify post is null
    expect(post).toBeNull();
    
    // Try to add an answer to a non-existent post
    const result = await PostService.createAnswer('nonexistent', mockAnswer);
    
    // Verify failure
    expect(result.success).toBe(false);
  });
}); 