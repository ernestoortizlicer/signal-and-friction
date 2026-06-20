import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Guard only /admin/ routes, excluding the login page itself
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const tokenCookie = request.cookies.get("sf-admin-session");

    if (!tokenCookie || !tokenCookie.value) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    const token = tokenCookie.value;

    try {
      // 2. Decode the JWT natively (base64 decode payload)
      const parts = token.split(".");
      if (parts.length !== 3) {
        throw new Error("Invalid JWT token format");
      }

      // Convert base64url to base64
      let base64Payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      // Pad base64 string if necessary
      while (base64Payload.length % 4) {
        base64Payload += "=";
      }
      
      const payloadString = atob(base64Payload);
      const payload = JSON.parse(payloadString);

      // 3. Verify expiration claim
      const isExpired = payload.exp * 1000 < Date.now();
      if (isExpired) {
        const response = NextResponse.redirect(new URL("/admin/login", request.url));
        response.cookies.delete("sf-admin-session");
        return response;
      }

      // 4. Optional: Verify Whitelisted Emails if configured in env
      const adminEmailsEnv = process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ALLOWED_ADMIN_EMAIL;
      if (adminEmailsEnv) {
        const whitelist = adminEmailsEnv.split(",").map(e => e.trim().toLowerCase());
        const userEmail = (payload.email || "").toLowerCase();
        
        if (!whitelist.includes(userEmail)) {
          const response = NextResponse.redirect(new URL("/admin/login?error=unauthorized", request.url));
          response.cookies.delete("sf-admin-session");
          return response;
        }
      }

    } catch (err: any) {
      console.error("[Middleware] JWT parsing or validation error:", err.message);
      const response = NextResponse.redirect(new URL("/admin/login", request.url));
      response.cookies.delete("sf-admin-session");
      return response;
    }
  }

  return NextResponse.next();
}

// Config to specify matching paths
export const config = {
  matcher: ["/admin/:path*"],
};
