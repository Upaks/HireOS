import { useState } from "react";
import { Star } from "lucide-react";

interface StarRatingProps {
  value: number;
  onChange?: (rating: number) => void;
  disabled?: boolean;
  max?: number;
}

export default function StarRating({
  value,
  onChange,
  disabled = false,
  max = 5
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  
  const handleMouseOver = (index: number) => {
    if (disabled) return;
    setHoverValue(index);
  };
  
  const handleMouseLeave = () => {
    setHoverValue(null);
  };
  
  const handleClick = (index: number) => {
    if (disabled) return;
    // If clicking the same star again, clear the rating
    const newValue = value === index ? 0 : index;
    onChange && onChange(newValue);
  };
  
  const getColor = (index: number) => {
    if (hoverValue !== null) {
      return index <= hoverValue ? "text-yellow-400" : "text-slate-300";
    }
    return index <= value ? "text-yellow-400" : "text-slate-300";
  };
  
  return (
    <div className="flex gap-1">
      {[...Array(max)].map((_, index) => {
        const ratingValue = index + 1;
        return (
          <Star
            key={index}
            size={20}
            className={`cursor-pointer ${getColor(ratingValue)} ${
              disabled ? "cursor-not-allowed opacity-70" : "hover:scale-110 transition-transform duration-100"
            }`}
            fill={ratingValue <= (hoverValue ?? value) ? "currentColor" : "none"}
            onClick={() => handleClick(ratingValue)}
            onMouseOver={() => handleMouseOver(ratingValue)}
            onMouseLeave={handleMouseLeave}
          />
        );
      })}
    </div>
  );
}