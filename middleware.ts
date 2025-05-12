import { type NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

const AUTH_DOMAIN = process.env.NEXT_PUBLIC_SSO_SERVICE_URL

export async function middleware(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: "__Secure-next-auth.session-token",
  })

  // Allow static files and public paths (like /_next/, favicon, etc.)
  const isPublic = req.nextUrl.pathname.startsWith("/_next") || req.nextUrl.pathname === "/favicon.ico"

  if (token || isPublic) {
    return NextResponse.next()
  }

  // Build redirect URL to accounts login
  const callbackUrl = req.nextUrl.clone()
  const loginUrl = new URL(`${AUTH_DOMAIN}/login`)
  loginUrl.searchParams.set("callbackUrl", callbackUrl.href)

  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ["/((?!api|_next|favicon.ico).*)"],
}
