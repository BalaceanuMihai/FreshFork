import Link from "next/link";

import { SignInForm } from "./SignInForm";

export const metadata = { title: "Sign in · FreshFork" };

export default async function SignInPage(props: PageProps<"/signin">) {
  const params = await props.searchParams;
  const next = typeof params.next === "string" ? params.next : "/account";
  const checkEmail = typeof params.check_email === "string" ? params.check_email : null;
  const error = typeof params.error === "string" ? params.error : null;

  return (
    <div>
      <h1>Good to see you again.</h1>
      <p>Sign in to track orders, save kitchens, and manage your listings.</p>
      <p>
        New here? <Link href="/signup">Create an account</Link>
      </p>

      {checkEmail ? <p>Check {checkEmail} for a confirmation link, then sign in.</p> : null}
      {error ? (
        <p role="alert">{error === "missing_code" ? "That link is no longer valid." : error}</p>
      ) : null}

      <SignInForm next={next} />
    </div>
  );
}
