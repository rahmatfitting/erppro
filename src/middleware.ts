import { NextRequest, NextResponse } from "next/server";
import { updateSession, decrypt } from "@/lib/auth";
import { cookies } from "next/headers";

// Define protected and public routes
const publicRoutes = ["/login"];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;


  
  // 1. Initial Authentication Check
  const cookie = request.cookies.get("session")?.value;
  const session = await decrypt(cookie || "");
  const isPublicRoute = publicRoutes.includes(path);
  const isApiRoute = path.startsWith("/api/");
  const isAuthApi = path.startsWith("/api/auth") || path.includes("/api/migrate") || path.startsWith("/api/gold-prices/sync") || path.startsWith("/api/buyback-prices/sync") || path.startsWith("/api/debug");

  // Not logged in -> handle based on type
  if (!session && !isPublicRoute && !isAuthApi) {
    if (isApiRoute) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.nextUrl));
  }

  // Logged in, on public route -> redirect to home (for pages only)
  if (session && isPublicRoute && !isApiRoute) {
    return NextResponse.redirect(new URL("/", request.nextUrl));
  }

  // 2. Branch Selection Enforcement
  const isSelectPage = path === "/login/select";
  const isMasterSetupPage = path.startsWith("/master/perusahaan") || 
                            path.startsWith("/master/cabang") || 
                            path.startsWith("/master/user") ||
                            path.startsWith("/setting/user-akses");
  
  const isMasterSetupApi = path.startsWith("/api/master") || 
                           path.startsWith("/api/setting/user-akses");

  const isSuperAdmin = session?.grup_nama?.toLowerCase() === "super admin";

  // Redirect to select if no branch, NOT on select page, NOT auth/migrate, NOT master setup exception
  if (session && !session.active_cabang && !isSelectPage && !isAuthApi) {
     const isException = isSuperAdmin && (isMasterSetupPage || isMasterSetupApi);
     if (!isException) {
        if (isApiRoute) {
          return NextResponse.json({ success: false, error: "Branch selection required" }, { status: 403 });
        }
        return NextResponse.redirect(new URL("/login/select", request.nextUrl));
     }
  }

  // Refresh expire time
  await updateSession(request);
  
  return NextResponse.next();
}

// Hanya jalankan middleware di rute-rute ini
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};
