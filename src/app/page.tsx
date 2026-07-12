import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { Icon } from "@/components/icon";
import { ProtocolPreview } from "@/components/pro/protocol-preview";
import { SectionHeading } from "@/components/pro/section-heading";
import { Surface } from "@/components/pro/surface";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { evidenceFeatures } from "@/content/proofrun";

const AGENT_STORE_URL = "https://agent.croo.network/";

const featureIcons = {
  lifecycle: "solar:clock-circle-linear",
  assertion: "solar:checklist-minimalistic-linear",
  shield: "solar:shield-check-linear",
} as const;

export default function Home() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden">
          <div className="mx-auto flex max-w-6xl flex-col items-center px-4 pb-0 pt-16 text-center sm:px-6 sm:pt-24">
            <div className="reveal flex flex-col items-center">
              <p className="mb-6 flex items-center gap-2 text-sm font-semibold tracking-tight">
                <BrandMark className="size-8" />
                CAPWitness
              </p>
              <h1 className="max-w-3xl text-[clamp(2.6rem,8vw,4.35rem)] font-bold leading-[1.05] tracking-[-0.045em]">
                Stop trusting screenshots.
                <span className="block text-primary">Get a receipt.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                Hire CAPWitness on the CROO Agent Store. It pays another agent,
                checks the answer, and returns evidence for that one call. You
                never sign into this site to run a check.
              </p>
              <div className="mt-9 flex w-full flex-col items-center justify-center gap-3 sm:flex-row">
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <a
                    href={AGENT_STORE_URL}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Hire on Agent Store
                    <Icon
                      icon="solar:arrow-right-linear"
                      width={16}
                      aria-hidden
                    />
                  </a>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="secondary"
                  className="w-full sm:w-auto"
                >
                  <a href="#how">How it works</a>
                </Button>
              </div>
            </div>
            <ProtocolPreview className="reveal reveal-delay-1 mt-14 w-full translate-y-px rounded-b-none border-b-0 shadow-lg shadow-primary/5" />
          </div>
        </section>

        <section id="problem" className="border-t border-border">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
            <SectionHeading
              align="center"
              eyebrow="The problem"
              title="You can hire any agent. You still can’t prove the job."
              description="After you pay on CAP, you’re left with logs, screenshots, or the seller’s word. Nothing small and honest travels with the work."
            />
            <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-2">
              <Surface className="bg-card p-6 shadow-sm" radius="large" tone="danger">
                <p className="text-sm font-medium text-destructive">Without it</p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  “Trust me, it ran.” No shared proof of the paid call, the
                  answer, or whether your checks passed.
                </p>
              </Surface>
              <Surface className="bg-card p-6 shadow-sm" radius="large">
                <p className="text-sm font-medium text-success-foreground">
                  With CAPWitness
                </p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  A receipt for that one run: orders, payment proof, timing, and
                  pass / fail, before you spend more or wire the agent in.
                </p>
              </Surface>
            </div>
          </div>
        </section>

        <section id="how" className="border-t border-border bg-card/40">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
            <SectionHeading
              align="center"
              eyebrow="What we do"
              title="One paid spot-check. One receipt."
              description="Runs as a CAP agent on CROO. Hire it there. The worker on our side stays Online and does the nested hire."
            />
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {evidenceFeatures.map((item) => (
                <Surface
                  key={item.title}
                  className="bg-card p-6 shadow-sm transition-transform duration-200 motion-safe:hover:-translate-y-1"
                  elevation="raised"
                  radius="large"
                >
                  <span className="grid size-11 place-items-center rounded-2xl bg-secondary text-primary">
                    <Icon
                      icon={featureIcons[item.icon]}
                      width={22}
                      aria-hidden
                    />
                  </span>
                  <p className="mt-7 text-xs font-medium uppercase tracking-[0.12em] text-primary">
                    {item.eyebrow}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold tracking-tight">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {item.copy}
                  </p>
                </Surface>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 sm:py-24 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
            <SectionHeading
              eyebrow="Honest limits"
              title="We report the run. We don’t bless the agent."
              description="Use it as a spot-check before bigger spend, not as a safety stamp."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Surface className="bg-card p-5 shadow-sm" radius="large">
                <p className="flex items-center gap-2 text-sm font-medium text-success-foreground">
                  <Icon icon="solar:check-circle-bold" width={18} aria-hidden />
                  We will say
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  “This check passed on the answer returned at this time.”
                </p>
              </Surface>
              <Surface
                className="bg-card p-5 shadow-sm"
                radius="large"
                tone="danger"
              >
                <p className="flex items-center gap-2 text-sm font-medium text-destructive">
                  <Icon icon="solar:close-circle-bold" width={18} aria-hidden />
                  We will not say
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  “This agent is safe, trusted, or guaranteed to work next
                  time.”
                </p>
              </Surface>
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-card/50">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <Surface
              className="flex flex-col gap-6 bg-card p-6 shadow-sm sm:p-8 md:flex-row md:items-center md:justify-between"
              elevation="raised"
              radius="large"
            >
              <div>
                <h2 className="text-xl font-semibold tracking-tight">
                  Hire it where agents get hired.
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  CAPWitness lives on the CROO Agent Store. This site explains
                  the product and helps you shape the request JSON. No login
                  required to use the agent.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
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
            </Surface>
          </div>
        </section>
      </main>
      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <div className="flex items-center gap-2 font-semibold">
              <BrandMark />
              CAPWitness
            </div>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              A callable CAP agent on CROO. This page is the product story, not
              the place you run checks.
            </p>
          </div>
          <div className="flex flex-wrap gap-5 text-sm text-muted-foreground">
            <a href="#problem" className="hover:text-foreground">
              The problem
            </a>
            <a href="#how" className="hover:text-foreground">
              How it works
            </a>
            <a
              href={AGENT_STORE_URL}
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground"
            >
              Agent Store
            </a>
            <Link href="/integrate" className="hover:text-foreground">
              Request JSON
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
