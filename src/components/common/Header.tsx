interface HeaderProps {
  refreshCount: number;
  isVerified: boolean;
  onLogout: () => void;
}

export function Header({ refreshCount, isVerified, onLogout }: HeaderProps) {
  return (
    <header className="bg-white shadow">
      <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-blue-500">Shrug</h1>
          <p className="text-sm text-gray-500">Refreshes Left: {refreshCount}</p>
          <p className="text-sm text-gray-500">
            Status: {isVerified ? "Verified" : "Not Verified"}
          </p>
        </div>
        <button
          onClick={onLogout}
          className="px-4 py-2 border border-red-500 text-red-500 rounded-full hover:bg-red-500 hover:text-white"
        >
          Log Out
        </button>
      </div>
    </header>
  );
} 