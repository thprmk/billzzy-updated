// types/next-auth.d.ts
import { DefaultSession, DefaultUser } from "next-auth";
import { JWT as NextAuthJWT } from "next-auth/jwt";

declare module "next-auth" {
  /**
   * Extends the built-in session.user object.
   */
  interface User extends DefaultUser {
    role: string;
    shopName: string;
    endDate: Date;
    subscriptionType: string;
    smsCount: number;
    organisationId: number; // <-- ADDED THIS (as number)
  }

  /**
   * The shape of the JWT token.
   */
  interface JWT extends NextAuthJWT {
    id: string;
    role: string;
    shopName: string;
    endDate: Date;
    subscriptionType: string;
    smsCount: number;
    organisationId: number; // <-- ADDED THIS (as number)
    razorpayState?: string;
    razorpayStateTimestamp?: number;
  }

  /**
   * The shape of the session object returned by useSession and getSession.
   */
  interface Session {
    user: {
      id: string;
      role: string;
      shopName: string;
      endDate: Date;
      subscriptionType: string;
      smsCount: number;
      organisationId: number; // <-- ADDED THIS (as number)
    } & DefaultSession["user"];
    razorpayState?: string;
    razorpayStateTimestamp?: number;
  }
}