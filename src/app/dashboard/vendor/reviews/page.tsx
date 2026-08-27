import { redirect } from "next/navigation";
import { Star } from "lucide-react";

import { requireRole } from "@/lib/auth";
import { getOwnVendor } from "@/lib/vendors-data";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/empty-state";
import { Stars } from "@/components/ui/stars";
import { ReplyForm } from "./ReplyForm";
import type { Review } from "@/lib/supabase/database.types";

export const metadata = { title: "Reviews · FreshFork" };

export default async function VendorReviewsPage() {
  await requireRole("vendor", "/dashboard/vendor/reviews");
  const vendor = await getOwnVendor();
  if (!vendor) redirect("/dashboard/vendor/onboarding/business");

  const supabase = await createClient();
  const { data: reviews } = await supabase
    .from("reviews")
    .select("*")
    .eq("vendor_id", vendor.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const list = (reviews ?? []) as Review[];
  const avgRating = list.length ? list.reduce((sum, r) => sum + r.rating, 0) / list.length : 0;
  const distribution = [5, 4, 3, 2, 1].map((n) => ({
    n,
    count: list.filter((r) => r.rating === n).length,
  }));

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <h1 className="font-display text-2xl font-semibold">Reviews</h1>

      {list.length === 0 ? (
        <EmptyState icon={Star} title="No reviews yet" body="Reviews appear here once customers pick up their first order." />
      ) : (
        <>
          <div className="flex items-center gap-4">
            <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
              </div>
              <div>
                <p className="font-display text-2xl font-semibold">{avgRating.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">
                  {list.length} {list.length === 1 ? "review" : "reviews"}
                </p>
              </div>
            </div>
            <div className="bg-card rounded-2xl border border-border p-4 flex-1 space-y-1.5">
              {distribution.slice(0, 3).map(({ n, count }) => (
                <div key={n} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-3">{n}</span>
                  <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full"
                      style={{ width: `${list.length ? Math.round((count / list.length) * 100) : 0}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-4 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {list.map((review) => (
              <div key={review.id} className="bg-card rounded-2xl border border-border p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <Stars rating={review.rating} small />
                  <span className="text-xs text-muted-foreground">
                    {new Date(review.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
                {review.body ? <p className="text-sm text-foreground leading-relaxed">{review.body}</p> : null}
                {review.is_hidden ? (
                  <p className="text-xs text-destructive font-medium">Hidden by moderation{review.hidden_reason ? `: ${review.hidden_reason}` : ""}</p>
                ) : null}
                <ReplyForm reviewId={review.id} existingReply={review.vendor_reply} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
