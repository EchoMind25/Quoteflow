import { Clock, DollarSign, Hourglass } from "lucide-react";

const problems = [
  {
    icon: Clock,
    headline: "15-30 Minutes Per Quote",
    body: "Your team spends hours each week manually calculating materials, labor, and markups—time that could be spent on billable work.",
  },
  {
    icon: DollarSign,
    headline: "Quotes Vary by Technician",
    body: "Different team members price the same job differently, leading to lost revenue or customer confusion.",
  },
  {
    icon: Hourglass,
    headline: "Customers Wait Days for Quotes",
    body: "By the time you send a quote, your customer has already called three competitors.",
  },
];

export function ProblemStatement() {
  return (
    <section className="bg-[#f8f9fa] py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <h2 className="text-center text-3xl font-bold text-gray-900 sm:text-4xl">
          The Hidden Cost of Slow Quotes
        </h2>

        <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3">
          {problems.map((p) => (
            <div
              key={p.headline}
              className="rounded-2xl bg-white p-8 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <p.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-center text-xl font-semibold text-gray-900">
                {p.headline}
              </h3>
              <p className="mt-3 text-center leading-relaxed text-gray-600">
                {p.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
