import type { Metadata } from "next";
import AuditReportClient from "./AuditReportClient";

export const metadata: Metadata = {
  title: "Your Practice Growth Audit",
  robots: { index: false, follow: false },
};

export default async function AuditReportPage({
  params,
}: {
  params: Promise<{ publicToken: string }>;
}) {
  const { publicToken } = await params;
  return <AuditReportClient publicToken={publicToken} />;
}
