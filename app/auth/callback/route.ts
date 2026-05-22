import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const OTP_TYPES = new Set<EmailOtpType>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

function getSafeNextUrl(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const next = request.nextUrl.searchParams.get("next") ?? "/";

  try {
    const url = new URL(next, origin);
    if (url.origin !== origin) return new URL("/", origin);
    return url;
  } catch {
    return new URL("/", origin);
  }
}

function getLoginUrl(request: NextRequest, message: string) {
  const loginUrl = new URL("/login", request.nextUrl.origin);
  loginUrl.searchParams.set("error", message);

  const next = request.nextUrl.searchParams.get("next");
  if (next) loginUrl.searchParams.set("next", next);

  return loginUrl;
}

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(getLoginUrl(request, "Sign-in did not work. Please request a new link."));
    }

    return NextResponse.redirect(getSafeNextUrl(request));
  }

  if (tokenHash && type && OTP_TYPES.has(type)) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (error) {
      return NextResponse.redirect(getLoginUrl(request, "Sign-in did not work. Please request a new link."));
    }

    return NextResponse.redirect(getSafeNextUrl(request));
  }

  return NextResponse.redirect(getLoginUrl(request, "Sign-in link is missing or expired. Please request a new link."));
}
