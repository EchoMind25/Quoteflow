import { LoginForm } from "@/components/auth/login-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in | Quotestream",
};

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold">Welcome back</h2>
        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
          Enter your email to receive a sign-in link
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
