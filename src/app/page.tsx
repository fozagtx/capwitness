import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { Icon } from "@/components/icon";
import { ProtocolPreview } from "@/components/pro/protocol-preview";
import { SectionHeading } from "@/components/pro/section-heading";
import { Surface } from "@/components/pro/surface";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { evidenceFeatures } from "@/content/proofrun";

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
                Proof that an agent
                <span className="block text-primary">actually ran.</span>
              </h1>
              <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg">
                Hire CAPWitness. It pays another agent, checks the answer, and
                gives you a receipt for that one call.
              </p>
              <div className="mt-9 flex w-full flex-col items-center justify-center gap-3 sm:flex-row">
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <a href="#how">See how it works</a>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="secondary"
                  className="w-full sm:w-auto"
                >
                  <Link href="/integrate">
                    Start a check
                    <span className="grid size-[22px] place-items-center rounded-full bg-secondary">
                      <Icon
                        icon="solar:arrow-right-linear"
                        width={14}
                        className="text-muted-foreground"
                        aria-hidden
                      />
                    </span>
                  </Link>
                </Button>
              </div>
            </div>
            <ProtocolPreview className="reveal reveal-delay-1 mt-14 w-full translate-y-px rounded-b-none border-b-0 shadow-lg shadow-primary/5" />
          </div>
        </section>

        <section id="how" className="border-t border-border bg-card/40">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
            <SectionHeading
              align="center"
              eyebrow="How it works"
              title="One call. One receipt."
              description="No score. No reputation theater. Just evidence from the run you paid for."
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
              description="If something failed, the receipt says so. If it passed, it only passed for that moment."
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
                  Ready to run a live check?
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  If setup is missing, we show that clearly. We never fake a
                  success.
                </p>
              </div>
              <Button asChild variant="secondary">
                <Link href="/access">
                  Open console
                  <Icon icon="solar:arrow-right-linear" width={16} aria-hidden />
                </Link>
              </Button>
            </Surface>
          </div>
        </section>
      </main>
      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2 font-semibold">
            <BrandMark />
            CAPWitness
          </div>
          <div className="flex flex-wrap gap-5 text-sm text-muted-foreground">
            <a href="#how" className="hover:text-foreground">
              How it works
            </a>
            <Link href="/integrate" className="hover:text-foreground">
              Start a check
            </Link>
            <Link href="/access" className="hover:text-foreground">
              Console
            </Link>
            <a
              href="https://docs.croo.network"
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground"
            >
              Docs
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
