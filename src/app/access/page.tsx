import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccessForm } from "@/components/access-form";
import { Icon } from "@/components/icon";
import { BrandMark } from "@/components/brand-mark";
import { Surface } from "@/components/pro/surface";
import { isOperator } from "@/lib/proofrun/server-auth";

export const metadata: Metadata = {
  title: "Console access",
  description: "Sign in to check CAPWitness setup and receipts.",
};

export default async function AccessPage() {
  if (await isOperator()) redirect("/console");

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-12">
      <Link
        href="/"
        className="absolute left-4 top-4 flex min-h-10 items-center gap-2 rounded-full px-3 text-sm text-muted-foreground hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:left-6 sm:top-6"
      >
        <Icon icon="solar:arrow-left-linear" width={16} aria-hidden />
        Back
      </Link>
      <section aria-labelledby="access-title" className="w-full max-w-md">
        <div className="flex flex-col items-center pb-7 text-center">
          <BrandMark className="size-14 rounded-2xl [&_svg]:size-7" />
          <h1
            id="access-title"
            className="mt-5 text-xl font-semibold tracking-tight"
          >
            Operator console
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your access token to continue.
          </p>
        </div>
        <Surface
          className="bg-card p-6 shadow-md sm:p-8"
          elevation="raised"
          radius="large"
        >
          <AccessForm />
        </Surface>
      </section>
    </main>
  );
}
