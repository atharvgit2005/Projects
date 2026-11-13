"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import Link from "next/link";
import { BarChart3, Heart, MessageSquare, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/client";
import { Button } from "@/components/shared/ui";

export function ProductActions({
  productId,
  compact = false,
}: {
  productId: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const runAction = (request: () => Promise<unknown>, message: string) => {
    startTransition(async () => {
      try {
        await request();
        toast.success(message);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Something went wrong");
      }
    });
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size={compact ? "sm" : "md"}
        onClick={() =>
          runAction(
            () => apiFetch("/api/cart", { method: "POST", body: JSON.stringify({ productId, quantity: 1 }) }),
            "Added to cart",
          )
        }
        disabled={isPending}
      >
        <ShoppingCart className="mr-2 h-4 w-4" />
        {isPending ? "Updating..." : "Add to cart"}
      </Button>
      <Button
        size={compact ? "sm" : "md"}
        variant="secondary"
        onClick={() =>
          runAction(
            () => apiFetch("/api/wishlist", { method: "POST", body: JSON.stringify({ productId }) }),
            "Wishlist updated",
          )
        }
        disabled={isPending}
      >
        <Heart className="mr-2 h-4 w-4" />
        Wishlist
      </Button>
      <Button
        size={compact ? "sm" : "md"}
        variant="ghost"
        onClick={() =>
          runAction(
            () => apiFetch("/api/compare", { method: "POST", body: JSON.stringify({ productId }) }),
            "Compare list updated",
          )
        }
        disabled={isPending}
      >
        <BarChart3 className="mr-2 h-4 w-4" />
        Compare
      </Button>
      {!compact ? (
        <Link
          href="/contact"
          className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-white transition hover:bg-white/10"
        >
          <MessageSquare className="mr-2 h-4 w-4" />
          Ask the shop
        </Link>
      ) : null}
    </div>
  );
}
