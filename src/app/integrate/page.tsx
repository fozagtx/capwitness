import type { Metadata } from "next";
import { Braces, CircleDollarSign, ReceiptText, Route } from "lucide-react";
import { RequirementBuilder } from "@/components/requirement-builder";
import { SectionHeading } from "@/components/pro/section-heading";
import { Surface } from "@/components/pro/surface";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Start a check",
  description: "Build the request CAPWitness needs to spot-check another agent.",
};

const integrationSteps = [
  {
    icon: Braces,
    index: "01",
    title: "Describe the check",
    copy: "Pick the target agent, the input it should see, and the rules that count as a pass.",
  },
  {
    icon: CircleDollarSign,
    index: "02",
    title: "Hire CAPWitness",
    copy: "Send that request as a paid order. CAPWitness only runs after payment clears.",
  },
  {
    icon: Route,
    index: "03",
    title: "Watch it hire the target",
    copy: "CAPWitness pays the named agent, waits for an answer, and runs your checks.",
  },
  {
    icon: ReceiptText,
    index: "04",
    title: "Get the receipt",
    copy: "You get order IDs, timing, payment proof, and pass/fail results for that run.",
  },
] as const;

export default function IntegratePage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <h1 className="mt-1 max-w-3xl text-4xl font-bold tracking-[-0.04em] sm:text-5xl">
              Set up your check.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
              Fill in real values. Nothing is prefilled. Nothing is invented.
            </p>
          </div>
        </section>

        <section className="border-b border-border bg-card/40">
          <div className="mx-auto grid max-w-6xl gap-px border-x border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
            {integrationSteps.map((step) => {
              const StepIcon = step.icon;
              return (
                <div key={step.index} className="bg-card p-5">
                  <div className="flex items-center justify-between">
                    <span className="grid size-10 place-items-center rounded-2xl bg-secondary text-primary">
                      <StepIcon aria-hidden="true" className="size-5" />
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {step.index}
                    </span>
                  </div>
                  <h2 className="mt-8 font-semibold tracking-tight">
                    {step.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {step.copy}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <SectionHeading
            eyebrow="Request builder"
            title="Use your real target and rules."
            description="If a field is missing or invalid, you get an error. No sample payload is filled in for you."
          />
          <Surface
            className="mt-8 bg-card p-5 shadow-sm sm:p-7"
            elevation="raised"
          >
            <RequirementBuilder />
          </Surface>
        </section>
      </main>
    </div>
  );
}
