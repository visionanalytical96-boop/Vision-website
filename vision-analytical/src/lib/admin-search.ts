/**
 * What an admin can search for.
 *
 * The site search looks through products, parts and articles — the catalogue.
 * Typing "password reset" into it finds nothing, correctly, and unhelpfully:
 * the thing being looked for is a screen, not a product. This index covers
 * the admin panel itself.
 *
 * Entries carry the words people actually type, not the words on the button.
 * Someone looking for the theme editor types "colour", "logo" or "font"; the
 * page is called Theme. Someone with a stuck login types "password", and the
 * answer lives on the employee's own page. Indexing only the visible label
 * would leave both of them with an empty result, which reads as "this
 * software cannot do that".
 *
 * Pure and dependency-free so it can be tested directly and shipped to the
 * client without a round trip — 60-odd entries is far cheaper to search in
 * the browser than to ask the server about on every keystroke.
 */

export interface AdminSearchEntry {
  /** What the result says. */
  title: string;
  /** Where it goes. */
  href: string;
  /** Sidebar group, so a result is placed as well as named. */
  section: 'Business' | 'Team' | 'Website' | 'Overview';
  /** One line on what you do here. */
  description: string;
  /** Words people type when looking for this, beyond the title. */
  keywords: string[];
}

export const ADMIN_SEARCH_INDEX: AdminSearchEntry[] = [
  // --- Overview -----------------------------------------------------------
  {
    title: 'Dashboard',
    href: '/admin',
    section: 'Overview',
    description: 'Today at a glance — new orders, quotes and service requests.',
    keywords: ['home', 'summary', 'overview', 'today', 'start'],
  },
  {
    title: 'Data Quality',
    href: '/admin/quality',
    section: 'Overview',
    description: 'Incomplete records — products with no photo, missing prices.',
    keywords: ['missing', 'incomplete', 'errors', 'cleanup', 'empty fields', 'no image'],
  },
  {
    title: 'Reports',
    href: '/admin/reports',
    section: 'Overview',
    description: 'Sales and service figures.',
    keywords: ['analytics', 'numbers', 'statistics', 'revenue', 'export'],
  },
  {
    title: 'Bulk Import',
    href: '/admin/import',
    section: 'Overview',
    description: 'Upload a CSV or Excel file to add products, customers, companies and more in bulk.',
    keywords: [
      'import', 'upload', 'csv', 'excel', 'xlsx', 'spreadsheet', 'bulk',
      'data entry', 'migrate', 'fill data', 'template', 'mass upload',
    ],
  },

  // --- Business -----------------------------------------------------------
  {
    title: 'Products',
    href: '/admin/products',
    section: 'Business',
    description: 'Instruments, spare parts and refurbished units.',
    keywords: ['catalogue', 'catalog', 'items', 'stock list', 'price', 'sku', 'photo', 'image'],
  },
  {
    title: 'Add a product',
    href: '/admin/products/new',
    section: 'Business',
    description: 'Create a new instrument, spare part or refurbished unit.',
    keywords: ['new product', 'create', 'add item', 'upload photo', 'new sku'],
  },
  {
    title: 'Product categories',
    href: '/admin/products/categories',
    section: 'Business',
    description: 'HPLC, GC, UV and the rest.',
    keywords: ['category', 'technique', 'hplc', 'gc', 'uv', 'lcms', 'gcms', 'grouping'],
  },
  {
    title: 'Instrument models',
    href: '/admin/products/instrument-models',
    section: 'Business',
    description: 'The models spare parts are compatible with.',
    keywords: ['model', 'compatibility', 'fits', 'agilent', 'shimadzu', 'waters', 'which parts'],
  },
  {
    title: 'Refurbished instruments',
    href: '/admin/products/refurbished',
    section: 'Business',
    description: 'Second-hand units, their condition and warranty.',
    keywords: ['used', 'second hand', 'pre-owned', 'condition'],
  },
  {
    title: 'Inventory',
    href: '/admin/inventory',
    section: 'Business',
    description: 'Stock levels and what is running low.',
    keywords: ['stock', 'quantity', 'low stock', 'out of stock', 'warehouse', 'godown'],
  },
  {
    title: 'Suppliers',
    href: '/admin/inventory/suppliers',
    section: 'Business',
    description: 'Who you buy from.',
    keywords: ['vendor', 'purchase', 'supplier', 'buying'],
  },
  {
    title: 'Orders',
    href: '/admin/orders',
    section: 'Business',
    description: 'Customer orders and their status.',
    keywords: ['sales', 'purchase order', 'dispatch', 'shipping', 'delivery', 'invoice'],
  },
  {
    title: 'Quotes',
    href: '/admin/quotes',
    section: 'Business',
    description: 'Quotation requests and your replies.',
    keywords: ['quotation', 'estimate', 'pricing request', 'enquiry', 'inquiry'],
  },
  {
    title: 'Customers',
    href: '/admin/customers',
    section: 'Business',
    description: 'Customer accounts and their history.',
    keywords: ['client', 'buyer', 'lab', 'company', 'contact', 'account'],
  },
  {
    title: 'CRM — leads',
    href: '/admin/crm',
    section: 'Business',
    description: 'Enquiries that have not become customers yet.',
    keywords: ['lead', 'prospect', 'follow up', 'enquiry', 'pipeline', 'sales funnel'],
  },
  {
    title: 'Engineers',
    href: '/admin/engineers',
    section: 'Business',
    description: 'Field engineers and their skills.',
    keywords: ['technician', 'service engineer', 'field staff', 'skills'],
  },
  {
    title: 'Service requests',
    href: '/admin/service-requests',
    section: 'Business',
    description: 'Breakdown and service tickets. Assign an engineer here.',
    keywords: ['complaint', 'ticket', 'breakdown', 'repair', 'assign engineer', 'job', 'visit'],
  },
  {
    title: 'Service reports',
    href: '/admin/service-reports',
    section: 'Business',
    description: 'The signed field report for each visit. Generate one and download it as a PDF.',
    keywords: [
      'service report',
      'field report',
      'visit report',
      'report format',
      'print report',
      'pdf',
      'download pdf',
      'signature',
      'fault reported',
      'observation',
      'parts replaced',
      'installation report',
      'calibration report',
      'engineer report',
    ],
  },
  {
    title: 'AMC / CMC contracts',
    href: '/admin/amc',
    section: 'Business',
    description: 'Service contracts and visits used.',
    keywords: ['amc', 'cmc', 'contract', 'annual maintenance', 'renewal', 'visits included'],
  },
  {
    title: 'Blog & articles',
    href: '/admin/blog',
    section: 'Business',
    description: 'Articles and knowledge base entries.',
    keywords: ['article', 'post', 'knowledge', 'content', 'writing', 'seo'],
  },

  // --- Team ---------------------------------------------------------------
  {
    title: 'Team dashboard',
    href: '/admin/team',
    section: 'Team',
    description: 'Who is in today, pending leave.',
    keywords: ['hr', 'hrms', 'staff', 'present today'],
  },
  {
    title: 'Employees',
    href: '/admin/team/employees',
    section: 'Team',
    description: 'Staff records. Set the biometric ID here so device punches match.',
    keywords: [
      'staff', 'worker', 'karmchari', 'salary', 'joining date',
      'password', 'reset password', 'change password', 'login problem', 'cannot login',
      'biometric id', 'employee code',
    ],
  },
  {
    title: 'Add an employee',
    href: '/admin/team/employees/new',
    section: 'Team',
    description: 'Create a staff record.',
    keywords: ['new employee', 'hire', 'joining', 'add staff'],
  },
  {
    title: 'Attendance',
    href: '/admin/team/attendance',
    section: 'Team',
    description: 'Daily attendance. Corrections are logged.',
    keywords: ['hazri', 'present', 'absent', 'punch', 'in out', 'late', 'timesheet'],
  },
  {
    title: 'Leave',
    href: '/admin/team/leave',
    section: 'Team',
    description: 'Leave applications and approvals.',
    keywords: ['chutti', 'holiday request', 'casual leave', 'sick leave', 'approve leave'],
  },
  {
    title: 'Holidays',
    href: '/admin/team/holidays',
    section: 'Team',
    description: 'The holiday calendar.',
    keywords: ['festival', 'public holiday', 'calendar', 'chutti list'],
  },
  {
    title: 'Departments',
    href: '/admin/team/departments',
    section: 'Team',
    description: 'Sales, Service, Accounts and so on.',
    keywords: ['department', 'team', 'division', 'section'],
  },
  {
    title: 'Attendance rules',
    href: '/admin/team/rules',
    section: 'Team',
    description: 'Office hours, grace period, half-day threshold.',
    keywords: ['office time', 'shift', 'grace', 'late mark', 'half day', 'working hours', 'setting'],
  },
  {
    title: 'Biometric devices',
    href: '/admin/team/devices',
    section: 'Team',
    description: 'Add a device, scan the network, test the connection, import punches.',
    keywords: [
      'biometric', 'fingerprint', 'thumb', 'machine', 'device', 'zkteco', 'z9000',
      'attendance machine', 'test connection', 'scan network', 'import punches', 'sync',
    ],
  },
  {
    title: 'Activity log',
    href: '/admin/team/activity',
    section: 'Team',
    description: 'Who changed what, and when.',
    keywords: ['audit', 'history', 'who changed', 'trail', 'log', 'tracking'],
  },
  {
    title: 'Attendance reports',
    href: '/admin/team/reports',
    section: 'Team',
    description: 'Monthly attendance summary.',
    keywords: ['monthly report', 'salary sheet', 'payroll', 'export attendance'],
  },

  // --- Website ------------------------------------------------------------
  {
    title: 'Homepage builder',
    href: '/admin/website/homepage',
    section: 'Website',
    description: 'Edit, reorder or hide each homepage section.',
    keywords: ['home page', 'hero', 'banner', 'sections', 'front page', 'landing', 'reorder', 'hide'],
  },
  {
    title: 'Pages & menus',
    href: '/admin/website/pages',
    section: 'Website',
    description: 'About, Services and Contact content; header and footer menus.',
    keywords: ['about us', 'services page', 'contact page', 'menu', 'navigation', 'header', 'footer', 'links'],
  },
  {
    title: 'Theme',
    href: '/admin/website/theme',
    section: 'Website',
    description: 'Colours, fonts, logo, favicon, button shape, animations.',
    keywords: [
      'colour', 'color', 'font', 'logo', 'favicon', 'design', 'look', 'branding',
      'animation', 'animations off', 'button style', 'dark mode', 'appearance',
    ],
  },
  {
    title: 'Business settings',
    href: '/admin/website/settings',
    section: 'Website',
    description: 'Company name, phone, WhatsApp, email, address — used site-wide.',
    keywords: [
      'company name', 'phone', 'mobile', 'whatsapp', 'email', 'address',
      'contact details', 'gst', 'setting', 'settings',
    ],
  },
  {
    title: 'Downloads',
    href: '/admin/website/downloads',
    section: 'Website',
    description: 'Catalogues, manuals and brochures for customers.',
    keywords: ['pdf', 'catalogue', 'brochure', 'manual', 'datasheet', 'file', 'upload document'],
  },
  {
    title: 'Testimonials',
    href: '/admin/website/testimonials',
    section: 'Website',
    description: 'Customer quotes shown on the site.',
    keywords: ['review', 'feedback', 'customer says', 'rating'],
  },
  {
    title: 'Media library',
    href: '/admin/website/media',
    section: 'Website',
    description: 'Every uploaded image in one place.',
    keywords: ['images', 'photos', 'pictures', 'gallery', 'uploads', 'delete image'],
  },
  {
    title: 'Feature flags',
    href: '/admin/settings/features',
    section: 'Website',
    description: 'Turn whole modules on or off.',
    keywords: ['enable', 'disable', 'turn off', 'module', 'toggle', 'hide section', 'setting'],
  },
];

