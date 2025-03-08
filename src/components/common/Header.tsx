import Link from "next/link";

interface HeaderProps {
  refreshCount: number;
  isVerified: boolean;
  onLogout: () => void;
}

export function Header({ refreshCount, isVerified, onLogout }: HeaderProps) {
  return (
    <header className="bg-white shadow">
      <div className="max-w-4xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-2xl font-bold text-gray-900">
              Shrug
            </Link>
            <div className="text-sm text-gray-600">
              {refreshCount} refreshes left today
            </div>
          </div>
          <div className="flex items-center space-x-4">
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
          </div>
        </div>
      </div>
    </header>
  );
} 