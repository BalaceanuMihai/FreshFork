import Link from "next/link";

import { SiteNav } from "@/components/marketplace/SiteNav";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignInForm } from "@/components/auth/SignInForm";

export const metadata = { title: "Sign in · FreshFork" };

export default async function SignInPage(props: PageProps<"/signin">) {
  const params = await props.searchParams;
  const next = typeof params.next === "string" ? params.next : "/account";
  const checkEmail = typeof params.check_email === "string" ? params.check_email : null;
  const error = typeof params.error === "string" ? params.error : null;

  return (
    <div className="flex flex-1 flex-col">
      <SiteNav />
      <AuthShell
        eyebrow="WELCOME BACK"
        title={
          <>
            Good to see you
            <br />
            again.
          </>
        }
        subtitle="Sign in to track orders, save kitchens, and manage your listings."
        aside={
          <>
            New here?{" "}
            <Link href="/signup" className="font-medium text-forest underline">
              Create an account
            </Link>
          </>
        }
      >
        {checkEmail ? (
          <p className="mb-5 rounded-xl border border-sage bg-sage/15 px-4 py-3 text-sm text-forest">
            Check <span className="font-medium">{checkEmail}</span> for a
            confirmation link, then sign in.
          </p>
        ) : null}
        {error ? (
          <p
            role="alert"
            className="mb-5 rounded-xl border border-persimmon/40 bg-persimmon/10 px-4 py-3 text-sm text-cocoa"
          >
            {error === "missing_code" ? "That link is no longer valid." : error}
          </p>
        ) : null}
        <SignInForm next={next} />
      </AuthShell>
    </div>
  );
}
