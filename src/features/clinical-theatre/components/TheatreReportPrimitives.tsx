/** Shared building blocks for theatre report pages. */

export function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold text-brand-navy">{value}</p>
    </div>
  );
}

export function ReportTable({
  title,
  headers,
  rows,
  empty,
}: {
  title: string;
  headers: string[];
  rows: (string | number)[][];
  empty: string;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-brand-navy">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                {headers.map((header) => (
                  <th key={header} className="py-1 pr-3">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className="border-t">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="py-1 pr-3">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
