import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/not-invited",
  "/api/webhook(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  // Bypass auth in local development
  if (process.env.NODE_ENV === "development") return;

  // Let public routes through
  if (isPublicRoute(request)) return;

  // Require Clerk session
  const { userId } = await auth();
  if (!userId) {
    await auth.protect();
    return;
  }

  // Skip DB check for API routes (handled per-route via requireUser)
  if (request.nextUrl.pathname.startsWith("/api/")) return;

  // Check if this Clerk user exists in our DB
  // Use APP_URL env var to avoid SSL loopback issues on Railway edge runtime
  const appUrl = process.env.APP_URL || request.nextUrl.origin;
  const res = await fetch(`${appUrl}/api/users/me?clerkId=${userId}`, {
    headers: { "x-internal": "1" },
  });

  if (!res.ok) {
    return NextResponse.redirect(new URL("/not-invited", request.url));
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
