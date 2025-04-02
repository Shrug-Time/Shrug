// Firebase configuration for scripts
// This file extracts the Firebase config from the main app

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Extracts Firebase configuration from the main application
 * @returns {Object} Firebase configuration object
 */
export function getFirebaseConfig() {
  try {
    // Path to the firebase.ts file
    const firebaseConfigPath = path.resolve(__dirname, '..', 'firebase.ts');
    console.log(`Looking for Firebase config at: ${firebaseConfigPath}`);
    
    if (!fs.existsSync(firebaseConfigPath)) {
      throw new Error(`Firebase config file not found at: ${firebaseConfigPath}`);
    }
    
    const firebaseFile = fs.readFileSync(firebaseConfigPath, 'utf8');
    
    // Create a simpler, more reliable way to extract Firebase config
    // Look for each property individually
    const config = {};
    
    // Extract apiKey
    const apiKeyMatch = firebaseFile.match(/apiKey:\s*["']([^"']+)["']/);
    if (apiKeyMatch && apiKeyMatch[1]) {
      config.apiKey = apiKeyMatch[1];
    }
    
    // Extract authDomain
    const authDomainMatch = firebaseFile.match(/authDomain:\s*["']([^"']+)["']/);
    if (authDomainMatch && authDomainMatch[1]) {
      config.authDomain = authDomainMatch[1];
    }
    
    // Extract projectId
    const projectIdMatch = firebaseFile.match(/projectId:\s*["']([^"']+)["']/);
    if (projectIdMatch && projectIdMatch[1]) {
      config.projectId = projectIdMatch[1];
    }
    
    // Extract storageBucket
    const storageBucketMatch = firebaseFile.match(/storageBucket:\s*["']([^"']+)["']/);
    if (storageBucketMatch && storageBucketMatch[1]) {
      config.storageBucket = storageBucketMatch[1];
    }
    
    // Extract messagingSenderId
    const messagingSenderIdMatch = firebaseFile.match(/messagingSenderId:\s*["']([^"']+)["']/);
    if (messagingSenderIdMatch && messagingSenderIdMatch[1]) {
      config.messagingSenderId = messagingSenderIdMatch[1];
    }
    
    // Extract appId
    const appIdMatch = firebaseFile.match(/appId:\s*["']([^"']+)["']/);
    if (appIdMatch && appIdMatch[1]) {
      config.appId = appIdMatch[1];
    }
    
    // Ensure we have the required fields
    const requiredFields = ['apiKey', 'authDomain', 'projectId'];
    const missingFields = requiredFields.filter(field => !config[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required Firebase config fields: ${missingFields.join(', ')}`);
    }
    
    console.log('Successfully loaded Firebase configuration');
    
    return config;
  } catch (error) {
    console.error('Error loading Firebase config:', error);
    throw error;
  }
} 