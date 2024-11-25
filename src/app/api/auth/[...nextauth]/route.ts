import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { compare } from "bcryptjs";
import NextAuth from "next-auth/next";

const ADMIN_EMAIL = "admin@billz.com";
const ADMIN_PASSWORD = "billz$2012"; 

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing credentials");
        }

        // Check if the user is the hardcoded admin
        if (credentials.email === ADMIN_EMAIL) {
          if (credentials.password === ADMIN_PASSWORD) {
            // Return the admin user object
            return {
              id: "admin",
              email: ADMIN_EMAIL,
              name: "Admin User",
              role: "admin",
            };
          } else {
            throw new Error("Invalid credentials");
          }
        }

        // Proceed to check the user in the database
        const user = await prisma.organisation.findUnique({
          where: {
            email: credentials.email,
          },
          select: {
            id: true,
            email: true,
            password: true,
            name: true,
            shopName: true,
            endDate: true,
            subscriptionType: true,
            smsCount: true,
          },
        });

        if (!user) {
          throw new Error("Invalid credentials");
        }

        const isValidPassword = await compare(credentials.password, user.password);

        if (!isValidPassword) {
          throw new Error("Invalid credentials");
        }

        return {
          id: user.id.toString(),
          email: user.email,
          name: user.name,
          shopName: user.shopName,
          endDate: user.endDate,
          subscriptionType: user.subscriptionType,
          smsCount: user.smsCount,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.shopName = user.shopName || null;
        token.endDate = user.endDate || null;
        token.subscriptionType = user.subscriptionType || null;
        token.smsCount = user.smsCount || null;
        // Add role to token if present
        if (user.role) {
          token.role = user.role;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.shopName = token.shopName || null;
        session.user.endDate = token.endDate || null;
        session.user.subscriptionType = token.subscriptionType || null;
        session.user.smsCount = token.smsCount || null;
        // Add role to session if present
        if (token.role) {
          session.user.role = token.role;
        }
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
