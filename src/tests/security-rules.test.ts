import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import * as fs from 'fs';

/**
 * The Firebase emulator security rules test suite
 * 
 * This file tests the security rules to ensure they protect data integrity
 * while allowing legitimate operations.
 */

// Test constants
const PROJECT_ID = 'shrug-test';
const USER_ID = 'test-user-id';
const OTHER_USER_ID = 'other-user-id';
const TEST_TIMESTAMP = Date.now();

// Mock data
const mockUserProfile = {
  firebaseUid: USER_ID,
  username: 'testuser',
  name: 'Test User',
  email: 'test@example.com',
  verificationStatus: 'email_verified',
  membershipTier: 'basic',
  refreshesRemaining: 5,
  refreshResetTime: new Date().toISOString(),
  followers: [],
  following: [],
  totems: {
    created: [],
    frequently_used: [],
    recent: []
  },
  createdAt: TEST_TIMESTAMP,
  updatedAt: TEST_TIMESTAMP
};

const mockOtherUserProfile = {
  ...mockUserProfile,
  firebaseUid: OTHER_USER_ID,
  username: 'otheruser',
  name: 'Other User',
  email: 'other@example.com',
};

const mockPost = {
  id: 'test-post-id',
  question: 'Test question?',
  firebaseUid: USER_ID,
  username: 'testuser',
  name: 'Test User',
  categories: ['test'],
  totemAssociations: [],
  answers: [],
  answerFirebaseUids: [],
  answerUsernames: [],
  createdAt: TEST_TIMESTAMP,
  updatedAt: TEST_TIMESTAMP
};

const mockTotem = {
  id: 'test-totem-id',
  name: 'Test Totem',
  likes: 0,
  likedBy: [],
  likeTimes: [],
  likeValues: [],
  crispness: 1.0,
  category: {
    id: 'test-category',
    name: 'Test Category',
    description: 'A test category',
    children: [],
    usageCount: 0
  },
  decayModel: 'MEDIUM',
  usageCount: 0,
  relationships: [],
  createdAt: TEST_TIMESTAMP,
  updatedAt: TEST_TIMESTAMP
};

// Initialize test context with authenticated and unauthenticated apps
let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  // Load the security rules
  const rules = fs.readFileSync('firestore.rules', 'utf8');
  
  // Initialize the test environment
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules,
      host: 'localhost',
      port: 8080
    }
  });
  
  // Clear the database between tests
  await testEnv.clearFirestore();
});

afterAll(async () => {
  // Clean up the test environment
  await testEnv.cleanup();
});

beforeEach(async () => {
  // Reset the database before each test
  await testEnv.clearFirestore();
});

// ======================================
// USER COLLECTION TESTS
// ======================================

