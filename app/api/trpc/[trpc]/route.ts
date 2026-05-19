import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/routers/_app";
import { createContext } from "@/server/context";

export const runtime = "nodejs";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext,
    onError({ error, path, type }) {
      // Log every server-side failure (prod + dev). INTERNAL_SERVER_ERROR is
      // what surfaces as a 500 to the client; the underlying cause is on
      // error.cause. Keep the line greppable in Vercel.
      console.error(
        `[trpc] ${type} ${path ?? "?"} → ${error.code}: ${error.message}`,
      );
      if (error.cause) {
        console.error("[trpc] cause:", error.cause);
      }
    },
  });

export { handler as GET, handler as POST };
