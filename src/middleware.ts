import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl

  // Allow access to auth routes and homepage
  if (pathname.startsWith("/api/auth") || pathname === "/") {
    return NextResponse.next()
  }

  // Check if user is authenticated for protected routes
  if (!req.auth) {
    // Redirect to home page (which will show login)
    return NextResponse.redirect(new URL("/", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    // Only protect specific routes that need authentication
    "/check/:path*",
    "/api/sessions/:path*",
  ],
}

