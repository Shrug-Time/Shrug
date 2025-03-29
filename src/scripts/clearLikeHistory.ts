import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC4fPp7Z9qXw-wSckSUe_B4mJ3vhfxgzdk",
  authDomain: "shrug-cc452.firebaseapp.com",
  projectId: "shrug-cc452",
  storageBucket: "shrug-cc452.firebasestorage.app",
  messagingSenderId: "642784282734",
  appId: "1:642784282734:web:f0009191b880335c7f3e7f"
};

interface Totem {
  name: string;
  likeHistory?: any[];
  [key: string]: any;
}

interface Answer {
  totems?: Totem[];
  [key: string]: any;
}

interface Post {
  answers?: Answer[];
  [key: string]: any;
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function clearLikeHistory() {
  try {
    console.log('Starting to clear likeHistory...');
    
    // Get all posts
    const postsSnapshot = await getDocs(collection(db, 'posts'));
    let clearedCount = 0;
    let totemsCleared = 0;
    
    for (const postDoc of postsSnapshot.docs) {
      const post = postDoc.data() as Post;
      let wasUpdated = false;
      
      // Check if post has answers with totems
      if (post.answers && Array.isArray(post.answers)) {
        const updatedAnswers = post.answers.map(answer => {
          if (answer.totems && Array.isArray(answer.totems)) {
            // Clear likeHistory for each totem
            const updatedTotems = answer.totems.map((totem: Totem) => {
              if (totem.likeHistory && totem.likeHistory.length > 0) {
                totemsCleared++;
                return {
                  ...totem,
                  likeHistory: []
                };
              }
              return totem;
            });
            
            const totems = answer.totems || [];
            if (updatedTotems.some((t: Totem, i: number) => t.likeHistory !== totems[i].likeHistory)) {
              wasUpdated = true;
              return {
                ...answer,
                totems: updatedTotems
              };
            }
          }
          return answer;
        });
        
        if (wasUpdated) {
          // Update the post with cleared likeHistory
          await updateDoc(doc(db, 'posts', postDoc.id), {
            answers: updatedAnswers
          });
          clearedCount++;
          console.log(`Cleared likeHistory for post: ${postDoc.id}`);
        }
      }
    }
    
    console.log(`Successfully cleared likeHistory for ${clearedCount} posts (${totemsCleared} totems affected)`);
  } catch (error) {
    console.error('Error clearing likeHistory:', error);
  }
}

// Run the script
clearLikeHistory(); 