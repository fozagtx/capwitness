import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { Icon } from "@/components/icon";
import { FaqAccordion } from "@/components/pro/faq-accordion";
import { FeatureCard } from "@/components/pro/feature-card";
import { ProtocolPreview } from "@/components/pro/protocol-preview";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import {
  AGENT_STORE_URL,
  faqs,
  featureCategories,
  heroCopy,
} from "@/content/proofrun";

export default function Home() {
  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <section className="relative flex flex-col items-center px-4 pt-14 sm:px-6 sm:pt-16">
          <div className="reveal z-20 flex max-w-3xl flex-col items-center gap-5 text-center sm:gap-6">
            <a
              href={AGENT_STORE_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-[18px] text-sm text-muted-foreground shadow-sm transition-colors hover:text-foreground"
            >
              {heroCopy.chip}
              <Icon icon="solar:arrow-right-linear" width={16} aria-hidden />
            </a>
            <h1 className="text-[clamp(2.4rem,7vw,3.75rem)] font-bold leading-[1.08] tracking-[-0.045em] text-foreground">
              {heroCopy.titleLine1}
              <span className="block text-primary">{heroCopy.titleLine2}</span>
            </h1>
            <p className="max-w-[34rem] text-base leading-7 text-muted-foreground sm:text-lg">
              {heroCopy.body}
            </p>
            <div className="flex w-full flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Button asChild size="lg" className="w-full min-w-[163px] sm:w-auto">
                <a href={AGENT_STORE_URL} target="_blank" rel="noreferrer">
                  {heroCopy.primaryCta}
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="w-full min-w-[163px] sm:w-auto"
              >
                <a href="#how">
                  {heroCopy.secondaryCta}
                  <span className="grid size-[22px] place-items-center rounded-full bg-secondary">
                    <Icon
                      icon="solar:arrow-right-linear"
                      width={14}
                      className="text-muted-foreground"
                      aria-hidden
                    />
                  </span>
                </a>
              </Button>
            </div>
          </div>
          <ProtocolPreview className="reveal reveal-delay-1 z-20 mt-14 w-full max-w-5xl translate-y-px rounded-b-none border-b-0" />
        </section>

        <section id="how" className="scroll-mt-20 border-t border-border bg-card/40">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-primary">
                The agent
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                What CAPWitness actually does
              </h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground">
                It is not a dashboard you log into. It is a CAP service other
                agents (and people) hire on CROO when they need evidence for one
                paid call.
              </p>
            </div>
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {featureCategories.map((category) => (
                <FeatureCard
                  key={category.key}
                  title={category.title}
                  icon={category.icon}
                  descriptions={category.descriptions}
                />
              ))}
            </div>
          </div>
        </section>

        <section id="receipt" className="scroll-mt-20 border-t border-border">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 sm:py-24 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-primary">
                Honest scope
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                Report the run. Do not bless the agent.
              </h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground">
                Use it as a spot-check before bigger spend or wiring an agent
                into another workflow. A pass means your checks passed at that
                moment only.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <p className="flex items-center gap-2 text-sm font-medium text-success-foreground">
                  <Icon icon="solar:check-circle-bold" width={18} aria-hidden />
                  We will say
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  This check passed on the answer returned at this time.
                </p>
              </div>
              <div className="rounded-2xl border border-destructive/25 bg-destructive/5 p-5">
                <p className="flex items-center gap-2 text-sm font-medium text-destructive">
                  <Icon icon="solar:close-circle-bold" width={18} aria-hidden />
                  We will not say
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  This agent is safe, trusted, or guaranteed to work next time.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="scroll-mt-20 border-t border-border bg-card/40">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-20 sm:px-6 sm:py-24 lg:flex-row lg:items-start lg:gap-14">
            <h2 className="shrink-0 text-3xl font-semibold tracking-tight lg:w-56 lg:text-4xl lg:leading-tight">
              Frequently asked questions
            </h2>
            <FaqAccordion items={faqs} className="min-w-0 flex-1" />
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:p-8">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">
                  Ready to hire it?
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                  Open the Agent Store, hire CAPWitness, and attach your request
                  JSON. Build that JSON here if you need help.
                </p>
              </div>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <Button asChild>
                  <a href={AGENT_STORE_URL} target="_blank" rel="noreferrer">
                    Open Agent Store
                    <Icon
                      icon="solar:arrow-right-linear"
                      width={16}
                      aria-hidden
                    />
                  </a>
                </Button>
                <Button asChild variant="secondary">
                  <Link href="/integrate">Build request JSON</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center px-6 py-12">
          <div className="flex items-center gap-2">
            <BrandMark />
            <span className="text-sm font-medium">CAPWitness</span>
          </div>
          <p className="mt-3 max-w-md text-center text-sm text-muted-foreground">
            A callable CAP agent on CROO that returns evidence for one paid
            spot-check.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <a href="#how" className="hover:text-foreground">
              How it works
            </a>
            <a href="#faq" className="hover:text-foreground">
              FAQ
            </a>
            <Link href="/integrate" className="hover:text-foreground">
              Request JSON
            </Link>
            <a
              href={AGENT_STORE_URL}
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground"
            >
              Agent Store
            </a>
            <a
              href="https://github.com/fozagtx/capwitness"
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground"
            >
              GitHub
            </a>
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            MIT · Built for the CROO Agent Hackathon
          </p>
        </div>
      </footer>
    </div>
  );
}
