import {
  Eye,
  Wrench,
  WifiOff,
  Palette,
  Users,
  Shield,
  Plug,
  Smartphone,
} from "lucide-react";

const features = [
  {
    icon: Eye,
    title: "Vision + Voice = Perfect Quotes",
    body: "Upload photos and voice notes. Our AI reads equipment labels, measures spaces, and understands technical details.",
  },
  {
    icon: Wrench,
    title: "Pre-Trained for Your Trade",
    body: "Built-in pricing models for HVAC, plumbing, and electrical. AI knows material costs, labor rates, and common job configurations.",
  },
  {
    icon: WifiOff,
    title: "Create Quotes Without Internet",
    body: "No signal at the job site? No problem. QuoteFlow syncs when you reconnect.",
  },
  {
    icon: Palette,
    title: "Your Logo, Your Colors",
    body: "Customize quotes with your business branding. Customers see your company, not ours.",
  },
  {
    icon: Users,
    title: "Approve Quotes Before Sending",
    body: "Junior technicians create quotes, managers review and approve. Built-in approval workflows keep quality high.",
  },
  {
    icon: Shield,
    title: "Your Data Stays Yours",
    body: "We never access your customer data. Export or delete everything anytime. GDPR and CCPA compliant.",
  },
  {
    icon: Plug,
    title: "Connect Your Existing Tools",
    body: "Sync with QuickBooks, Stripe, and ServiceTitan (Enterprise plans). No manual data entry.",
  },
  {
    icon: Smartphone,
    title: "Works Like a Native App",
    body: "Install on your phone\u2019s home screen. Fast, reliable, and built for field work.",
  },
];

export function FeaturesGrid() {
  return (
    <section id="features" className="bg-[#f8f9fa] py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <h2 className="mx-auto max-w-3xl text-center text-3xl font-bold text-gray-900 sm:text-4xl">
          Everything You Need to Quote Faster, Smarter, and More Accurately
        </h2>

        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border-l-4 border-accent bg-white p-6 shadow-sm transition-all hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold text-gray-900">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
