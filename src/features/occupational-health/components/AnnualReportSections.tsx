import { ANNUAL_SECTION_LABEL, type AnnualReport } from "@/features/occupational-health/services/oh-annual-report.service";

export function AnnualReportSections({ report }: { report: AnnualReport }) {
  return (
    <div className="grid gap-4 md:grid-cols-2" data-testid="annual-report-sections">
      {Object.entries(report.sections).map(([key, rows]) => (
        <section key={key} className="rounded-md border border-dash-border p-3 text-[13px]">
          <h3 className="mb-2 font-semibold text-brand-navy">{ANNUAL_SECTION_LABEL[key] ?? key.replace(/_/g, " ")}</h3>
          {Object.keys(rows).length === 0 ? (
            <p className="text-dash-muted">Nothing recorded.</p>
          ) : (
            <table className="w-full">
              <tbody>
                {Object.entries(rows).map(([label, value]) => (
                  <tr key={label} className="border-b border-dash-border/60 last:border-0">
                    <td className="py-1 pr-2">{label}</td>
                    <td className="py-1 text-right tabular-nums">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ))}
      {report.suppression ? <p className="text-[12px] text-dash-muted md:col-span-2">{report.suppression}</p> : null}
    </div>
  );
}
