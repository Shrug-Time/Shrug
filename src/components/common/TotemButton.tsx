import { MouseEvent, memo, useCallback, useMemo } from 'react';
import { auth } from '@/firebase';

interface TotemButtonProps {
  name: string;
  likes: number;
  crispness?: number;
  onLike?: (e: MouseEvent<HTMLButtonElement>) => void;
  onRefresh?: (e: MouseEvent<HTMLButtonElement>) => void;
}

function TotemButtonBase({ name, likes, crispness, onLike, onRefresh }: TotemButtonProps) {
  const getTotemColor = useCallback((name: string) => {
    switch (name.toLowerCase()) {
      case "all-natural":
        return "#4CAF50";
      case "name brand":
        return "#9C27B0";
      case "chicken-based":
        return "#FFCA28";
      default:
        // Generate a consistent color based on the name
        const hash = name.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
        const hue = hash % 360;
        return `hsl(${hue}, 70%, 45%)`;
    }
  }, []);

  const backgroundColor = useMemo(() => getTotemColor(name), [getTotemColor, name]);
  const isAuthenticated = auth.currentUser !== null;

  return (
    <div className={`inline-flex items-center bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow ${!isAuthenticated ? 'opacity-75' : ''}`}>
      <button
        className="px-4 py-2 rounded-l-lg text-white hover:opacity-90 text-sm font-medium flex items-center justify-center min-w-[100px]"
        style={{ backgroundColor }}
        disabled={!isAuthenticated}
      >
        {name}
      </button>
      <button
        onClick={onLike}
        className="px-3 py-2 rounded-r-lg text-white hover:opacity-90 text-sm font-medium flex items-center justify-center min-w-[40px]"
        style={{ backgroundColor }}
        disabled={!isAuthenticated}
        title={!isAuthenticated ? "Log in to interact" : undefined}
      >
        {likes}
      </button>
      {crispness !== undefined && (
        <div className="ml-2 text-sm text-gray-600 whitespace-nowrap">
          {Math.round(crispness)}% fresh
        </div>
      )}
    </div>
  );
}

function propsAreEqual(prevProps: TotemButtonProps, nextProps: TotemButtonProps) {
  return (
    prevProps.name === nextProps.name &&
    prevProps.likes === nextProps.likes &&
    prevProps.crispness === nextProps.crispness &&
    prevProps.onLike === nextProps.onLike &&
    prevProps.onRefresh === nextProps.onRefresh
  );
}

export const TotemButton = memo(TotemButtonBase, propsAreEqual); 