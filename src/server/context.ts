import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/server/db";
import { users, type User } from "@/server/db/schema";
import { eq } from "drizzle-orm";

/**
 * tRPC request context.
 * `user` is the full GRID user row (joined from Supabase auth via openId),
 * or null if unauthenticated.
 */
export async function createContext(_opts: FetchCreateContextFnOptions) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: supaUser },
  } = await supabase.auth.getUser();

  let user: User | null = null;
  if (supaUser) {
    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.openId, supaUser.id))
      .limit(1);
    user = row ?? null;
  }

  return { db, user };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
