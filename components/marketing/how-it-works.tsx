import { Camera, Sparkles, Send } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Camera,
    title: "Take Photos & Record Details",
    body: "Snap pictures of the equipment, space, and any issues. Record a voice note with specifics like model numbers or customer requests.",
  },
  {
    number: "02",
    icon: Sparkles,
    title: "AI Analyzes & Builds Quote",
    body: "Our multi-modal AI reads your photos and transcript, identifies parts, calculates labor hours, and generates line items—all in seconds.",
  },
  {
    number: "03",
    icon: Send,
    title: "Review & Send to Customer",
    body: "Edit pricing if needed, add your branding, and send via email or text. Customers can accept with one click.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-navy py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <h2 className="text-center text-3xl font-bold text-white sm:text-4xl">
          From Job Site to Quote in 3 Simple Steps
        </h2>

        <div className="mt-16 grid grid-cols-1 gap-12 sm:grid-cols-3 sm:gap-4">
          {steps.map((step, i) => (
            <div key={step.number} className="relative text-center">
              {/* Connector line — desktop only */}
              {i < steps.length - 1 && (
                <div
                  className="absolute left-[calc(50%+48px)] top-10 hidden h-px w-[calc(100%-96px)] border-t-2 border-dashed border-accent/30 sm:block"
                  aria-hidden="true"
                />
              )}

              {/* Number circle */}
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-accent bg-accent/10">
                <span className="text-2xl font-bold text-accent">
                  {step.number}
                </span>
              </div>

              {/* Icon */}
              <div className="mx-auto mt-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-accent">
                <step.icon className="h-7 w-7" />
              </div>

              <h3 className="mt-4 text-xl font-semibold text-white">
                {step.title}
              </h3>
              <p className="mt-3 leading-relaxed text-gray-400">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
