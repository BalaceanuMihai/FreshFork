import { signOut } from "@/lib/actions/auth";

export function SignOutButton({ className = "" }: { className?: string }) {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className={`rounded-full border border-line px-4 py-2 text-[13px] font-medium text-forest ${className}`}
      >
        Sign out
      </button>
    </form>
  );
}
