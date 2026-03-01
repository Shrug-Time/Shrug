import { useState, useEffect, useRef } from 'react';
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      {/* Mobile Layout */}
      <div className="lg:hidden w-full pl-2 pr-4">
        <div className="flex h-16">
          <div className="relative flex items-center w-full">
            <Link href="/" className="flex items-center ml-2 flex-shrink-0 z-10">
              <span className="text-lg font-bold text-gray-800">Shrug</span>
            </Link>

            {/* Search Bar - Absolute left position at 90px, shrinks from right on mobile */}
            <div className="absolute left-[90px] right-[120px]">
              <SearchBar
                placeholder="Search..."
                showSuggestions={true}
                className="w-full"
              />
            </div>

            {/* User controls - visible on mobile */}
            <div className="relative flex items-center space-x-2 flex-shrink-0 ml-auto z-10">
              {profile ? (
                <>
                  <button
                    onClick={() => setIsCreatePostModalOpen(true)}
                    className="inline-flex items-center px-2 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    + New
                  </button>
                  <div className="relative" ref={menuRef}>
                    <button
                      onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                      className="flex items-center"
                    >
                      <img
                        src={profile.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${profile.name}`}
                        alt="Profile"
                        className="h-7 w-7 rounded-full"
                        referrerPolicy="no-referrer"
                        onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${profile.name}`; }}
                      />
                    </button>

                    {/* Dropdown Menu */}
                    {isMobileMenuOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                        <Link
                          href="/profile"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Profile
                        </Link>
                        <button
                          onClick={() => {
                            setIsMobileMenuOpen(false);
                            handleLogout();
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Logout
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Login
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:block w-full">
        <div className="h-16 grid items-center pr-4" style={{ gridTemplateColumns: '16rem 1fr auto' }}>
          {/* Logo - exactly 16rem wide, matching sidebar width */}
          <div className="pl-4">
            <Link href="/" className="flex items-center">
              <span className="text-xl font-bold text-gray-800">Shrug</span>
            </Link>
          </div>

          {/* Search Bar - middle column, px-4 makes left edge land at 272px matching cards */}
          <div className="px-4">
            <SearchBar
              placeholder="Search questions, users, totems..."
              showSuggestions={true}
              className="w-full"
            />
          </div>

          {/* User controls - right column, can never overlap search */}
          <div className="flex items-center space-x-4">
            {profile ? (
              <>
                <button
                  onClick={() => setIsCreatePostModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 whitespace-nowrap"
                >
                  New Question
                </button>
                <Link
                  href="/profile"
                  className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
                >
                  <span className="text-gray-700 hover:text-gray-900 font-medium whitespace-nowrap">{profile.name}</span>
                  <img
                    src={profile.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${profile.name}`}
                    alt="Profile"
                    className="h-8 w-8 rounded-full flex-shrink-0"
                    referrerPolicy="no-referrer"
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${profile.name}`; }}
                  />
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap"
                >
                  Logout
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 whitespace-nowrap"
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