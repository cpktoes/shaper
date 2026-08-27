import { clerkMiddleware } from "@clerk/nextjs/server";

/**
 * Next.js 16 renamed `middleware.ts` to `proxy.ts` — same `clerkMiddleware()` call, new file
 * name (see node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md).
 * A file still named `middleware.ts` may not run at all under this Next version, and then
 * `auth()` throws everywhere it's called.
 *
 * This runs `clerkMiddleware()` with no arguments and calls no `.protect()` anywhere. That is
 * deliberate, not incomplete: D-01 keeps every route in the app open to a signed-out shaper —
 * nobody is ever redirected away from a design screen for lacking an account. The only reason
 * this file exists is to establish the request-scoped Clerk auth context that `auth()` reads
 * inside Server Actions and Server Components; without it, those calls fail with "Clerk can't
 * detect usage of clerkMiddleware()" even though nothing here gates anything.
 *
 * lib/auth/open-access.test.ts reads this file's source and fails if a future edit adds a
 * `.protect()` call — that grep is what keeps D-01 true after this comment scrolls out of view.
 */
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico)).*)",
    "/(api|trpc)(.*)",
  ],
};
