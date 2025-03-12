import { useState } from 'react';
import Link from 'next/link';
import { useUser } from '@/hooks/useUser';
import { AuthModal } from '@/components/auth/AuthModal';

export function Navbar() {
  const { profile } = useUser();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link href="/" className="flex items-center">
              <span className="text-xl font-bold text-gray-800">Shrug</span>
            </Link>
          </div>
          
          <div className="flex items-center">
            {profile ? (
              <div className="flex items-center space-x-4">
                <span className="text-gray-700">{profile.name}</span>
                <img
                  src={profile.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${profile.name}`}
                  alt="Profile"
                  className="h-8 w-8 rounded-full"
                />
              </div>
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
    </nav>
  );
} 