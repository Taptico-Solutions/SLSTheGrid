import { Suspense } from "react";
import LoginForm from "./LoginForm";

/**
 * Server wrapper for the login page.
 * Next 15 requires useSearchParams() consumers to be inside a Suspense boundary
 * for the prerender to complete without bailing out to client-side rendering.
 */
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <LoginForm />
    </Suspense>
  );
}
