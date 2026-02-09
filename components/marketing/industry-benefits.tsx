import { Thermometer, Droplets, Zap } from "lucide-react";

const industries = [
  {
    icon: Thermometer,
    name: "HVAC",
    headline: "Tonnage, SEER Ratings, Duct Work",
    body: "AI recognizes equipment model numbers, calculates BTU requirements, and suggests compatible systems.",
    gradient: "from-blue-600/80 to-navy",
  },
  {
    icon: Droplets,
    name: "Plumbing",
    headline: "Pipe Sizes, Fixture Types, Code Requirements",
    body: "AI identifies drain configurations, water heater capacity, and local code compliance needs.",
    gradient: "from-sky-600/80 to-navy",
  },
  {
    icon: Zap,
    name: "Electrical",
    headline: "Panel Capacity, Wire Gauges, Load Calculations",
    body: "AI reads breaker labels, calculates amperage loads, and recommends service upgrades.",
    gradient: "from-amber-600/80 to-navy",
  },
];

export function IndustryBenefits() {
  return (
    <section className="bg-navy py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <h2 className="text-center text-3xl font-bold text-white sm:text-4xl">
          Built for the Way You Work
        </h2>

        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {industries.map((ind) => (
            <div
              key={ind.name}
              className={`relative overflow-hidden rounded-2xl bg-gradient-to-b ${ind.gradient} p-8 transition-transform hover:scale-[1.02]`}
            >
              <div className="relative z-10">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-accent">
                  <ind.icon className="h-6 w-6" />
                </div>
                <span className="mt-4 inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-gray-300">
                  {ind.name}
                </span>
                <h3 className="mt-3 text-xl font-semibold text-white">
                  {ind.headline}
                </h3>
                <p className="mt-3 leading-relaxed text-gray-300">
                  {ind.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
