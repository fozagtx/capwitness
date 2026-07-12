import { BrandMark } from "@/components/brand-mark";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { AGENT_STORE_URL, heroCopy } from "@/content/proofrun";

export default function Home() {
  return (
    <main className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-x-hidden px-4 py-16 sm:px-6">
      <div className="flex max-w-2xl flex-col items-center gap-6 text-center">
        <p className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <BrandMark className="size-8" />
          CAPWitness
        </p>
        <h1 className="text-[clamp(2.4rem,7vw,3.75rem)] font-bold leading-[1.08] tracking-[-0.045em] text-foreground">
          {heroCopy.titleLine1}
          <span className="block text-primary">{heroCopy.titleLine2}</span>
        </h1>
        <p className="max-w-[32rem] text-base leading-7 text-muted-foreground sm:text-lg">
          {heroCopy.body}
        </p>
        <Button asChild size="lg" className="min-w-[180px]">
          <a href={AGENT_STORE_URL} target="_blank" rel="noreferrer">
            Hire on CROO
            <Icon icon="solar:arrow-right-linear" width={16} aria-hidden />
          </a>
        </Button>
      </div>
    </main>
  );
}
