import { getVerifiedSessionUser } from "@/lib/auth-session";

export interface SessionUserMinimal {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  photoUrl?: string;
  isVerified?: boolean;
  role?: "USER" | "SUPERADMIN";
}

/**
 * Reads the currently logged-in user directly from the HTTP session cookie
 * inside Next.js Server Components for zero-flash SSR data fetching.
 */
export const getServerSessionUser = getVerifiedSessionUser;
