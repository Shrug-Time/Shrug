// Test script to verify search functionality
const { SearchService } = require('./src/services/standardized/SearchService');

async function testSearch() {
  console.log('🧪 Testing Search Functionality...\n');
  
  try {
    // Test 1: Search for totems
    console.log('1. Testing totem search...');
    const totemResults = await SearchService.search('Action', { types: ['totem'], limit: 5 });
    console.log(`Found ${totemResults.length} totem results:`, totemResults.map(r => r.title));
    
    // Test 2: Search for users
    console.log('\n2. Testing user search...');
    const userResults = await SearchService.search('test', { types: ['user'], limit: 5 });
    console.log(`Found ${userResults.length} user results:`, userResults.map(r => r.title));
    
    // Test 3: Search for posts
    console.log('\n3. Testing post search...');
    const postResults = await SearchService.search('question', { types: ['post'], limit: 5 });
    console.log(`Found ${postResults.length} post results:`, postResults.map(r => r.title));
    
    // Test 4: Unified search
    console.log('\n4. Testing unified search...');
    const unifiedResults = await SearchService.search('test', { types: ['post', 'user', 'totem'], limit: 10 });
    console.log(`Found ${unifiedResults.length} total results`);
    console.log('Results by type:', {
      posts: unifiedResults.filter(r => r.type === 'post').length,
      users: unifiedResults.filter(r => r.type === 'user').length,
      totems: unifiedResults.filter(r => r.type === 'totem').length
    });
    
    // Test 5: Suggestions
    console.log('\n5. Testing suggestions...');
    const suggestions = await SearchService.getSuggestions('act', 5);
    console.log(`Found ${suggestions.length} suggestions:`, suggestions);
    
    console.log('\n✅ Search functionality test completed successfully!');
    
  } catch (error) {
    console.error('❌ Search test failed:', error);
  }
}

// Run the test
testSearch(); 