export interface ScoredEntry extends AdminSearchEntry {
  score: number;
}

/**
 * Rank entries against what has been typed.
 *
 * Scored rather than filtered so the best answer is first: a title match beats
 * a keyword match, which beats a mention in the description. Someone typing
 * "product" wants Products at the top, not "Data Quality" because its
 * description happens to contain the word.
 *
 * Every term has to match somewhere, so "add employee" narrows rather than
 * widening — an OR search over two common words returns most of the index and
 * is no better than no search at all.
 */
export function searchAdmin(query: string, index: AdminSearchEntry[] = ADMIN_SEARCH_INDEX): ScoredEntry[] {
  const terms = query.toLowerCase().split(/\s+/).map((term) => term.trim()).filter(Boolean);
  if (terms.length === 0) return [];

  const scored: ScoredEntry[] = [];

  for (const entry of index) {
    const title = entry.title.toLowerCase();
    const description = entry.description.toLowerCase();
    const keywords = entry.keywords.map((keyword) => keyword.toLowerCase());

    let total = 0;
    let everyTermMatched = true;

    for (const term of terms) {
      let best = 0;

      if (title === term) best = 100;
      else if (title.startsWith(term)) best = 70;
      else if (title.includes(term)) best = 50;

      for (const keyword of keywords) {
        if (keyword === term) best = Math.max(best, 60);
        else if (keyword.startsWith(term)) best = Math.max(best, 40);
        else if (keyword.includes(term)) best = Math.max(best, 25);
      }

      if (description.includes(term)) best = Math.max(best, 12);

      if (best === 0) {
        everyTermMatched = false;
        break;
      }
      total += best;
    }

    if (everyTermMatched) scored.push({ ...entry, score: total });
  }

  // Alphabetical within a tie, so the order never shuffles between keystrokes
  // that score the same — a list that moves under the cursor is worse than one
  // that is merely imperfect.
  return scored.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
}
