import "@/styles/sf-design-system.css";

export default function ProjectTemplate({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="sf-product contents">{children}</div>;
}
