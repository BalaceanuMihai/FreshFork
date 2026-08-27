import Link from "next/link";

import { SignInForm } from "./SignInForm";

export const metadata = { title: "Sign in · FreshFork" };

export default async function SignInPage(props: PageProps<"/signin">) {
  const params = await props.searchParams;
  const next = typeof params.next === "string" ? params.next : "/account";
  const checkEmail = typeof params.check_email === "string" ? params.check_email : null;
  const error = typeof params.error === "string" ? params.error : null;

  return (
    <div className="max-w-sm mx-auto px-4 py-12">
      <div className="text-center space-y-1.5 mb-6">
        <h1 className="font-display text-2xl font-semibold">Good to see you again.</h1>
        <p className="text-sm text-muted-foreground">Sign in to track orders, save kitchens, and manage your listings.</p>
      </div>

      {checkEmail ? (
        <div className="bg-secondary rounded-xl px-4 py-3 text-sm mb-4">
          Check <strong>{checkEmail}</strong> for a confirmation link, then sign in.
        </div>
      ) : null}
      {error ? (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl px-4 py-3 text-sm mb-4" role="alert">
          {error === "missing_code" ? "That link is no longer valid." : error}
        </div>
      ) : null}

      <div className="bg-card rounded-2xl border border-border p-6">
        <SignInForm next={next} />
      </div>

      <p className="text-center text-sm text-muted-foreground mt-5">
        New here?{" "}
        <Link href="/signup" className="text-primary font-medium hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
