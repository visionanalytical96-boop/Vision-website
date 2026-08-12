import type { Metadata } from 'next';
import { getFeatureFlagSettings } from '@/lib/data/features';
import { setFeatureFlag } from '@/lib/actions/admin-features';
import { Button } from '@/components/ui/Button';

export const metadata: Metadata = { title: 'Feature Flags' };

export default async function AdminFeatureFlagsPage() {
  const flags = await getFeatureFlagSettings();

  const groups = new Map<string, typeof flags>();
  for (const flag of flags) {
    groups.set(flag.group, [...(groups.get(flag.group) ?? []), flag]);
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        Turn parts of the platform on and off without a deploy. Changes take effect immediately.
      </p>

      {[...groups.entries()].map(([group, groupFlags]) => (
        <section key={group}>
          <h2 className="font-display text-base font-semibold text-foreground">{group}</h2>
          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
            {groupFlags.map((flag) => (
              <li key={flag.key} className="flex flex-wrap items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">{flag.label}</p>
                  <p className="mt-0.5 text-sm text-muted">{flag.description}</p>
                </div>
                <form action={setFeatureFlag} className="flex flex-none items-center gap-3">
                  <input type="hidden" name="key" value={flag.key} />
                  <input type="hidden" name="isEnabled" value={String(!flag.isEnabled)} />
                  <span
                    className={
                      flag.isEnabled
                        ? 'text-sm font-medium text-success'
                        : 'text-sm font-medium text-muted'
                    }
                  >
                    {flag.isEnabled ? 'On' : 'Off'}
                  </span>
                  <Button type="submit" variant="outline" size="sm">
                    Turn {flag.isEnabled ? 'off' : 'on'}
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
