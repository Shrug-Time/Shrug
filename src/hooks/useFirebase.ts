import { useContext } from 'react';
import { FirebaseContext } from '../components/FirebaseProvider';

/**
 * Custom hook to access Firebase instances from context
 * @returns Firebase db, auth, and initialization status
 */
export default function useFirebase() {
  const context = useContext(FirebaseContext);
  
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  
  return context;
} 