import { Card } from '@/components/ui';

type AdminSectionBannerProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  badgeLabel?: string;
};

export default function AdminSectionBanner({
  eyebrow,
  title,
  description,
  icon,
  badgeLabel,
}: AdminSectionBannerProps) {
  return (
    <Card hover={false} className="relative overflow-hidden rounded-[26px] border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25 px-5 py-5 md:px-6 md:py-5">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(34,197,94,0.12),transparent_36%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(34,197,94,0.14),transparent_36%)]" />

      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/70 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-300">
            <span className="text-sm text-minecraft-diamond">{icon}</span>
            <span>{eyebrow}</span>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-minecraft-diamond/10 text-lg text-minecraft-diamond md:h-12 md:w-12 md:text-xl">
              {icon}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-black text-gray-900 dark:text-white md:text-2xl">{title}</h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{description}</p>
            </div>
          </div>
        </div>

        {badgeLabel ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
              {badgeLabel}
            </span>
          </div>
        ) : null}
      </div>
    </Card>
  );
}