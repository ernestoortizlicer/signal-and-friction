import SLAClientView from "./SLAClientView";

export async function generateStaticParams() {
  return [{ clientKey: "acme-corp" }];
}

export default async function Page({
  params,
}: {
  params: Promise<{ clientKey: string }>;
}) {
  const { clientKey } = await params;
  return <SLAClientView staticClientKey={clientKey} />;
}
