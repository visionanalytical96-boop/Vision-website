import { BlogCategory } from '@/generated/prisma/client';

export const BLOG_CATEGORY_LABELS: Record<BlogCategory, string> = {
  TROUBLESHOOTING: 'Troubleshooting',
  FAQ: 'FAQs',
  TECHNICAL_ARTICLE: 'Technical Articles',
  INSTRUMENT_GUIDE: 'Instrument Guides',
};

export const BLOG_CATEGORIES = Object.values(BlogCategory);
