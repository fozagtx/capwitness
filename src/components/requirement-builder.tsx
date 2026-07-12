"use client";

import { useState } from "react";
import { Check, Clipboard, Plus, Trash2 } from "lucide-react";
import { runRequirementsSchema } from "@/lib/proofrun/schema";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

type Operator = "exists" | "equals" | "type" | "matches";

type AssertionDraft = {
  id: string;
  path: string;
  operator: Operator;
  expected: string;
};

function newAssertion(): AssertionDraft {
  return {
    id: crypto.randomUUID(),
    path: "",
    operator: "exists",
    expected: "",
  };
}

export function RequirementBuilder() {
  const [targetServiceId, setTargetServiceId] = useState("");
  const [input, setInput] = useState("");
  const [timeoutMs, setTimeoutMs] = useState("");
  const [publicReceipt, setPublicReceipt] = useState(false);
  const [assertions, setAssertions] = useState<AssertionDraft[]>([]);
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  function updateAssertion(
    id: string,
    field: keyof Omit<AssertionDraft, "id">,
    value: string,
  ) {
    setAssertions((current) =>
      current.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
    setOutput("");
  }

  function buildRequirements() {
    setCopied(false);
    setError("");

    try {
      const parsedInput = JSON.parse(input) as unknown;
      const parsedAssertions = assertions.map((assertion) => {
        if (assertion.operator === "exists") {
          return { path: assertion.path, operator: assertion.operator };
        }

        return {
          path: assertion.path,
          operator: assertion.operator,
          expected:
            assertion.operator === "equals"
              ? (JSON.parse(assertion.expected) as unknown)
              : assertion.expected,
        };
      });

      const requirements = runRequirementsSchema.parse({
        targetServiceId,
        input: parsedInput,
        assertions: parsedAssertions,
        timeoutMs: Number(timeoutMs),
        publicReceipt,
      });

      setOutput(JSON.stringify(requirements, null, 2));
    } catch (cause) {
      setOutput("");
      setError(
        cause instanceof Error
          ? cause.message
          : "The requirements could not be validated.",
      );
    }
  }

  async function copyRequirements() {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setError("");
    } catch {
      setCopied(false);
      setError("Clipboard access was denied. Select and copy the JSON manually.");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm font-medium">
            Target agent ID
            <Input
              value={targetServiceId}
              onChange={(event) => {
                setTargetServiceId(event.target.value);
                setOutput("");
              }}
              autoComplete="off"
              placeholder="Required"
            />
          </label>
          <label className="space-y-2 text-sm font-medium">
            Timeout (ms)
            <Input
              value={timeoutMs}
              onChange={(event) => {
                setTimeoutMs(event.target.value);
                setOutput("");
              }}
              inputMode="numeric"
              placeholder="10000-120000"
            />
          </label>
        </div>

        <label className="block space-y-2 text-sm font-medium">
          Input JSON for the target
          <textarea
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              setOutput("");
            }}
            spellCheck={false}
            placeholder="Exact JSON the target should receive"
            className="min-h-40 w-full rounded-md border border-border bg-input px-3 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-medium">Checks</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Optional. Up to eight pass / fail rules.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={assertions.length >= 8}
              onClick={() =>
                setAssertions((current) => [...current, newAssertion()])
              }
            >
              <Plus aria-hidden="true" className="size-4" />
              Add check
            </Button>
          </div>

          {assertions.length === 0 ? (
            <div className="rounded-md border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
              No checks yet. You can still generate a request without them.
            </div>
          ) : (
            <div className="space-y-3">
              {assertions.map((assertion, index) => (
                <div
                  key={assertion.id}
                  className="grid gap-3 rounded-lg border border-border bg-muted/40 p-3 sm:grid-cols-[1fr_150px_1fr_auto]"
                >
                  <Input
                    aria-label={`Assertion ${index + 1} path`}
                    value={assertion.path}
                    onChange={(event) =>
                      updateAssertion(assertion.id, "path", event.target.value)
                    }
                    placeholder="Path"
                  />
                  <select
                    aria-label={`Assertion ${index + 1} operator`}
                    value={assertion.operator}
                    onChange={(event) =>
                      updateAssertion(
                        assertion.id,
                        "operator",
                        event.target.value as Operator,
                      )
                    }
                    className="min-h-11 rounded-md border border-border bg-input px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="exists">exists</option>
                    <option value="equals">equals</option>
                    <option value="type">type</option>
                    <option value="matches">matches</option>
                  </select>
                  <Input
                    aria-label={`Assertion ${index + 1} expected value`}
                    value={assertion.expected}
                    onChange={(event) =>
                      updateAssertion(
                        assertion.id,
                        "expected",
                        event.target.value,
                      )
                    }
                    disabled={assertion.operator === "exists"}
                    placeholder={
                      assertion.operator === "equals"
                        ? "Expected JSON"
                        : assertion.operator === "exists"
                          ? "Not used"
                          : "Expected value"
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove assertion ${index + 1}`}
                    onClick={() => {
                      setAssertions((current) =>
                        current.filter((item) => item.id !== assertion.id),
                      );
                      setOutput("");
                    }}
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <label className="flex min-h-11 items-center gap-3 rounded-md border border-border bg-muted/40 px-3 text-sm">
          <input
            type="checkbox"
            checked={publicReceipt}
            onChange={(event) => {
              setPublicReceipt(event.target.checked);
              setOutput("");
            }}
            className="size-4 accent-primary"
          />
          Make the receipt publicly viewable
        </label>

        <Button type="button" size="lg" onClick={buildRequirements}>
          Build request
        </Button>
      </div>

      <div className="min-w-0">
        <div className="sticky top-20 rounded-lg border border-border bg-[#071426] p-4 text-[#d7e8ff] shadow-sm">
          <div className="flex min-h-10 items-center justify-between gap-3 border-b border-white/10 pb-3">
            <span className="text-xs font-medium uppercase tracking-[0.12em] text-[#84b9ff]">
              Request JSON
            </span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!output}
              onClick={copyRequirements}
              className="border-white/15 bg-white/10 text-white hover:bg-white/15"
            >
              {copied ? (
                <Check aria-hidden="true" className="size-4" />
              ) : (
                <Clipboard aria-hidden="true" className="size-4" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          {error ? (
            <p role="alert" className="mt-4 text-sm leading-6 text-[#ffb7b7]">
              {error}
            </p>
          ) : output ? (
            <pre className="mt-4 max-h-[620px] overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-6">
              {output}
            </pre>
          ) : (
            <p className="mt-4 text-sm leading-6 text-[#9fb4cf]">
              Fill in the fields and click Build request. Nothing is filled in
              for you.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