describe('User collection rules', () => {
  test('Unauthenticated users cannot read user profiles', async () => {
    const unauthenticatedApp = testEnv.unauthenticatedContext();
    
    await expect(
      getDoc(doc(unauthenticatedApp.firestore(), 'users', USER_ID))
    ).rejects.toThrow();
  });
  
  test('Authenticated users can read any user profile', async () => {
    // Setup: Create a user document
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users', USER_ID), mockUserProfile);
    });
    
    // Test: Other user can read the profile
    const otherUserApp = testEnv.authenticatedContext(OTHER_USER_ID);
    const userDoc = await getDoc(doc(otherUserApp.firestore(), 'users', USER_ID));
    
    expect(userDoc.exists()).toBe(true);
    expect(userDoc.data().username).toBe('testuser');
  });
  
  test('Users can create their own profiles with valid timestamps', async () => {
    const userApp = testEnv.authenticatedContext(USER_ID);
    
    await expect(
      setDoc(doc(userApp.firestore(), 'users', USER_ID), mockUserProfile)
    ).resolves.not.toThrow();
  });
  
  test('Users cannot create profiles for other users', async () => {
    const otherUserApp = testEnv.authenticatedContext(OTHER_USER_ID);
    
    await expect(
      setDoc(doc(otherUserApp.firestore(), 'users', USER_ID), mockUserProfile)
    ).rejects.toThrow();
  });
  
  test('Users can update their own profiles except restricted fields', async () => {
    // Setup: Create user profile
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users', USER_ID), mockUserProfile);
    });
    
    const userApp = testEnv.authenticatedContext(USER_ID);
    
    // Test: Update allowed fields
    await expect(
      updateDoc(doc(userApp.firestore(), 'users', USER_ID), {
        bio: 'Updated bio',
        photoURL: 'https://example.com/photo.jpg',
        updatedAt: TEST_TIMESTAMP + 1000
      })
    ).resolves.not.toThrow();
    
    // Test: Cannot update restricted fields
    await expect(
      updateDoc(doc(userApp.firestore(), 'users', USER_ID), {
        membershipTier: 'premium',
        updatedAt: TEST_TIMESTAMP + 2000
      })
    ).rejects.toThrow();
  });
  
  test('Users can update followers/following arrays', async () => {
    // Setup: Create user profiles
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users', USER_ID), mockUserProfile);
      await setDoc(doc(context.firestore(), 'users', OTHER_USER_ID), mockOtherUserProfile);
    });
    
    const otherUserApp = testEnv.authenticatedContext(OTHER_USER_ID);
    
    // Test: Update followers array of another user
    await expect(
      updateDoc(doc(otherUserApp.firestore(), 'users', USER_ID), {
        followers: [OTHER_USER_ID]
      })
    ).resolves.not.toThrow();
  });
  
  test('Users cannot delete profiles', async () => {
    // Setup: Create user profile
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users', USER_ID), mockUserProfile);
    });
    
    const userApp = testEnv.authenticatedContext(USER_ID);
    
    // Test: Try to delete own profile
    await expect(
      deleteDoc(doc(userApp.firestore(), 'users', USER_ID))
    ).rejects.toThrow();
  });
});

// ======================================
// POST COLLECTION TESTS
// ======================================

describe('Post collection rules', () => {
  test('Authenticated users can read posts', async () => {
    // Setup: Create a post
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'posts', mockPost.id), mockPost);
    });
    
    const otherUserApp = testEnv.authenticatedContext(OTHER_USER_ID);
    
    // Test: Other user can read the post
    const postDoc = await getDoc(doc(otherUserApp.firestore(), 'posts', mockPost.id));
    
    expect(postDoc.exists()).toBe(true);
    expect(postDoc.data().question).toBe('Test question?');
  });
  
  test('Users can create posts with valid fields', async () => {
    // Setup: Create user profile for validation checks
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users', USER_ID), mockUserProfile);
    });
    
    const userApp = testEnv.authenticatedContext(USER_ID, { email_verified: true });
    
    // Test: Create a post
    await expect(
      setDoc(doc(userApp.firestore(), 'posts', mockPost.id), mockPost)
    ).resolves.not.toThrow();
  });
  
  test('Users can update their own posts', async () => {
    // Setup: Create post
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'posts', mockPost.id), mockPost);
    });
    
    const userApp = testEnv.authenticatedContext(USER_ID);
    
    // Test: Update own post
    await expect(
      updateDoc(doc(userApp.firestore(), 'posts', mockPost.id), {
        question: 'Updated question?',
        updatedAt: TEST_TIMESTAMP + 1000
      })
    ).resolves.not.toThrow();
  });
  
  test('Users cannot update ownership fields of posts', async () => {
    // Setup: Create post
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'posts', mockPost.id), mockPost);
    });
    
    const userApp = testEnv.authenticatedContext(USER_ID);
    
    // Test: Try to update owner fields
    await expect(
      updateDoc(doc(userApp.firestore(), 'posts', mockPost.id), {
        firebaseUid: OTHER_USER_ID,
        updatedAt: TEST_TIMESTAMP + 1000
      })
    ).rejects.toThrow();
  });
  
  test('Anyone can update answers on posts', async () => {
    // Setup: Create post
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'posts', mockPost.id), mockPost);
    });
    
    const otherUserApp = testEnv.authenticatedContext(OTHER_USER_ID);
    
    // Test: Update answers array
    await expect(
      updateDoc(doc(otherUserApp.firestore(), 'posts', mockPost.id), {
        answers: [{ 
          id: 'test-answer-id', 
          text: 'Test answer', 
          firebaseUid: OTHER_USER_ID,
          username: 'otheruser',
          name: 'Other User',
          createdAt: TEST_TIMESTAMP,
          updatedAt: TEST_TIMESTAMP
        }],
        answerFirebaseUids: [OTHER_USER_ID],
        answerUsernames: ['otheruser'],
        lastInteraction: TEST_TIMESTAMP + 1000,
        updatedAt: TEST_TIMESTAMP + 1000
      })
    ).resolves.not.toThrow();
  });
  
  test('Only post owners can delete posts', async () => {
    // Setup: Create post
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'posts', mockPost.id), mockPost);
    });
    
    // Test: Owner can delete
    const userApp = testEnv.authenticatedContext(USER_ID);
    await expect(
      deleteDoc(doc(userApp.firestore(), 'posts', mockPost.id))
    ).resolves.not.toThrow();
    
    // Setup again for other user test
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'posts', mockPost.id), mockPost);
    });
    
    // Test: Other user cannot delete
    const otherUserApp = testEnv.authenticatedContext(OTHER_USER_ID);
    await expect(
      deleteDoc(doc(otherUserApp.firestore(), 'posts', mockPost.id))
    ).rejects.toThrow();
  });
});

