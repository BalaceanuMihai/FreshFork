import Link from "next/link";

import { SignUpForm } from "./SignUpForm";

export const metadata = { title: "Create an account · FreshFork" };

export default function SignUpPage() {
  return (
    <div>
      <h1>Pull up a chair at the table.</h1>
      <p>
        One account, two ways to use it — order dinner tonight, or start cooking for the
        block.
      </p>
      <p>
        Already have an account? <Link href="/signin">Sign in</Link>
      </p>

      <SignUpForm />
    </div>
  );
}
