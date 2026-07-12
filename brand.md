# Brand — CAPWitness

_Status: locked_

CAPWitness is a paid CAP agent that performs one bounded live spot-check against another CAP agent and returns a transaction evidence receipt.

## Direction

- Palette: **Ledger Blue**
- Category: tooling / developer infrastructure
- Mood: technical
- Reference: Linear
- Visual posture: light-first, soft blue atmosphere, quiet confidence, evidence over spectacle

## Seed Colors

### Dark

| Role | OKLCH | Hex |
| --- | --- | --- |
| Background | `oklch(0.12 0.02 255)` | `#090D16` |
| Elevated | `oklch(0.18 0.03 255)` | `#111927` |
| Primary | `oklch(0.70 0.18 255)` | `#648FF5` |
| Primary soft | `oklch(0.83 0.12 255)` | `#A0BAF8` |
| Foreground | `oklch(0.97 0.01 255)` | `#F1F4FA` |

### Light

| Role | OKLCH | Hex |
| --- | --- | --- |
| Background | `oklch(0.98 0.01 255)` | `#F7F9FD` |
| Elevated | `oklch(1 0 0)` | `#FFFFFF` |
| Primary | `oklch(0.47 0.17 255)` | `#2857B8` |
| Primary soft | `oklch(0.70 0.12 255)` | `#7999DD` |
| Foreground | `oklch(0.19 0.03 255)` | `#182136` |

## Semantic Tokens

### Light

```css
--background: oklch(0.98 0.01 255);
--foreground: oklch(0.19 0.03 255);
--card: oklch(1 0 0);
--card-foreground: oklch(0.19 0.03 255);
--popover: oklch(1 0 0);
--popover-foreground: oklch(0.19 0.03 255);
--primary: oklch(0.47 0.17 255);
--primary-foreground: oklch(0.98 0 0);
--secondary: oklch(0.94 0.015 255);
--secondary-foreground: oklch(0.19 0.03 255);
--muted: oklch(0.95 0.01 255);
--muted-foreground: oklch(0.43 0.03 255);
--accent: oklch(0.93 0.03 255);
--accent-foreground: oklch(0.19 0.03 255);
--destructive: oklch(0.55 0.22 25);
--destructive-foreground: oklch(0.98 0 0);
--border: oklch(0.88 0.015 255);
--input: oklch(0.96 0.01 255);
--ring: oklch(0.47 0.17 255);
```

### Dark

```css
--background: oklch(0.12 0.02 255);
--foreground: oklch(0.97 0.01 255);
--card: oklch(0.18 0.03 255);
--card-foreground: oklch(0.97 0.01 255);
--popover: oklch(0.20 0.03 255);
--popover-foreground: oklch(0.97 0.01 255);
--primary: oklch(0.70 0.18 255);
--primary-foreground: oklch(0.10 0 0);
--secondary: oklch(0.22 0.03 255);
--secondary-foreground: oklch(0.97 0.01 255);
--muted: oklch(0.20 0.025 255);
--muted-foreground: oklch(0.70 0.025 255);
--accent: oklch(0.24 0.045 255);
--accent-foreground: oklch(0.97 0.01 255);
--destructive: oklch(0.65 0.22 25);
--destructive-foreground: oklch(0.98 0 0);
--border: oklch(0.29 0.035 255);
--input: oklch(0.18 0.03 255);
--ring: oklch(0.70 0.18 255);
```

Contrast is intentionally high: near-white/near-black body pairs, white-on-dark-blue or black-on-light-blue primary controls, and muted text kept above the small-text AA threshold.

## Typography

- UI: Geist Sans
- Data, hashes, order IDs, statuses, code: Geist Mono
- Use tabular numbers for timestamps, amounts, latency, and counts.
- Headings are compact and sentence case. Avoid oversized landing-page typography.

## Tone And Voice

CAPWitness sounds precise, bounded, and operational. It reports what happened, when, and under which conditions.

CAPWitness never inflates a spot-check into certification. Prefer “observed,” “completed,” “failed assertion,” and “one run” over “safe,” “trusted,” or “verified.”

Errors explain the concrete missing requirement and the recovery action. Avoid celebratory language around payments or transactions.

## Usage

Do:

- lead with order state, receipt scope, and evidence
- use blue for the primary action and active lifecycle state
- reserve green for terminal success and red for actual failures
- use borders and surface steps rather than shadows
- expose limitations beside the result

Do not:

- use gradients, glass effects, neon glows, or decorative blockchain imagery
- imply that one receipt predicts future behavior
- use green as a general brand accent
- hide unavailable configuration behind disabled mystery controls
- display production-looking fixture data

## Component Language

CAPWitness adapts the Design ProMax patterns for centered product heroes, framed app previews, raised KPI cards, compact sidebars, authentication cards, status chips, and data tables.

- Reusable presentation components use `React.forwardRef`, `displayName`, and the shared `cn()` utility.
- Content collections live separately from presentation components.
- Surfaces use semantic Ledger Blue tokens rather than raw colors.
- ProMax depth is restrained to subtle borders and small shadows so the interface remains operational rather than promotional.
- Product previews are labeled conceptual; operational tables contain observed records only.

