import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

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

  // Require Clerk session — DB existence check is handled per-route via requireUser()
  await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
