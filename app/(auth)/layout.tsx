import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 block text-center">
          <h1 className="text-2xl font-bold tracking-tight text-brand-600">
            Quotestream
          </h1>
        </Link>
        {children}
      </div>
    </div>
  );
}
