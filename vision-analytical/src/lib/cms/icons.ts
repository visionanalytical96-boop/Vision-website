import {
  Package,
  RefreshCw,
  Cog,
  ShieldCheck,
  Gauge,
  ClipboardCheck,
  Headset,
  Clock,
  FileCheck2,
  Handshake,
  Wrench,
  FlaskConical,
  MapPin,
  CalendarDays,
  Globe2,
  Pill,
  Leaf,
  Droplets,
  Factory,
  GraduationCap,
  Sprout,
  CalendarClock,
  AlertTriangle,
  Beaker,
  Microscope,
  BadgeCheck,
  Laptop,
  Star,
  Award,
  Users,
  type LucideIcon,
} from 'lucide-react';

// Curated icon set for CMS-editable cards (homepage lifecycle/why-us,
// about industries/facts, services). Deliberately a fixed list rather than
// free-form icon upload/search - keeps every icon on the site visually
// consistent with the rest of the design system.
export const ICON_MAP: Record<string, LucideIcon> = {
  package: Package,
  'refresh-cw': RefreshCw,
  cog: Cog,
  'shield-check': ShieldCheck,
  gauge: Gauge,
  'clipboard-check': ClipboardCheck,
  headset: Headset,
  clock: Clock,
  'file-check': FileCheck2,
  handshake: Handshake,
  wrench: Wrench,
  flask: FlaskConical,
  'map-pin': MapPin,
  calendar: CalendarDays,
  globe: Globe2,
  pill: Pill,
  leaf: Leaf,
  droplets: Droplets,
  factory: Factory,
  'graduation-cap': GraduationCap,
  sprout: Sprout,
  'calendar-clock': CalendarClock,
  'alert-triangle': AlertTriangle,
  beaker: Beaker,
  microscope: Microscope,
  'badge-check': BadgeCheck,
  laptop: Laptop,
  star: Star,
  award: Award,
  users: Users,
};

export const ICON_KEYS = Object.keys(ICON_MAP);
export const DEFAULT_ICON_KEY = 'package';

export function resolveIcon(key: string): LucideIcon {
  return ICON_MAP[key] ?? ICON_MAP[DEFAULT_ICON_KEY];
}
