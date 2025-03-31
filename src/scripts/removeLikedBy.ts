import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
  likedBy?: string[];
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

async function removeLikedBy() {
  try {
    console.log('Starting to remove likedBy arrays...');
    
    // Get all posts
    const postsSnapshot = await getDocs(collection(db, 'posts'));
    let updatedCount = 0;
    let totemsUpdated = 0;
    
    for (const postDoc of postsSnapshot.docs) {
      const post = postDoc.data() as Post;
      let wasUpdated = false;
      
      // Check if post has answers with totems
      if (post.answers && Array.isArray(post.answers)) {
        const updatedAnswers = post.answers.map(answer => {
          if (answer.totems && Array.isArray(answer.totems)) {
            // Remove likedBy from each totem
            const updatedTotems = answer.totems.map((totem: Totem) => {
              if (totem.likedBy) {
                totemsUpdated++;
                const { likedBy, ...totemWithoutLikedBy } = totem;
                return totemWithoutLikedBy;
              }
              return totem;
            });
            
            const totems = answer.totems || [];
            if (updatedTotems.some((t: Totem, i: number) => !t.likedBy)) {
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
          // Update the post with removed likedBy arrays
          await updateDoc(doc(db, 'posts', postDoc.id), {
            answers: updatedAnswers
          });
          updatedCount++;
          console.log(`Removed likedBy arrays from post: ${postDoc.id}`);
        }
      }
    }
    
    console.log(`Successfully removed likedBy arrays from ${updatedCount} posts (${totemsUpdated} totems affected)`);
  } catch (error) {
    console.error('Error removing likedBy arrays:', error);
  }
}

// Run the script
removeLikedBy(); 