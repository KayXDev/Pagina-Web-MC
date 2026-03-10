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
    <Card hover={false} className="admin-section-banner relative overflow-hidden rounded-[28px] px-5 py-5 md:px-6 md:py-5">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(15,23,42,0.24),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(8,145,178,0.12),transparent_30%)]" />

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="grid h-13 w-13 shrink-0 place-items-center rounded-2xl border border-white/10 bg-slate-900 text-base text-cyan-200 shadow-[0_18px_40px_-28px_rgba(0,0,0,0.7)] md:h-14 md:w-14 md:text-lg">
            {icon}
          </div>

          <div className="max-w-3xl min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              <span>{eyebrow}</span>
            </div>

            <div className="mt-3">
              <h1 className="text-[1.65rem] font-black tracking-[-0.04em] text-white md:text-[2rem]">
                {title}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 md:text-[15px]">
                {description}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 lg:justify-end">
          {badgeLabel ? (
            <div className="inline-flex items-center rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
              {badgeLabel}
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}