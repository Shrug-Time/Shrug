import Link from "next/link";
import { useState } from "react";
import { AuthModal } from "@/components/auth/AuthModal";

interface HeaderProps {
  refreshCount: number;
  isVerified: boolean;
  onLogout: () => void;
  isAuthenticated?: boolean;
}

export function Header({ refreshCount, isVerified, onLogout, isAuthenticated = false }: HeaderProps) {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  return (
    <>
      <header className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-2xl font-bold text-gray-900">
                Shrug
              </Link>
              {isAuthenticated && (
                <div className="text-sm text-gray-600">
                  {refreshCount} refreshes left today
                </div>
              )}
            </div>
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  <Link
                    href="/profile"
                    className="px-4 py-2 text-gray-700 hover:text-gray-900"
                  >
                    Profile
                  </Link>
                  <button
                    onClick={onLogout}
                    className="px-4 py-2 text-red-600 hover:text-red-700"
                  >
                    Logout
                  </button>
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
      </header>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </>
  );
} 