// ======================================
// TOTEM COLLECTION TESTS
// ======================================

describe('Totem collection rules', () => {
  test('Authenticated users can read totems', async () => {
    // Setup: Create a totem
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'totems', mockTotem.id), mockTotem);
    });
    
    const userApp = testEnv.authenticatedContext(USER_ID);
    
    // Test: User can read the totem
    const totemDoc = await getDoc(doc(userApp.firestore(), 'totems', mockTotem.id));
    
    expect(totemDoc.exists()).toBe(true);
    expect(totemDoc.data().name).toBe('Test Totem');
  });
  
  test('Email verified users can create totems', async () => {
    const userApp = testEnv.authenticatedContext(USER_ID, { email_verified: true });
    
    // Test: Create a totem
    await expect(
      setDoc(doc(userApp.firestore(), 'totems', mockTotem.id), mockTotem)
    ).resolves.not.toThrow();
  });
  
  test('Non-verified users cannot create totems', async () => {
    const userApp = testEnv.authenticatedContext(USER_ID, { email_verified: false });
    
    // Test: Try to create a totem
    await expect(
      setDoc(doc(userApp.firestore(), 'totems', mockTotem.id), mockTotem)
    ).rejects.toThrow();
  });
  
  test('Users can update totem like information', async () => {
    // Setup: Create a totem
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'totems', mockTotem.id), mockTotem);
    });
    
    const userApp = testEnv.authenticatedContext(USER_ID);
    
    // Test: Update like information
    await expect(
      updateDoc(doc(userApp.firestore(), 'totems', mockTotem.id), {
        likes: 1,
        likedBy: [USER_ID],
        likeTimes: [TEST_TIMESTAMP],
        likeValues: [1],
        lastLike: TEST_TIMESTAMP,
        crispness: 1.5,
        updatedAt: TEST_TIMESTAMP + 1000
      })
    ).resolves.not.toThrow();
  });
  
  test('Users can update totem relationships', async () => {
    // Setup: Create a totem
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'totems', mockTotem.id), mockTotem);
    });
    
    const userApp = testEnv.authenticatedContext(USER_ID);
    
    // Test: Update relationships
    await expect(
      updateDoc(doc(userApp.firestore(), 'totems', mockTotem.id), {
        relationships: [{
          totemId: 'other-totem-id',
          relationshipType: 'related',
          strength: 50,
          sourcesCount: 1
        }],
        updatedAt: TEST_TIMESTAMP + 1000
      })
    ).resolves.not.toThrow();
  });
  
  test('Users cannot delete totems', async () => {
    // Setup: Create a totem
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'totems', mockTotem.id), mockTotem);
    });
    
    const userApp = testEnv.authenticatedContext(USER_ID);
    
    // Test: Try to delete a totem
    await expect(
      deleteDoc(doc(userApp.firestore(), 'totems', mockTotem.id))
    ).rejects.toThrow();
  });
});

// ======================================
// PLANNED COLLECTION TESTS
// ======================================

