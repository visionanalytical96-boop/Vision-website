export interface SeedSparePart {
  sku: string;
  slug: string;
  name: string;
  compatibleBrands: string[];
  description: string;
}

export interface SeedSparePartCategory {
  slug: string;
  name: string;
  sortOrder: number;
  part: SeedSparePart;
}

const ALL_BRANDS = ['Shimadzu', 'Waters', 'Agilent Technologies', 'Thermo Scientific'];

export const SPARE_PART_CATEGORIES: SeedSparePartCategory[] = [
  {
    slug: 'lamps',
    name: 'Lamps',
    sortOrder: 1,
    part: {
      sku: 'SP-LAMP-001',
      slug: 'deuterium-lamp-uv-detector',
      name: 'Deuterium Lamp (UV Detector)',
      compatibleBrands: ALL_BRANDS,
      description: 'Replacement deuterium lamp for HPLC UV/PDA detectors. Rated for extended operating life.',
    },
  },
  {
    slug: 'columns',
    name: 'Columns',
    sortOrder: 2,
    part: {
      sku: 'SP-COL-001',
      slug: 'c18-hplc-column-250x4-6mm-5um',
      name: 'C18 HPLC Column, 250 x 4.6mm, 5μm',
      compatibleBrands: ALL_BRANDS,
      description: 'General-purpose reversed-phase C18 column for routine pharmaceutical and QC methods.',
    },
  },
  {
    slug: 'ferrules',
    name: 'Ferrules',
    sortOrder: 3,
    part: {
      sku: 'SP-FER-001',
      slug: 'graphite-vespel-ferrule-gc',
      name: 'Graphite/Vespel Ferrule (GC)',
      compatibleBrands: ['Shimadzu', 'Agilent Technologies'],
      description: 'High-temperature graphite/Vespel ferrule for GC inlet and column connections.',
    },
  },
  {
    slug: 'tubing',
    name: 'Tubing',
    sortOrder: 4,
    part: {
      sku: 'SP-TUB-001',
      slug: 'ptfe-tubing-1-16-od',
      name: 'PTFE Tubing, 1/16" OD',
      compatibleBrands: ALL_BRANDS,
      description: 'Chemically inert PTFE tubing for HPLC solvent and sample lines.',
    },
  },
  {
    slug: 'fittings',
    name: 'Fittings',
    sortOrder: 5,
    part: {
      sku: 'SP-FIT-001',
      slug: 'peek-fitting-set',
      name: 'PEEK Fitting Set',
      compatibleBrands: ALL_BRANDS,
      description: 'Finger-tight PEEK fittings for low-pressure HPLC flow path connections.',
    },
  },
  {
    slug: 'pump-parts',
    name: 'Pump Parts',
    sortOrder: 6,
    part: {
      sku: 'SP-PUMP-001',
      slug: 'pump-seal-wash-kit',
      name: 'Pump Seal Wash Kit',
      compatibleBrands: ['Shimadzu', 'Agilent Technologies'],
      description: 'Seal wash kit for HPLC binary/quaternary pump heads, reduces piston seal wear.',
    },
  },
  {
    slug: 'seals',
    name: 'Seals',
    sortOrder: 7,
    part: {
      sku: 'SP-SEAL-001',
      slug: 'pump-head-seal-kit',
      name: 'Pump Head Seal Kit',
      compatibleBrands: ALL_BRANDS,
      description: 'High-pressure piston seal replacement kit for HPLC pump heads.',
    },
  },
  {
    slug: 'pistons',
    name: 'Pistons',
    sortOrder: 8,
    part: {
      sku: 'SP-PIST-001',
      slug: 'ceramic-pump-piston',
      name: 'Ceramic Pump Piston',
      compatibleBrands: ['Shimadzu', 'Waters', 'Agilent Technologies'],
      description: 'Ceramic piston for HPLC pump heads, wear-resistant for high-cycle applications.',
    },
  },
  {
    slug: 'check-valves',
    name: 'Check Valves',
    sortOrder: 9,
    part: {
      sku: 'SP-CV-001',
      slug: 'inlet-outlet-check-valve-cartridge',
      name: 'Inlet/Outlet Check Valve Cartridge',
      compatibleBrands: ALL_BRANDS,
      description: 'Replacement check valve cartridge for HPLC pump inlet or outlet.',
    },
  },
  {
    slug: 'injector-parts',
    name: 'Injector Parts',
    sortOrder: 10,
    part: {
      sku: 'SP-INJ-001',
      slug: 'gc-injector-liner-split-splitless',
      name: 'GC Injector Liner (Split/Splitless)',
      compatibleBrands: ['Shimadzu', 'Agilent Technologies'],
      description: 'Deactivated glass injector liner for split/splitless GC inlets.',
    },
  },
  {
    slug: 'detector-parts',
    name: 'Detector Parts',
    sortOrder: 11,
    part: {
      sku: 'SP-DET-001',
      slug: 'fid-jet-gc-detector',
      name: 'FID Jet (GC Detector)',
      compatibleBrands: ['Shimadzu', 'Agilent Technologies'],
      description: 'Replacement flame ionisation detector jet for GC systems.',
    },
  },
  {
    slug: 'flow-cells',
    name: 'Flow Cells',
    sortOrder: 12,
    part: {
      sku: 'SP-FC-001',
      slug: 'uv-detector-flow-cell',
      name: 'UV Detector Flow Cell',
      compatibleBrands: ALL_BRANDS,
      description: 'Analytical flow cell for HPLC UV/PDA detectors, standard path length.',
    },
  },
  {
    slug: 'degasser-parts',
    name: 'Degasser Parts',
    sortOrder: 13,
    part: {
      sku: 'SP-DEG-001',
      slug: 'degasser-membrane-chamber',
      name: 'Degasser Membrane Chamber',
      compatibleBrands: ['Shimadzu', 'Agilent Technologies'],
      description: 'Replacement membrane chamber for HPLC online solvent degassers.',
    },
  },
  {
    slug: 'filters',
    name: 'Filters',
    sortOrder: 14,
    part: {
      sku: 'SP-FLT-001',
      slug: 'inline-solvent-filter-0-5um',
      name: 'Inline Solvent Filter, 0.5μm',
      compatibleBrands: ALL_BRANDS,
      description: 'Inline stainless steel frit filter for HPLC solvent inlet lines.',
    },
  },
  {
    slug: 'o-rings',
    name: 'O-rings',
    sortOrder: 15,
    part: {
      sku: 'SP-OR-001',
      slug: 'viton-o-ring-set',
      name: 'Viton O-Ring Set',
      compatibleBrands: ALL_BRANDS,
      description: 'Chemically resistant Viton O-ring set for pump and autosampler seals.',
    },
  },
  {
    slug: 'solvent-bottles',
    name: 'Solvent Bottles',
    sortOrder: 16,
    part: {
      sku: 'SP-BTL-001',
      slug: 'solvent-bottle-cap-assembly-1l',
      name: 'Solvent Bottle Cap Assembly, 1L',
      compatibleBrands: ALL_BRANDS,
      description: 'Solvent reservoir cap assembly with inlet lines and sinker filters, 1 litre.',
    },
  },
  {
    slug: 'autosampler-parts',
    name: 'Autosampler Parts',
    sortOrder: 17,
    part: {
      sku: 'SP-AS-001',
      slug: 'autosampler-syringe-100ul',
      name: 'Autosampler Syringe, 100μL',
      compatibleBrands: ALL_BRANDS,
      description: 'Replacement injection syringe for HPLC/GC autosamplers.',
    },
  },
];
