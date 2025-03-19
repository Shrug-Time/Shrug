import '@testing-library/jest-dom';

// Mock Firebase for tests
jest.mock('@/firebase', () => ({
  auth: {
    currentUser: null,
  },
  db: {},
})); 