import { supabase } from "../lib/supabase";

export async function createReportWithIoCs({
  title,
  reportDate,
  tenantId,
  agentId,
  ruleDescription,
  fileName,
  fileType,
  rawContent,
  iocs = [],
}) {
  // 1. Insert Report
  const { data: report, error: reportError } = await supabase
    .from("reports")
    .insert({
      title,
      report_date: reportDate,
      tenant_id: tenantId || null,
      agent_id: agentId || null,
      rule_description: ruleDescription || null,
      file_name: fileName || null,
      file_type: fileType || null,
      raw_content: rawContent || null,
    })
    .select()
    .single();

  if (reportError) throw new Error(reportError.message);

  // 2. Insert Extracted IoCs
  if (iocs.length > 0) {
    const iocRecords = iocs.map((ioc) => ({
      report_id: report.id,
      ioc_type: ioc.type,
      value: ioc.value,
      source: ioc.source || null,
      country: ioc.country || null,
      asn: ioc.asn || null,
      status: ioc.status || "Malicious",
    }));

    const { error: iocError } = await supabase
      .from("extracted_iocs")
      .insert(iocRecords);

    if (iocError) throw new Error(iocError.message);
  }

  return { success: true, reportId: report.id };
}
