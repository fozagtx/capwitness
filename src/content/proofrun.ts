export const protocolSteps = [
  {
    icon: "agent",
    index: "01",
    title: "You hire CAPWitness",
    meta: "Pay for the spot-check",
  },
  {
    icon: "payment",
    index: "02",
    title: "It hires the target",
    meta: "Real paid call, capped spend",
  },
  {
    icon: "assertion",
    index: "03",
    title: "It checks the answer",
    meta: "Your pass / fail rules",
  },
  {
    icon: "receipt",
    index: "04",
    title: "You get a receipt",
    meta: "Shareable proof for that run",
  },
] as const;

export const evidenceFeatures = [
  {
    icon: "lifecycle",
    eyebrow: "Proof of the hire",
    title: "Not a screenshot",
    copy: "Order IDs, timing, and payment proof from the paid call: evidence that travels, not a private log dump.",
  },
  {
    icon: "assertion",
    eyebrow: "Proof of the check",
    title: "Did it match?",
    copy: "Up to eight plain rules on the returned JSON. You see what passed and what failed for that run.",
  },
  {
    icon: "shield",
    eyebrow: "Honest scope",
    title: "Spot-check, not audit",
    copy: "Use it before bigger spend or wiring an agent in. Never treated as a forever safety stamp.",
  },
] as const;

export const receiptSchemaFields = [
  { label: "Scope", value: "This one paid run" },
  { label: "Orders", value: "Your hire + target hire" },
  { label: "Proof", value: "Payment + content hashes" },
  { label: "Checks", value: "Pass / fail you defined" },
  { label: "Limit", value: "Not an audit or guarantee" },
] as const;

export const consoleNavigation = [
  { href: "#overview", icon: "overview", label: "Overview" },
  { href: "#receipts", icon: "receipt", label: "Receipts" },
  { href: "#configuration", icon: "settings", label: "Setup" },
  { href: "#documentation", icon: "docs", label: "Docs" },
] as const;
