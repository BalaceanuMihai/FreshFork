"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { callerIp, consume } from "@/lib/rate-limit";
import { checkPwnedPassword, pwnedPasswordMessage } from "@/lib/auth/pwned";
import { publicEnv } from "@/lib/env";
import type { UserRole } from "@/lib/supabase/database.types";

export type AuthFormState = { error?: string };

/** Only these two roles can ever be self-assigned; admin is granted manually. */
const SIGNUP_ROLES: UserRole[] = ["customer", "vendor"];

function readEmail(formData: FormData): string {
  return String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
}

/** Keeps an open redirect out of the `next` param. */
function safeNext(value: FormDataEntryValue | null): string {
  const next = String(value ?? "");
  return next.startsWith("/") && !next.startsWith("//") ? next : "/account";
}

export async function signIn(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = readEmail(formData);
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  // Two budgets: one per account, so a single address cannot be ground down by
  // a distributed guesser, and one per source, so a single source cannot walk
  // a list of addresses. Supabase applies its own limits on top.
  const [byAccount, bySource] = await Promise.all([
    consume("signIn", `email:${email}`),
    consume("signIn", `ip:${await callerIp()}`),
  ]);

  if (!byAccount.allowed || !bySource.allowed) {
    const wait = Math.max(byAccount.retryAfterSeconds, bySource.retryAfterSeconds);
    return { error: `Too many attempts. Try again in ${wait} seconds.` };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signUp(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = readEmail(formData);
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const requested = String(formData.get("role") ?? "customer") as UserRole;
  const role = SIGNUP_ROLES.includes(requested) ? requested : "customer";

  if (!email || !password) {
    return { error: "Enter your email and a password." };
  }
  if (password.length < 8) {
    return { error: "Passwords need at least 8 characters." };
  }

  // Each signup sends a confirmation email from our domain; unthrottled, this
  // is a way to have us deliver spam to arbitrary addresses.
  const limit = await consume("signUp", `ip:${await callerIp()}`);
  if (!limit.allowed) {
    return { error: "Too many sign-ups from here. Try again later." };
  }

  // Supabase's own breached-password check is a Pro-plan feature, but the
  // corpus behind it is free to query. The password itself never leaves this
  // process — only the first five characters of its SHA-1 digest do.
  const pwned = await checkPwnedPassword(password);
  if (pwned.status === "pwned") {
    return { error: pwnedPasswordMessage(pwned.count) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // The database trigger clamps this to customer/vendor, so a crafted
      // request still cannot mint an admin.
      data: { role, full_name: fullName || null },
      emailRedirectTo: `${publicEnv.appUrl}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Email confirmation on: no session yet, tell them to check their inbox.
  if (!data.session) {
    redirect(`/signin?check_email=${encodeURIComponent(email)}`);
  }

  revalidatePath("/", "layout");
  redirect(role === "vendor" ? "/account?welcome=vendor" : "/account?welcome=1");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
