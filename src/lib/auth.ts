import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectDB } from "./mongodb";
import { User } from "@/models/User";
import { z } from "zod";
import { bootstrapAdminFromEnv } from "./admin";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          const parsed = loginSchema.safeParse(credentials);
          if (!parsed.success) return null;

          const { email, password } = parsed.data;

          await bootstrapAdminFromEnv();
          await connectDB();
          const user = await User.findOne({ email: email.toLowerCase() }).lean<{
            _id: { toString(): string };
            email: string;
            username: string;
            password: string;
            role?: "user" | "admin";
            isDisabled?: boolean;
            currentStreak: number;
            bestStreak: number;
            totalTasksCompleted: number;
            totalActiveDays: number;
          }>();

          if (!user) return null;
          if (user.isDisabled) return null;

          const isValid = await bcrypt.compare(password, user.password);
          if (!isValid) return null;

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.username,
            role: user.role ?? "user",
          };
        } catch (err) {
          console.error("Auth error:", err);
          return null;
        }
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.role = (user as { role?: "user" | "admin" }).role ?? "user";
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name;
        session.user.role = (token.role as "user" | "admin") ?? "user";
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
});