describe('Future collection rules', () => {
  test('Users can read their own userActivities data', async () => {
    // Setup: Create a user activity document
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'userActivities', USER_ID, 'posts', 'test-post-id'),
        {
          postId: 'test-post-id',
          question: 'Test question?',
          createdAt: TEST_TIMESTAMP,
          lastInteraction: TEST_TIMESTAMP,
          answerCount: 0,
          categories: ['test']
        }
      );
    });
    
    const userApp = testEnv.authenticatedContext(USER_ID);
    
    // Test: User can read their own activity
    const activityDoc = await getDoc(
      doc(userApp.firestore(), 'userActivities', USER_ID, 'posts', 'test-post-id')
    );
    
    expect(activityDoc.exists()).toBe(true);
    expect(activityDoc.data().question).toBe('Test question?');
  });
  
  test('Users cannot read other users\' activity data', async () => {
    // Setup: Create a user activity document
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'userActivities', USER_ID, 'posts', 'test-post-id'),
        {
          postId: 'test-post-id',
          question: 'Test question?',
          createdAt: TEST_TIMESTAMP,
          lastInteraction: TEST_TIMESTAMP,
          answerCount: 0,
          categories: ['test']
        }
      );
    });
    
    const otherUserApp = testEnv.authenticatedContext(OTHER_USER_ID);
    
    // Test: Other user cannot read the activity
    await expect(
      getDoc(doc(otherUserApp.firestore(), 'userActivities', USER_ID, 'posts', 'test-post-id'))
    ).rejects.toThrow();
  });
  
  test('Users cannot write directly to userActivities', async () => {
    const userApp = testEnv.authenticatedContext(USER_ID);
    
    // Test: Try to write to userActivities
    await expect(
      setDoc(
        doc(userApp.firestore(), 'userActivities', USER_ID, 'posts', 'test-post-id'),
        {
          postId: 'test-post-id',
          question: 'Test question?',
          createdAt: TEST_TIMESTAMP,
          lastInteraction: TEST_TIMESTAMP,
          answerCount: 0,
          categories: ['test']
        }
      )
    ).rejects.toThrow();
  });
  
  test('Users can create their own collections', async () => {
    const userApp = testEnv.authenticatedContext(USER_ID);
    
    // Test: Create a collection
    await expect(
      setDoc(
        doc(userApp.firestore(), 'userCollections', USER_ID, 'collections', 'test-collection'),
        {
          id: 'test-collection',
          name: 'Test Collection',
          description: 'A test collection',
          isPublic: false,
          createdAt: TEST_TIMESTAMP,
          updatedAt: TEST_TIMESTAMP,
          itemCount: 0,
          folders: [],
          displayOrder: 0
        }
      )
    ).resolves.not.toThrow();
  });
  
  test('Users cannot create collections for others', async () => {
    const otherUserApp = testEnv.authenticatedContext(OTHER_USER_ID);
    
    // Test: Try to create a collection for another user
    await expect(
      setDoc(
        doc(otherUserApp.firestore(), 'userCollections', USER_ID, 'collections', 'test-collection'),
        {
          id: 'test-collection',
          name: 'Test Collection',
          description: 'A test collection',
          isPublic: false,
          createdAt: TEST_TIMESTAMP,
          updatedAt: TEST_TIMESTAMP,
          itemCount: 0,
          folders: [],
          displayOrder: 0
        }
      )
    ).rejects.toThrow();
  });
  
  test('Public collections can be read by any authenticated user', async () => {
    // Setup: Create a public collection
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'userCollections', USER_ID, 'collections', 'public-collection'),
        {
          id: 'public-collection',
          name: 'Public Collection',
          description: 'A public test collection',
          isPublic: true,
          createdAt: TEST_TIMESTAMP,
          updatedAt: TEST_TIMESTAMP,
          itemCount: 0,
          folders: [],
          displayOrder: 0
        }
      );
    });
    
    const otherUserApp = testEnv.authenticatedContext(OTHER_USER_ID);
    
    // Test: Other user can read public collection
    const collectionDoc = await getDoc(
      doc(otherUserApp.firestore(), 'userCollections', USER_ID, 'collections', 'public-collection')
    );
    
    expect(collectionDoc.exists()).toBe(true);
    expect(collectionDoc.data().name).toBe('Public Collection');
  });
}); 