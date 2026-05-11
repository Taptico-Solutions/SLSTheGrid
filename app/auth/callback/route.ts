import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";

/**
 * OAuth callback (spec §7).
 *
 * 1. Exchange the auth code for a Supabase session.
 * 2. Upsert the user record (no passwords stored).
 * 3. Auto-promote OWNER_OPEN_ID to admin.
 * 4. Bump lastSignedIn and redirect to the originally requested page.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const response = NextResponse.redirect(`${origin}${next}`);
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => request.cookies.get(name)?.value,
        set: (name: string, value: string, options: CookieOptions) =>
          response.cookies.set({ name, value, ...options }),
        remove: (name: string, options: CookieOptions) =>
          response.cookies.set({ name, value: "", ...options }),
      },
    },
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
  }

  const supaUser = data.user;
  const openId = supaUser.id; // Supabase user id == openId
  const ownerOpenId = process.env.OWNER_OPEN_ID;

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  if (existing) {
    await db
      .update(users)
      .set({
        lastSignedIn: new Date(),
        // Re-elevate the owner if their role drifted (rare safety net).
        ...(ownerOpenId && existing.openId === ownerOpenId
          ? { role: "admin" as const }
          : {}),
      })
      .where(eq(users.id, existing.id));
  } else {
    await db.insert(users).values({
      openId,
      email: supaUser.email ?? null,
      name:
        (supaUser.user_metadata?.full_name as string | undefined) ??
        supaUser.email ??
        null,
      loginMethod: supaUser.app_metadata?.provider ?? "email",
      role: ownerOpenId && openId === ownerOpenId ? "admin" : "user",
    });
  }

  return response;
}
