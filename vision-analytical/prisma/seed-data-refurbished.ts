import { RefurbishedCondition } from '../src/generated/prisma/client';

export interface SeedRefurbishedInstrument {
  slug: string;
  name: string;
  brand: string;
  model: string;
  condition: RefurbishedCondition;
  includedAccessories: string[];
  warrantyMonths: number;
  description: string;
}

export interface SeedRefurbishedCategory {
  slug: string;
  name: string;
  sortOrder: number;
  instrument: SeedRefurbishedInstrument;
}

export const REFURBISHED_CATEGORIES: SeedRefurbishedCategory[] = [
  {
    slug: 'hplc',
    name: 'HPLC',
    sortOrder: 1,
    instrument: {
      slug: 'refurbished-shimadzu-lc-2010c-ht',
      name: 'Shimadzu LC-2010C HT',
      brand: 'Shimadzu',
      model: 'LC-2010C HT',
      condition: RefurbishedCondition.GOOD,
      includedAccessories: ['Column oven', 'Autosampler', 'PDA detector', 'Original manuals'],
      warrantyMonths: 6,
      description:
        'Fully tested and validated HPLC system, function-checked across pump, autosampler and detector before listing. Comes with a 6-month warranty.',
    },
  },
  {
    slug: 'gc',
    name: 'GC',
    sortOrder: 2,
    instrument: {
      slug: 'refurbished-agilent-7890a-gc-system',
      name: 'Agilent 7890A GC System',
      brand: 'Agilent Technologies',
      model: '7890A',
      condition: RefurbishedCondition.EXCELLENT,
      includedAccessories: ['FID detector', 'Split/splitless injector', 'Autosampler tray'],
      warrantyMonths: 6,
      description:
        'Low-usage GC system in excellent cosmetic and functional condition, fully serviced with new septa, liner and o-rings before sale.',
    },
  },
  {
    slug: 'lcms',
    name: 'LCMS',
    sortOrder: 3,
    instrument: {
      slug: 'refurbished-shimadzu-lcms-2010ev',
      name: 'Shimadzu LCMS-2010EV',
      brand: 'Shimadzu',
      model: 'LCMS-2010EV',
      condition: RefurbishedCondition.GOOD,
      includedAccessories: ['ESI source', 'Vacuum pump', 'Data system license'],
      warrantyMonths: 3,
      description:
        'Single-quadrupole LC-MS system, validated for sensitivity and mass accuracy before sale. Ideal as a second/backup MS system.',
    },
  },
  {
    slug: 'uv',
    name: 'UV',
    sortOrder: 4,
    instrument: {
      slug: 'refurbished-shimadzu-uv-1800',
      name: 'Shimadzu UV-1800',
      brand: 'Shimadzu',
      model: 'UV-1800',
      condition: RefurbishedCondition.EXCELLENT,
      includedAccessories: ['Sample compartment accessories', 'Quartz cuvettes', 'Power cable'],
      warrantyMonths: 6,
      description:
        'Double-beam UV-Vis spectrophotometer, wavelength-calibrated and function-tested before listing. Suited for routine QC labs.',
    },
  },
];
