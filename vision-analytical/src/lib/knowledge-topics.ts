/**
 * The subject areas the knowledge base is organised by.
 *
 * These are analytical techniques and lab disciplines, not product categories.
 * Some overlap with what we sell (HPLC, GC-MS); some deliberately don't
 * (Software, General Laboratory) — which is why they live in their own table
 * rather than in the catalogue's category tree.
 *
 * Seeded as a starting set. An admin can add, rename or deactivate any of them
 * without a migration.
 */
export interface TopicSeed {
  name: string;
  slug: string;
  description: string;
  icon: string;
  /** Slug of the instrument category this maps to, where one exists. */
  categorySlug?: string;
}

export const KNOWLEDGE_TOPIC_SEEDS: TopicSeed[] = [
  {
    name: 'HPLC',
    slug: 'hplc',
    description: 'High-performance liquid chromatography: pumps, detectors, columns and separations.',
    icon: 'FlaskConical',
    categorySlug: 'hplc',
  },
  {
    name: 'UHPLC',
    slug: 'uhplc',
    description: 'Ultra-high-performance systems, sub-2µm columns and the pressures they run at.',
    icon: 'Gauge',
  },
  {
    name: 'GC',
    slug: 'gc',
    description: 'Gas chromatography: injectors, columns, carrier gas and oven programmes.',
    icon: 'Thermometer',
    categorySlug: 'gc',
  },
  {
    name: 'GC-MS',
    slug: 'gc-ms',
    description: 'Gas chromatography–mass spectrometry, from tuning to library matching.',
    icon: 'Radar',
    categorySlug: 'gc-ms',
  },
  {
    name: 'LC-MS',
    slug: 'lc-ms',
    description: 'Liquid chromatography–mass spectrometry: sources, ionisation and sensitivity.',
    icon: 'Waves',
    categorySlug: 'lc-ms',
  },
  {
    name: 'UV',
    slug: 'uv',
    description: 'Single-beam UV detection and photometry.',
    icon: 'Sun',
    categorySlug: 'uv',
  },
  {
    name: 'UV-VIS',
    slug: 'uv-vis',
    description: 'UV-visible spectrophotometry: lamps, cuvettes, baselines and validation.',
    icon: 'Sunrise',
  },
  {
    name: 'FTIR',
    slug: 'ftir',
    description: 'Fourier-transform infrared spectroscopy, ATR accessories and sample prep.',
    icon: 'AudioWaveform',
    categorySlug: 'ftir',
  },
  {
    name: 'AAS',
    slug: 'aas',
    description: 'Atomic absorption spectroscopy: flame, graphite furnace and hydride generation.',
    icon: 'Flame',
  },
  {
    name: 'ICP-OES',
    slug: 'icp-oes',
    description: 'Inductively coupled plasma optical emission spectrometry.',
    icon: 'Zap',
  },
  {
    name: 'ICP-MS',
    slug: 'icp-ms',
    description: 'Inductively coupled plasma mass spectrometry and trace element analysis.',
    icon: 'Atom',
  },
  {
    name: 'TOC',
    slug: 'toc',
    description: 'Total organic carbon analysis for water and cleaning validation.',
    icon: 'Droplets',
  },
  {
    name: 'Balances',
    slug: 'balances',
    description: 'Analytical and precision balances: levelling, calibration and weighing practice.',
    icon: 'Scale',
  },
  {
    name: 'Water Purification',
    slug: 'water-purification',
    description: 'Type I/II/III water systems, cartridges and resistivity.',
    icon: 'Droplet',
  },
  {
    name: 'Autosamplers',
    slug: 'autosamplers',
    description: 'Injection, vials, needle seats and carryover.',
    icon: 'Syringe',
  },
  {
    name: 'Software',
    slug: 'software',
    description: 'Chromatography data systems, licensing, drivers and 21 CFR Part 11.',
    icon: 'MonitorCog',
  },
  {
    name: 'Accessories',
    slug: 'accessories',
    description: 'Fittings, tubing, filters and everything that connects the rest.',
    icon: 'Puzzle',
  },
  {
    name: 'Consumables',
    slug: 'consumables',
    description: 'Columns, vials, septa, lamps and the parts that get replaced.',
    icon: 'Package',
  },
  {
    name: 'General Laboratory',
    slug: 'general-laboratory',
    description: 'Good laboratory practice, safety, documentation and everything cross-cutting.',
    icon: 'Building2',
  },
];
