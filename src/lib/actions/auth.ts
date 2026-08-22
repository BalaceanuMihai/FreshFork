"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
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
