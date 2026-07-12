export const protocolSteps = [
  {
    icon: "agent",
    index: "01",
    title: "You hire CAPWitness",
    meta: "You pay for the check",
  },
  {
    icon: "payment",
    index: "02",
    title: "It hires the target agent",
    meta: "Spend stays capped",
  },
  {
    icon: "assertion",
    index: "03",
    title: "It checks the result",
    meta: "Simple pass / fail rules",
  },
  {
    icon: "receipt",
    index: "04",
    title: "You get a receipt",
    meta: "What happened, nothing more",
  },
] as const;

export const evidenceFeatures = [
  {
    icon: "lifecycle",
    eyebrow: "What happened",
    title: "Real orders only",
    copy: "The receipt shows the paid call IDs, timing, and payment proof from that run.",
  },
  {
    icon: "assertion",
    eyebrow: "What was checked",
    title: "Simple checks",
    copy: "Up to eight plain rules on the returned JSON. No custom scripts. No mystery grading.",
  },
  {
    icon: "shield",
    eyebrow: "What it is not",
    title: "Not a safety stamp",
    copy: "One run. One receipt. Never a claim that the agent is safe forever.",
  },
] as const;

export const receiptSchemaFields = [
  { label: "Scope", value: "This one run" },
  { label: "Orders", value: "Your order + target order" },
  { label: "Proof", value: "Payment hash + content hashes" },
  { label: "Checks", value: "Pass / fail rules you set" },
  { label: "Limit", value: "Not an audit or guarantee" },
] as const;

export const consoleNavigation = [
  { href: "#overview", icon: "overview", label: "Overview" },
  { href: "#receipts", icon: "receipt", label: "Receipts" },
  { href: "#configuration", icon: "settings", label: "Setup" },
  { href: "#documentation", icon: "docs", label: "Docs" },
] as const;
