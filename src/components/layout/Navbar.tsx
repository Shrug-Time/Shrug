import { useState } from 'react';
import Link from 'next/link';
import { useUser } from '@/hooks/useUser';
import { AuthModal } from '@/components/auth/AuthModal';
import { CreatePostModal } from '@/components/posts/CreatePostModal';
import { SearchBar } from '@/components/common/SearchBar';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useSubscription } from '@/contexts/SubscriptionContext';

export function Navbar() {
  const { profile } = useUser();
  const { isPremium } = useSubscription();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="w-full pl-2 pr-4">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center ml-4">
              <span className="text-xl font-bold text-gray-800">Shrug</span>
            </Link>
          </div>

          {/* Search Bar - Aligned with content */}
          <div className="flex-1 max-w-2xl -ml-32 mr-8 flex items-center">
            <div className="w-full py-2">
              <SearchBar 
                placeholder="Search questions, users, totems..."
                showSuggestions={true}
                className="w-full"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {profile ? (
              <>
                <button
                  onClick={() => setIsCreatePostModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  New Question
                </button>
                <div className="flex items-center space-x-4">
                  <Link
                    href="/profile"
                    className="text-gray-700 hover:text-gray-900 font-medium cursor-pointer"
                  >
                    {profile.name}
                  </Link>
                  <img
                    src={profile.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${profile.name}`}
                    alt="Profile"
                    className="h-8 w-8 rounded-full"
                  />
                  <button
                    onClick={handleLogout}
                    className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Login / Sign Up
              </button>
            )}
          </div>
        </div>
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
      <CreatePostModal
        isOpen={isCreatePostModalOpen}
        onClose={() => setIsCreatePostModalOpen(false)}
      />
    </nav>
  );
} 