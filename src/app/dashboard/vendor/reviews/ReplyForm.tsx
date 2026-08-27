"use client";

import { useActionState, useState } from "react";
import { Check, ChefHat, Send } from "lucide-react";

import { replyToReview, type CommunityFormState } from "@/lib/actions/community";
import { Textarea } from "@/components/ui/field";

export function ReplyForm({ reviewId, existingReply }: { reviewId: string; existingReply: string | null }) {
  const [state, formAction, pending] = useActionState<CommunityFormState, FormData>(replyToReview, {});
  const [editing, setEditing] = useState(false);

  if (existingReply && !editing) {
    return (
      <div className="bg-secondary rounded-xl p-3 space-y-1">
        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <ChefHat className="w-3 h-3" /> Your reply
          {state.ok ? (
            <span className="text-green-600 ml-2 flex items-center gap-0.5">
              <Check className="w-3 h-3" /> Saved
            </span>
          ) : null}
        </p>
        <p className="text-sm">{existingReply}</p>
        <button type="button" onClick={() => setEditing(true)} className="text-xs text-muted-foreground hover:text-foreground mt-1">
          Edit reply
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="review_id" value={reviewId} />
      <Textarea name="reply" defaultValue={existingReply ?? ""} rows={2} maxLength={1000} placeholder="Write a reply to this review…" />
      {state.error ? (
        <p className="text-xs text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        {editing ? (
          <button type="button" onClick={() => setEditing(false)} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1.5">
            Cancel
          </button>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          onClick={() => setEditing(false)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-accent transition-colors disabled:opacity-40"
        >
          <Send className="w-3 h-3" /> {pending ? "Posting…" : "Post reply"}
        </button>
      </div>
    </form>
  );
}
