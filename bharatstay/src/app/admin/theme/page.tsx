import { getTheme, THEME_FIELDS } from '@/lib/theme';
import { ThemeEditor } from '@/components/admin/ThemeEditor';

export const dynamic = 'force-dynamic';

export default async function AdminThemePage() {
  const theme = await getTheme();

  return (
    <div className="max-w-4xl">
      <h1 className="display text-[clamp(26px,4vw,38px)]">Theme</h1>
      <p className="mt-2 max-w-[62ch] text-[14px]" style={{ color: 'var(--basalt)' }}>
        Glass ka look yahan se badlo — kitna dhundhla, kitna paardarshi, kitna floating, aur background ka rang.
        Neeche preview turant badalta hai; save karne par poori site par lag jaata hai.
      </p>

      <ThemeEditor
        fields={THEME_FIELDS.map((f) => ({
          key: f.key,
          label: f.label,
          hint: f.hint,
          unit: f.unit,
          type: f.type,
          min: 'min' in f ? f.min : undefined,
          max: 'max' in f ? f.max : undefined,
          step: 'step' in f ? f.step : undefined,
          value: theme[f.key] ?? f.fallback,
          fallback: f.fallback,
        }))}
      />
    </div>
  );
}
