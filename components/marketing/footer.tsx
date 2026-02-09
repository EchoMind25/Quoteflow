import Link from "next/link";

const productLinks = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "/pricing" },
  { label: "How It Works", href: "#how-it-works" },
];

const companyLinks = [
  { label: "About Bedrock AI", href: "https://bedrockutah.com" },
  { label: "Privacy Policy", href: "#" },
  { label: "Terms of Service", href: "#" },
  { label: "Contact Us", href: "mailto:braxton@bedrockai.systems" },
];

const supportLinks = [
  { label: "Help Center", href: "#" },
  { label: "Sign In", href: "/login" },
];

export function Footer() {
  return (
    <footer className="bg-[#060e1a] pb-8 pt-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {/* Branding */}
          <div className="col-span-2 sm:col-span-1">
            <div className="flex flex-col leading-none">
              <span className="text-lg font-bold text-accent">Quotestream</span>
              <span className="mt-0.5 text-[10px] text-gray-500">
                by Bedrock AI
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-gray-400">
              Privacy-first AI tools for service businesses.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-200">
              Product
            </h4>
            <ul className="mt-4 space-y-3">
              {productLinks.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-sm text-gray-400 transition-colors hover:text-accent"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-200">
              Company
            </h4>
            <ul className="mt-4 space-y-3">
              {companyLinks.map((l) => (
                <li key={l.label}>
                  {l.href.startsWith("http") ? (
                    <a
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-gray-400 transition-colors hover:text-accent"
                    >
                      {l.label}
                    </a>
                  ) : l.href.startsWith("mailto:") ? (
                    <a
                      href={l.href}
                      className="text-sm text-gray-400 transition-colors hover:text-accent"
                    >
                      {l.label}
                    </a>
                  ) : (
                    <Link
                      href={l.href}
                      className="text-sm text-gray-400 transition-colors hover:text-accent"
                    >
                      {l.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-200">
              Support
            </h4>
            <ul className="mt-4 space-y-3">
              {supportLinks.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-sm text-gray-400 transition-colors hover:text-accent"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-gray-800 pt-8 sm:flex-row">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Bedrock AI. All rights reserved.
          </p>
          <p className="text-sm text-gray-500">
            Based in Salt Lake City, Utah &bull; Serving the U.S.
          </p>
        </div>
      </div>
    </footer>
  );
}
