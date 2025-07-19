"use client";

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, limit } from 'firebase/firestore';

export default function FirebaseTestPage() {
  const [firebaseConfig, setFirebaseConfig] = useState<any>(null);
  const [totemsCount, setTotemsCount] = useState<number | null>(null);
  const [usersCount, setUsersCount] = useState<number | null>(null);
  const [postsCount, setPostsCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function testFirebase() {
      try {
        console.log('🧪 Testing Firebase Configuration...');
        
        // Check Firebase config
        const config = {
          projectId: db.app.options.projectId,
          authDomain: db.app.options.authDomain,
          apiKey: db.app.options.apiKey ? '***' : 'missing',
          storageBucket: db.app.options.storageBucket,
          messagingSenderId: db.app.options.messagingSenderId,
          appId: db.app.options.appId
        };
        
        setFirebaseConfig(config);
        console.log('Firebase config:', config);
        
        // Test totems collection
        console.log('Testing totems collection...');
        const totemsRef = collection(db, 'totems');
        const totemsQuery = query(totemsRef, limit(10));
        const totemsSnapshot = await getDocs(totemsQuery);
        setTotemsCount(totemsSnapshot.docs.length);
        console.log(`Found ${totemsSnapshot.docs.length} totems`);
        
        if (totemsSnapshot.docs.length > 0) {
          console.log('Sample totem:', totemsSnapshot.docs[0].data());
        }
        
        // Test users collection
        console.log('Testing users collection...');
        const usersRef = collection(db, 'users');
        const usersQuery = query(usersRef, limit(10));
        const usersSnapshot = await getDocs(usersQuery);
        setUsersCount(usersSnapshot.docs.length);
        console.log(`Found ${usersSnapshot.docs.length} users`);
        
        // Test posts collection
        console.log('Testing posts collection...');
        const postsRef = collection(db, 'posts');
        const postsQuery = query(postsRef, limit(10));
        const postsSnapshot = await getDocs(postsQuery);
        setPostsCount(postsSnapshot.docs.length);
        console.log(`Found ${postsSnapshot.docs.length} posts`);
        
        console.log('✅ Firebase test completed successfully!');
        
      } catch (err) {
        console.error('❌ Firebase test failed:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    
    testFirebase();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Firebase Configuration Test</h1>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800">Testing Firebase connection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Firebase Configuration Test</h1>
      
      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <h2 className="text-red-800 font-semibold mb-2">❌ Error</h2>
          <p className="text-red-700">{error}</p>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <h2 className="text-green-800 font-semibold mb-2">✅ Success</h2>
          <p className="text-green-700">Firebase connection working!</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold mb-2">Firebase Configuration</h3>
          <pre className="text-sm bg-gray-50 p-2 rounded overflow-auto">
            {JSON.stringify(firebaseConfig, null, 2)}
          </pre>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold mb-2">Database Collections</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Totems:</span>
              <span className="font-mono">{totemsCount ?? '...'}</span>
            </div>
            <div className="flex justify-between">
              <span>Users:</span>
              <span className="font-mono">{usersCount ?? '...'}</span>
            </div>
            <div className="flex justify-between">
              <span>Posts:</span>
              <span className="font-mono">{postsCount ?? '...'}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-4">
        <h3 className="font-semibold mb-2">Environment Variables</h3>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div>NEXT_PUBLIC_FIREBASE_PROJECT_ID: {process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'missing'}</div>
            <div>NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: {process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'missing'}</div>
            <div>NEXT_PUBLIC_FIREBASE_API_KEY: {process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '***' : 'missing'}</div>
            <div>NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: {process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'missing'}</div>
          </div>
        </div>
      </div>
    </div>
  );
} 