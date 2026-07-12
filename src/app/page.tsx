import { BrandMark } from "@/components/brand-mark";
import { Icon } from "@/components/icon";
import { ProtocolPreview } from "@/components/pro/protocol-preview";
import { Button } from "@/components/ui/button";
import { AGENT_STORE_URL, heroCopy } from "@/content/proofrun";

export default function Home() {
  return (
    <main className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
      <section className="relative flex flex-1 flex-col items-center px-4 pb-0 pt-16 sm:px-6 sm:pt-20">
        <div className="reveal z-20 flex max-w-3xl flex-col items-center gap-5 text-center sm:gap-6">
          <p className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <BrandMark className="size-8" />
            CAPWitness
          </p>
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
              <a href="/integrate">
                Build request JSON
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
    </main>
  );
}
