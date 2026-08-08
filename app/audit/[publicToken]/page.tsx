import AuditReportClient from "./AuditReportClient";

export default async function AuditReportPage({
  params,
}: {
  params: Promise<{ publicToken: string }>;
}) {
  const { publicToken } = await params;
  return <AuditReportClient publicToken={publicToken} />;
}
