import { Star } from "lucide-react";

import { cn } from "@/lib/cn";

export function Stars({ rating, small = false }: { rating: number; small?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", small ? "text-xs" : "text-sm")}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            small ? "w-3 h-3" : "w-3.5 h-3.5",
            i <= Math.round(rating) ? "fill-primary text-primary" : "fill-muted text-muted-foreground",
          )}
        />
      ))}
      <span className="ml-1 text-foreground font-medium">{rating.toFixed(1)}</span>
    </span>
  );
}
