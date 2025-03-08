import { MouseEvent } from 'react';

interface TotemButtonProps {
  name: string;
  likes: number;
  crispness?: number;
  onLike?: (e: MouseEvent<HTMLButtonElement>) => void;
  onRefresh?: (e: MouseEvent<HTMLButtonElement>) => void;
}

export function TotemButton({ name, likes, crispness, onLike, onRefresh }: TotemButtonProps) {
  const getTotemColor = (name: string) => {
    switch (name) {
      case "All-Natural":
        return "#4CAF50";
      case "Name Brand":
        return "#9C27B0";
      case "Chicken-Based":
        return "#FFCA28";
      default:
        return "#808080";
    }
  };

  const backgroundColor = getTotemColor(name);

  return (
    <div className="flex flex-col items-end">
      <div className="space-y-2">
        <div className="flex items-center">
          <button
            className="px-4 py-2 w-[120px] h-[40px] rounded-l-full text-white hover:opacity-90 text-sm font-medium shadow-md border-r border-white/20"
            style={{ backgroundColor }}
          >
            {name}
          </button>
          <button
            onClick={onLike}
            className="px-2 py-2 h-[40px] rounded-r-full text-white hover:opacity-90 text-sm font-medium shadow-md flex items-center"
            style={{ backgroundColor }}
          >
            {likes}
          </button>
          {crispness !== undefined && (
            <div className="ml-2 text-sm text-gray-600">
              {Math.round(crispness)}% fresh
            </div>
          )}
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="text-sm text-blue-500 hover:underline"
          >
            Refresh Crispness
          </button>
        )}
      </div>
    </div>
  );
} 