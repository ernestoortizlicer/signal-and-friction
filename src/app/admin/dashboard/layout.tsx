import "./legacy-dashboard.css";

export default function LegacySalesDashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="legacy-sales-dashboard contents">{children}</div>;
}
