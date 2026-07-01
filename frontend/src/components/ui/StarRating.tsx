import React, { useState } from 'react';
import { Star, StarHalf } from 'lucide-react';

interface StarRatingProps {
  value: number | null;
  size?: number;
  onChange?: (score: number) => void;
}

const STARS = [1, 2, 3, 4, 5];

export default function StarRating({ value, size = 20, onChange }: StarRatingProps) {
  const [hover, setHover] = useState<number | null>(null);
  const interactive = typeof onChange === 'function';
  const displayValue = hover ?? value ?? 0;

  function handleClick(star: number, e: React.MouseEvent<HTMLButtonElement>) {
    if (!onChange) return;
    const isHalf = e.nativeEvent.offsetX < (e.currentTarget as HTMLElement).offsetWidth / 2;
    onChange(isHalf ? star - 0.5 : star);
  }

  function handleMove(star: number, e: React.MouseEvent<HTMLButtonElement>) {
    if (!interactive) return;
    const isHalf = e.nativeEvent.offsetX < (e.currentTarget as HTMLElement).offsetWidth / 2;
    setHover(isHalf ? star - 0.5 : star);
  }

  return (
    <div className="flex items-center gap-0.5" onMouseLeave={() => setHover(null)}>
      {STARS.map((star) => {
        const filled = displayValue >= star;
        const half = !filled && displayValue >= star - 0.5;
        const Icon = half ? StarHalf : Star;
        return (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={(e) => handleClick(star, e)}
            onMouseMove={(e) => handleMove(star, e)}
            className={interactive ? 'cursor-pointer' : 'cursor-default'}
          >
            <Icon size={size} className={filled || half ? 'text-gold-500 fill-gold-500' : 'text-gray-300'} />
          </button>
        );
      })}
    </div>
  );
}
