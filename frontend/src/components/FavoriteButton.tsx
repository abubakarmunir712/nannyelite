import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  isFavorite: boolean;
  loading: boolean;
  onClick: (e?: React.MouseEvent) => void;
  className?: string;
  size?: "sm" | "md";
}

const FavoriteButton = ({ isFavorite, loading, onClick, className, size = "sm" }: FavoriteButtonProps) => {
  const sizeClasses = size === "sm" ? "w-8 h-8" : "w-10 h-10";
  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <button
      data-testid="favorite-button"
      onClick={onClick}
      disabled={loading}
      className={cn(
        "rounded-full flex items-center justify-center transition-all",
        "bg-card/80 backdrop-blur-sm hover:bg-card border border-border shadow-sm",
        loading && "opacity-50",
        className,
        sizeClasses
      )}
      aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
    >
      <Heart
        className={cn(
          iconSize,
          "transition-colors",
          isFavorite ? "fill-destructive text-destructive" : "text-muted-foreground hover:text-destructive"
        )}
      />
    </button>
  );
};

export default FavoriteButton;
