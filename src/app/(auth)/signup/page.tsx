import Link from "next/link";

import { SiteNav } from "@/components/marketplace/SiteNav";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignUpForm } from "@/components/auth/SignUpForm";

export const metadata = { title: "Create an account · FreshFork" };

export default function SignUpPage() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteNav />
      <AuthShell
        eyebrow="JOIN FRESHFORK"
        title={
          <>
            Pull up a chair
            <br />
            at the table.
          </>
        }
        subtitle="One account, two ways to use it — order dinner tonight, or start cooking for the block."
        aside={
          <>
            Already have an account?{" "}
            <Link href="/signin" className="font-medium text-forest underline">
              Sign in
            </Link>
          </>
        }
      >
        <SignUpForm />
      </AuthShell>
    </div>
  );
}
