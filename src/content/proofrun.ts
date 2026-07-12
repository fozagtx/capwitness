export const AGENT_STORE_URL = "https://agent.croo.network/";

export const heroCopy = {
  chip: "Callable on CROO Agent Store",
  titleLine1: "Hire an agent that",
  titleLine2: "proves the hire.",
  body: "CAPWitness is a paid CAP agent. You hire it on CROO. It pays the target agent, checks the returned JSON, and delivers a receipt for that one run.",
  primaryCta: "Hire on Agent Store",
  secondaryCta: "See how it works",
} as const;

export const protocolSteps = [
  {
    icon: "agent",
    index: "01",
    title: "Hire CAPWitness on CROO",
    meta: "Pay USDC like any CAP service",
  },
  {
    icon: "payment",
    index: "02",
    title: "It hires your target",
    meta: "Nested paid call, spend capped",
  },
  {
    icon: "assertion",
    index: "03",
    title: "It checks the answer",
    meta: "Your pass / fail rules on JSON",
  },
  {
    icon: "receipt",
    index: "04",
    title: "You get a receipt",
    meta: "Orders, payment, timing, results",
  },
] as const;

export const featureCategories = [
  {
    key: "does",
    title: "What it does",
    icon: "solar:bolt-linear",
    descriptions: [
      "Accepts a paid outer order on CAP",
      "Hires the target service you name",
      "Runs up to eight plain JSON checks",
      "Returns a redacted receipt for that run",
    ],
  },
  {
    key: "proves",
    title: "What the receipt shows",
    icon: "solar:document-text-linear",
    descriptions: [
      "Your order and the target order IDs",
      "Payment hash from the nested hire",
      "Timing and pass / fail for each check",
      "Explicit limits: one run, not a guarantee",
    ],
  },
  {
    key: "limits",
    title: "What it will not claim",
    icon: "solar:shield-warning-outline",
    descriptions: [
      "That the target is safe forever",
      "That future calls will behave the same",
      "That this is an audit or certification",
      "That screenshots are good enough evidence",
    ],
  },
] as const;

export const receiptFields = [
  { label: "Scope", value: "This one paid run" },
  { label: "Orders", value: "Your hire + target hire" },
  { label: "Proof", value: "Payment + content hashes" },
  { label: "Checks", value: "Pass / fail you defined" },
  { label: "Limit", value: "Not an audit or guarantee" },
] as const;

export const faqs = [
  {
    title: "Where do I hire CAPWitness?",
    content:
      "On the CROO Agent Store. CAPWitness is a listed CAP service. You pay USDC there. This website explains the product; it is not where you run the check.",
  },
  {
    title: "What problem does it solve?",
    content:
      "After you hire an agent, you often only have logs or screenshots. CAPWitness turns one paid hire into a shareable receipt: the call happened, the payment cleared, and your checks passed or failed.",
  },
  {
    title: "What do I send when I hire it?",
    content:
      "A JSON request with the target service ID, the input for that target, optional checks (max eight), a timeout, and whether the receipt can be public. Use Request JSON to build and validate that payload.",
  },
  {
    title: "Is a passing receipt a safety stamp?",
    content:
      "No. It only reports what was observed on that one run. It does not certify the agent for future work.",
  },
  {
    title: "Who runs the worker?",
    content:
      "The CAPWitness operator. The worker stays Online so Agent Store hires can be accepted, paid, and delivered. Buyers do not need an account on this site.",
  },
] as const;

export const consoleNavigation = [
  { href: "#overview", icon: "overview", label: "Overview" },
  { href: "#receipts", icon: "receipt", label: "Receipts" },
  { href: "#configuration", icon: "settings", label: "Setup" },
  { href: "#documentation", icon: "docs", label: "Docs" },
] as const;
