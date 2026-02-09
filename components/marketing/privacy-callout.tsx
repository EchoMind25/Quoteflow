import { Lock, ShieldCheck, Download, Trash2 } from "lucide-react";

const privacyFeatures = [
  {
    icon: Lock,
    title: "256-Bit Encryption",
    body: "All data encrypted at rest and in transit.",
  },
  {
    icon: ShieldCheck,
    title: "Row-Level Security",
    body: "Database-enforced access controls prevent unauthorized access.",
  },
  {
    icon: Download,
    title: "Export Anytime",
    body: "Download all your quotes, customers, and photos in CSV/PDF.",
  },
  {
    icon: Trash2,
    title: "Delete Everything",
    body: "Permanently delete your account and all data with one click.",
  },
];

export function PrivacyCallout() {
  return (
    <section className="bg-[#f8f9fa] py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
        <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
          Your Data, Your Control—Always
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-gray-600">
          Unlike other quoting tools, Quotestream is built privacy-first. We
          can&apos;t access your customer data even if we wanted to.
        </p>

        <div className="mt-14 grid grid-cols-2 gap-8 sm:grid-cols-4">
          {privacyFeatures.map((f) => (
            <div key={f.title} className="group text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent transition-colors group-hover:bg-accent/20">
                <f.icon className="h-7 w-7" />
              </div>
              <h3 className="mt-4 font-semibold text-gray-900">{f.title}</h3>
              <p className="mt-1 text-sm text-gray-600">{f.body}</p>
            </div>
          ))}
        </div>

        {/* SOC 2 badge */}
        <div className="mt-12 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/5 px-4 py-2 text-sm text-accent">
          <ShieldCheck className="h-4 w-4" />
          <span>SOC 2 Type II Compliant</span>
        </div>
      </div>
    </section>
  );
}
