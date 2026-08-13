import { ArticleKind } from '../src/generated/prisma/enums';


export interface SeedBlogPost {
  slug: string;
  title: string;
  excerpt: string;
  /** What it is - the content type. */
  kind: ArticleKind;
  /** What it is about - a slug matched against the seeded knowledge topics. */
  topicSlug?: string;
  content: string;
}

export const BLOG_POSTS: SeedBlogPost[] = [
  {
    slug: 'diagnosing-hplc-baseline-noise-and-drift',
    title: 'Diagnosing HPLC Baseline Noise and Drift',
    excerpt: 'A step-by-step checklist for tracking down noisy or drifting HPLC baselines before you call for service.',
    kind: ArticleKind.TROUBLESHOOTING,
    topicSlug: 'hplc',
    content: `A noisy or drifting baseline is one of the most common HPLC complaints we see. Before raising a service ticket, work through this checklist - it resolves the issue in most cases without an engineer visit.

## 1. Check the lamp

Deuterium lamps lose intensity over their working life. A lamp nearing end-of-life often shows as increased noise rather than a hard failure. Check the lamp energy/intensity reading in your software against the manufacturer's minimum threshold.

## 2. Look for air bubbles

Air trapped in the pump head or detector flow cell is the single most common cause of baseline spikes. Purge the pump thoroughly, and check that mobile phase bottles are properly degassed.

## 3. Confirm mobile phase quality

Old or contaminated mobile phase, especially buffers left at room temperature for days, will drift the baseline as it changes composition or grows biological contamination. Prepare fresh mobile phase and re-run a blank.

## 4. Verify column equilibration

A column that hasn't fully equilibrated to a new mobile phase or gradient will drift for the first several injections. Allow at least 10-15 column volumes before trusting the baseline.

## 5. Check for leaks

A slow leak anywhere in the flow path changes pressure and flow, which shows up as baseline instability. Inspect fittings under a bright light and re-tighten finger-tight - overtightening can damage ferrules.

If you've worked through all five and the baseline is still unstable, it's likely a detector or pump component issue - raise a service request with the symptoms and what you've already checked, and our engineer will arrive prepared with the right spares.`,
  },
  {
    slug: 'amc-vs-cmc-whats-the-difference',
    title: "AMC vs CMC: What's the Difference?",
    excerpt: 'Annual and Comprehensive Maintenance Contracts sound similar but cover very different scope. Here is how to choose.',
    kind: ArticleKind.FAQ,
    topicSlug: 'general-laboratory',
    content: `Both AMC and CMC are yearly service contracts, but they cover different scope - and picking the wrong one is a common source of billing surprises.

## AMC (Annual Maintenance Contract)

An AMC covers scheduled preventive maintenance visits and labour for breakdown calls during the contract period. Spare parts consumed during repairs are billed separately.

**Best for:** labs with a healthy budget for occasional parts replacement, or newer instruments less likely to need major parts during the contract year.

## CMC (Comprehensive Maintenance Contract)

A CMC covers everything in an AMC, plus the cost of spare parts consumed during covered repairs (within agreed limits - consumables like columns and lamps are typically still separate).

**Best for:** older instruments, labs that want predictable annual costs with no surprise parts bills, or instruments in heavy daily use.

## Quick comparison

| | AMC | CMC |
|---|---|---|
| Scheduled maintenance visits | Included | Included |
| Breakdown call labour | Included | Included |
| Spare parts | Billed separately | Included (within plan limits) |
| Typical annual cost | Lower | Higher |

If you're not sure which fits your instrument and usage pattern, tell us the instrument model and how heavily it's used - we'll recommend a plan rather than sell you the more expensive one by default.`,
  },
  {
    slug: 'understanding-iq-oq-pq-qualification',
    title: 'Understanding IQ/OQ/PQ Qualification for Analytical Instruments',
    excerpt: 'What each qualification phase actually verifies, and why auditors ask for all three.',
    kind: ArticleKind.ARTICLE,
    topicSlug: 'hplc',
    content: `IQ, OQ and PQ are three distinct qualification stages, each answering a different question about an instrument. Regulated labs (pharma, biotech, contract testing) need documented evidence for all three - here's what each one actually covers.

## Installation Qualification (IQ)

**Question answered:** Was the instrument installed correctly?

IQ documents that the instrument was received as ordered, installed according to the manufacturer's specifications, and that all utilities (power, gas, drainage) meet requirements. It's a static check performed once, at installation or relocation.

## Operational Qualification (OQ)

**Question answered:** Does the instrument perform to specification?

OQ tests the instrument's key operating parameters - flow rate accuracy, wavelength accuracy, temperature control, injection precision - against the manufacturer's published specifications, using calibrated reference standards.

## Performance Qualification (PQ)

**Question answered:** Does the instrument perform reliably under your actual operating conditions?

PQ verifies the instrument produces consistent, accurate results running your real methods, in your real environment, with your real operators. It's typically repeated on a schedule (e.g. annually) rather than done once.

## Why auditors want all three

IQ without OQ tells you the box was installed, not that it works. OQ without PQ tells you it can meet spec in ideal conditions, not that it does so reliably in your lab. Together, the three stages build a documented chain of evidence from "unboxed correctly" to "produces trustworthy data every day" - which is exactly what an audit is checking for.

We provide IQ/OQ/PQ documentation packages sized for both routine QC labs and full pharma audit requirements.`,
  },
  {
    slug: 'gc-column-selection-guide',
    title: 'GC Column Selection Guide for Routine Analysis',
    excerpt: 'How stationary phase, film thickness and column dimensions affect separation - and how to pick a sensible starting point.',
    kind: ArticleKind.GUIDE,
    topicSlug: 'gc',
    content: `Choosing a GC column is a trade-off between resolution, analysis time and column lifetime. Here's a practical starting point for routine methods.

## Stationary phase

- **Non-polar (100% dimethylpolysiloxane):** general-purpose, good for hydrocarbons and non-polar compounds.
- **Slightly polar (5% phenyl):** the most common general-purpose phase, works well for a wide range of routine methods.
- **Polar (polyethylene glycol / wax):** better for alcohols, free fatty acids and other polar analytes.

If you're developing a new method and unsure, a 5%-phenyl column is a reasonable default starting point.

## Column dimensions

- **Length:** longer columns (30m+) give better resolution but longer run times. 30m is a common default for routine work; 15m columns suit fast screening methods.
- **Internal diameter:** narrower bore (0.25mm) gives better resolution and efficiency; wider bore (0.32mm) tolerates more sample and is more forgiving for routine, high-throughput labs.
- **Film thickness:** thicker films (1-5μm) suit volatile analytes and give more capacity; thinner films (0.1-0.25μm) suit less volatile, higher-boiling compounds and give sharper peaks.

## Practical tips

1. Match the column to the method reference where one exists (pharmacopeial and regulatory methods usually specify phase and dimensions).
2. Keep a spare, pre-conditioned column of your primary method's type on hand - column failure mid-batch is one of the most common causes of unplanned downtime.
3. Track injections against the column's rated lifetime, especially for dirty matrices - proactive replacement is cheaper than a failed batch.

Need a column for a specific method? Send us the method reference or your current column part number and we'll match a compatible replacement.`,
  },
];
