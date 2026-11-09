"use client";

export function EmptyAction({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-md border border-dashed border-dash-border px-4 py-8 text-center">
      <p className="text-[13px] font-medium text-brand-navy">{title}</p>
      <p className="mt-1 text-[13px] text-dash-muted">{description}</p>
    </div>
  );
}


