export interface SeedProduct {
  sku: string;
  slug: string;
  name: string;
  brand: string;
  description: string;
}

export interface SeedInstrumentCategory {
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
  products: SeedProduct[];
}

export const INSTRUMENT_CATEGORIES: SeedInstrumentCategory[] = [
  {
    slug: 'hplc',
    name: 'HPLC',
    description: 'High-performance liquid chromatography systems for pharmaceutical QC, R&D and routine analysis.',
    sortOrder: 1,
    products: [
      {
        sku: 'INST-HPLC-001',
        slug: 'shimadzu-lc-2030c-plus',
        name: 'Shimadzu LC-2030C Plus',
        brand: 'Shimadzu',
        description:
          'Integrated HPLC system combining pump, autosampler, column oven and PDA detector in a single compact unit - suited for pharmaceutical QC and routine analysis.',
      },
      {
        sku: 'INST-HPLC-002',
        slug: 'agilent-1260-infinity-ii',
        name: 'Agilent 1260 Infinity II',
        brand: 'Agilent Technologies',
        description:
          'Modular HPLC platform supporting UV, PDA, fluorescence and RI detectors, built for labs that need flexibility across multiple methods.',
      },
    ],
  },
  {
    slug: 'gc',
    name: 'GC',
    description: 'Gas chromatography systems and detectors for petrochemical, environmental and food-safety testing.',
    sortOrder: 2,
    products: [
      {
        sku: 'INST-GC-001',
        slug: 'shimadzu-gc-2030',
        name: 'Shimadzu GC-2030',
        brand: 'Shimadzu',
        description:
          'High-throughput gas chromatograph with fast oven ramping, supporting FID, TCD and ECD detector configurations.',
      },
      {
        sku: 'INST-GC-002',
        slug: 'agilent-8890-gc-system',
        name: 'Agilent 8890 GC System',
        brand: 'Agilent Technologies',
        description:
          'Reliable, easy-to-maintain GC platform for routine and complex analyses across petrochemical, environmental and food-testing labs.',
      },
    ],
  },
  {
    slug: 'lc-ms',
    name: 'LC-MS',
    description: 'Liquid chromatography mass spectrometry systems for high-sensitivity quantitation.',
    sortOrder: 3,
    products: [
      {
        sku: 'INST-LCMS-001',
        slug: 'shimadzu-lcms-2020',
        name: 'Shimadzu LCMS-2020',
        brand: 'Shimadzu',
        description:
          'Single-quadrupole LC-MS platform for high-sensitivity quantitation in pharmaceutical, forensic and environmental labs.',
      },
      {
        sku: 'INST-LCMS-002',
        slug: 'waters-acquity-qda',
        name: 'Waters ACQUITY QDa',
        brand: 'Waters',
        description:
          'Compact mass detector that adds mass confirmation to routine LC workflows without specialist MS expertise.',
      },
    ],
  },
  {
    slug: 'gc-ms',
    name: 'GC-MS',
    description: 'Gas chromatography mass spectrometry systems for trace-level identification and quantitation.',
    sortOrder: 4,
    products: [
      {
        sku: 'INST-GCMS-001',
        slug: 'shimadzu-gcms-qp2020-nx',
        name: 'Shimadzu GCMS-QP2020 NX',
        brand: 'Shimadzu',
        description:
          'High-sensitivity single-quadrupole GC-MS for trace-level identification, widely used in forensic, environmental and food-residue testing.',
      },
      {
        sku: 'INST-GCMS-002',
        slug: 'agilent-5977b-gc-msd',
        name: 'Agilent 5977B GC/MSD',
        brand: 'Agilent Technologies',
        description:
          'Rugged, high-sensitivity mass selective detector paired with Agilent GC systems for demanding trace-analysis workflows.',
      },
    ],
  },
  {
    slug: 'uv',
    name: 'UV-Vis',
    description: 'UV-Visible spectrophotometers for routine QC through advanced research applications.',
    sortOrder: 5,
    products: [
      {
        sku: 'INST-UV-001',
        slug: 'shimadzu-uv-1900i',
        name: 'Shimadzu UV-1900i',
        brand: 'Shimadzu',
        description:
          'Double-beam UV-Vis spectrophotometer with a wide wavelength range, suited for pharmacopeial and routine QC testing.',
      },
      {
        sku: 'INST-UV-002',
        slug: 'agilent-cary-60-uv-vis',
        name: 'Agilent Cary 60 UV-Vis',
        brand: 'Agilent Technologies',
        description:
          'Compact, fibre-optic-ready UV-Vis spectrophotometer for fast routine measurements and kinetics studies.',
      },
    ],
  },
  {
    slug: 'ftir',
    name: 'FTIR',
    description: 'Fourier-transform infrared spectrometers for material identification and verification.',
    sortOrder: 6,
    products: [
      {
        sku: 'INST-FTIR-001',
        slug: 'shimadzu-irspirit',
        name: 'Shimadzu IRSpirit',
        brand: 'Shimadzu',
        description:
          'Compact FTIR spectrometer for material identification, polymer analysis and pharmaceutical raw-material verification.',
      },
      {
        sku: 'INST-FTIR-002',
        slug: 'thermo-nicolet-is20',
        name: 'Thermo Scientific Nicolet iS20',
        brand: 'Thermo Scientific',
        description:
          'Research-grade FTIR platform with interchangeable sampling accessories for QC and R&D applications.',
      },
    ],
  },
];
