"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "./icon";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export function AccessForm() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [visible, setVisible] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    try {
      const response = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Access could not be established.");
        return;
      }
      router.push("/console");
      router.refresh();
    } catch {
      setError("CAPWitness could not reach the access service. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <div>
        <label htmlFor="operator-token" className="text-sm font-medium">
          Access token
        </label>
        <div className="relative mt-2">
          <Input
            id="operator-token"
            name="token"
            type={visible ? "text" : "password"}
            autoComplete="current-password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="Paste your token"
            className="rounded-xl border-border bg-card pr-11 font-mono shadow-sm"
            aria-describedby={error ? "access-error" : undefined}
            aria-invalid={Boolean(error)}
            required
          />
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            className="absolute inset-y-0 right-0 grid min-w-11 place-items-center rounded-r-xl text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            aria-label={visible ? "Hide access token" : "Show access token"}
          >
            <Icon
              icon={visible ? "solar:eye-closed-linear" : "solar:eye-bold"}
              width={20}
              aria-hidden
            />
          </button>
        </div>
      </div>
      {error && (
        <p
          id="access-error"
          role="alert"
          className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      <Button
        type="submit"
        className="w-full"
        disabled={pending || !token}
      >
        {pending ? (
          <Icon
            icon="solar:refresh-linear"
            width={16}
            className="animate-spin motion-reduce:animate-none"
            aria-hidden
          />
        ) : (
          <Icon icon="solar:arrow-right-linear" width={16} aria-hidden />
        )}
        {pending ? "Signing in…" : "Continue"}
      </Button>
    </form>
  );
}
