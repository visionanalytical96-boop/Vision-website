/**
 * Starter instrument models, so the parts finder and compatibility mapping
 * have something real to work against on a fresh install.
 *
 * These are widely-known instrument lines, not an exhaustive or authoritative
 * catalogue. Treat them as a starting point: verify against what Vision
 * Analytical actually services and extend from Admin › Products › Instrument
 * Models. The seed only creates rows that don't already exist, so editing or
 * deleting one here is never undone by a re-run.
 */
export interface InstrumentModelSeed {
  brandSlug: string;
  /** Instrument category slug (kind = INSTRUMENT), or null when unclassified. */
  categorySlug: string | null;
  name: string;
  slug: string;
  description?: string;
}

export const INSTRUMENT_MODELS: InstrumentModelSeed[] = [
  // Waters
  { brandSlug: 'waters', categorySlug: 'hplc', name: 'Alliance e2695', slug: 'alliance-e2695' },
  { brandSlug: 'waters', categorySlug: 'hplc', name: 'ACQUITY UPLC H-Class', slug: 'acquity-uplc-h-class' },
  { brandSlug: 'waters', categorySlug: 'lc-ms', name: 'Xevo TQ-S', slug: 'xevo-tq-s' },

  // Shimadzu
  { brandSlug: 'shimadzu', categorySlug: 'hplc', name: 'Nexera X2', slug: 'nexera-x2' },
  { brandSlug: 'shimadzu', categorySlug: 'hplc', name: 'LC-2030C Plus', slug: 'lc-2030c-plus' },
  { brandSlug: 'shimadzu', categorySlug: 'gc', name: 'GC-2010 Plus', slug: 'gc-2010-plus' },
  { brandSlug: 'shimadzu', categorySlug: 'gc-ms', name: 'GCMS-QP2020 NX', slug: 'gcms-qp2020-nx' },
  { brandSlug: 'shimadzu', categorySlug: 'uv', name: 'UV-1900i', slug: 'uv-1900i' },

  // Agilent Technologies
  { brandSlug: 'agilent-technologies', categorySlug: 'hplc', name: '1260 Infinity II', slug: '1260-infinity-ii' },
  { brandSlug: 'agilent-technologies', categorySlug: 'hplc', name: '1290 Infinity II', slug: '1290-infinity-ii' },
  { brandSlug: 'agilent-technologies', categorySlug: 'gc', name: '7890B GC', slug: '7890b-gc' },
  { brandSlug: 'agilent-technologies', categorySlug: 'gc-ms', name: '5977B GC/MSD', slug: '5977b-gc-msd' },
  { brandSlug: 'agilent-technologies', categorySlug: 'uv', name: 'Cary 60 UV-Vis', slug: 'cary-60-uv-vis' },

  // Thermo Scientific
  { brandSlug: 'thermo-scientific', categorySlug: 'hplc', name: 'Vanquish', slug: 'vanquish' },
  { brandSlug: 'thermo-scientific', categorySlug: 'hplc', name: 'UltiMate 3000', slug: 'ultimate-3000' },
  { brandSlug: 'thermo-scientific', categorySlug: 'lc-ms', name: 'TSQ Quantis', slug: 'tsq-quantis' },
  { brandSlug: 'thermo-scientific', categorySlug: 'ftir', name: 'Nicolet iS5', slug: 'nicolet-is5' },

  // PerkinElmer
  { brandSlug: 'perkinelmer', categorySlug: 'gc', name: 'Clarus 690 GC', slug: 'clarus-690-gc' },
  { brandSlug: 'perkinelmer', categorySlug: 'uv', name: 'LAMBDA 365', slug: 'lambda-365' },

  // SCIEX
  { brandSlug: 'sciex', categorySlug: 'lc-ms', name: 'Triple Quad 6500+', slug: 'triple-quad-6500-plus' },

  // JASCO
  { brandSlug: 'jasco', categorySlug: 'uv', name: 'V-730', slug: 'v-730' },

  // Hitachi
  { brandSlug: 'hitachi', categorySlug: 'hplc', name: 'Chromaster', slug: 'chromaster' },
];
