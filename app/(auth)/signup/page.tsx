import { SignupForm } from "@/components/auth/signup-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create account | Quotestream",
};

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold">Create your account</h2>
        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
          Start generating AI-powered quotes in minutes
        </p>
      </div>
      <SignupForm />
    </div>
  );
}
