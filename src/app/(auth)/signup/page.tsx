import Link from "next/link";

import { SignUpForm } from "./SignUpForm";

export const metadata = { title: "Create an account · FreshFork" };

export default function SignUpPage() {
  return (
    <div className="max-w-sm mx-auto px-4 py-12">
      <div className="text-center space-y-1.5 mb-6">
        <h1 className="font-display text-2xl font-semibold">Pull up a chair at the table.</h1>
        <p className="text-sm text-muted-foreground">
          One account, two ways to use it — order dinner tonight, or start cooking for the block.
        </p>
      </div>

      <div className="bg-card rounded-2xl border border-border p-6">
        <SignUpForm />
      </div>

      <p className="text-center text-sm text-muted-foreground mt-5">
        Already have an account?{" "}
        <Link href="/signin" className="text-primary font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
