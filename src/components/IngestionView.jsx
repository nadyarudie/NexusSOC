import { useState, useRef } from "react";
import { toast } from "sonner";
import * as pdfjsLib from "pdfjs-dist";
import { supabase } from "../lib/supabase";
import { createReportWithIoCs } from "../services/reportServices.js";

// Safely resolve worker in Vite
const pdfWorker = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export default function IngestionView({ tenants = [], apiKeys = {} }) {
  const [activeTab, setActiveTab] = useState("upload");
  const [selectedFile, setSelectedFile] = useState(null);
  const [manualText, setManualText] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [rawFileContent, setRawFileContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);

  // Form States
  const [reportTitle, setReportTitle] = useState("");
  const [reportDate, setReportDate] = useState("");
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [ruleDescription, setRuleDescription] = useState("");
  const [extractedIocs, setExtractedIocs] = useState([]);
  const [hasIngested, setHasIngested] = useState(false);

  // Check ip_intel_events first; if new, query AbuseIPDB and insert into ip_intel_events
  const resolveIocsWithGlobalDb = async (iocsList) => {
    const ipItems = iocsList.filter((item) => item.type === "IPv4");
    if (ipItems.length === 0) return iocsList;

    const uniqueIps = Array.from(new Set(ipItems.map((i) => i.value)));
    const knownIpsMap = new Map();

    try {
      // 1. Check existing records in global_iocs_view (backed by ip_intel_events)
      const { data: existingRecords, error } = await supabase
        .from("global_iocs_view")
        .select("value, country, asn, status, abuse_score")
        .eq("origin_table", "events")
        .in("value", uniqueIps);

      if (!error && existingRecords) {
        existingRecords.forEach((rec) => {
          if (rec.value && !knownIpsMap.has(rec.value)) {
            knownIpsMap.set(rec.value, {
              country: rec.country && rec.country !== "N/A" ? rec.country : "-",
              asn: rec.asn && rec.asn !== "N/A" ? rec.asn : "-",
              status: rec.status || "Malicious",
            });
          }
        });
      }
    } catch (err) {
      console.error("Error checking ip_intel_events:", err);
    }

    // Resolve target host name from selected Agent or Tenant for the new event row
    const currentTenant = tenants.find(
      (t) => t.id.toString() === selectedTenantId,
    );
    const currentAgent = currentTenant?.agents?.find(
      (a) => a.id.toString() === selectedAgentId,
    );
    const resolvedTargetHost =
      currentAgent?.name || currentTenant?.name || "Unknown Host";

    // 2. Process each indicator: reuse existing DB data or query AbuseIPDB & insert into ip_intel_events
    const resolvedIocs = await Promise.all(
      iocsList.map(async (ioc) => {
        if (ioc.type !== "IPv4") return ioc;

        const ip = ioc.value;

        // Private / Local IP check
        if (
          ip.startsWith("10.") ||
          ip.startsWith("192.168.") ||
          ip.startsWith("127.")
        ) {
          return {
            ...ioc,
            country: "Local",
            asn: "-",
            status: "Safe",
          };
        }

        // Return existing validated data if already in ip_intel_events
        if (knownIpsMap.has(ip)) {
          const cached = knownIpsMap.get(ip);
          return {
            ...ioc,
            country: cached.country,
            asn: cached.asn,
            status: cached.status,
          };
        }

        // Otherwise, IP is new -> Query AbuseIPDB and insert into ip_intel_events
        const abuseKey =
          apiKeys?.abuseIpDb ||
          import.meta.env.VITE_ABUSEIPDB_API_KEY ||
          localStorage.getItem("abuseIpDbKey");

        if (abuseKey) {
          try {
            const response = await fetch(
              `/api/abuseipdb/check?ipAddress=${encodeURIComponent(ip)}&maxAgeInDays=90`,
              {
                headers: {
                  Key: abuseKey,
                  Accept: "application/json",
                },
              },
            );
            const json = await response.json();

            if (response.ok && json.data) {
              const data = json.data;
              const score = data.abuseConfidenceScore || 0;
              const country = data.countryCode || "N/A";
              const asn = data.asn ? `AS${data.asn}` : data.isp || "N/A";
              const status =
                score >= 50 ? "Malicious" : score > 0 ? "Suspicious" : "Safe";
              const nowIso = new Date().toISOString();

              // Upsert metadata into ip_intel_cache to satisfy foreign key & store geo/score
              await supabase.from("ip_intel_cache").upsert(
                {
                  ip,
                  abuse_score: score,
                  country_code: country,
                  isp: data.isp || asn,
                  reputation_source: "abuseipdb",
                  target_hosts: [resolvedTargetHost],
                  geo_json: {
                    as: asn,
                    isp: data.isp || asn,
                    country: data.countryName || country,
                    countryCode: country,
                  },
                  reputation_json: data,
                  last_seen: nowIso,
                },
                { onConflict: "ip" },
              );

              // Insert new event record directly into ip_intel_events to grow the database
              await supabase.from("ip_intel_events").insert({
                ip,
                seen_at: nowIso,
                alert_type:
                  ruleDescription || reportTitle || "AbuseIPDB Enrichment",
                attack_subtype: data.usageType || "threat_ingestion",
                mitre: [],
                target_host: resolvedTargetHost,
                endpoint: "N/A",
                outcome: status,
                raw_summary: `AbuseIPDB Enrichment | Score: ${score}% | ISP: ${data.isp || asn} | Total Reports: ${data.totalReports || 0}`,
              });

              return {
                ...ioc,
                country,
                asn,
                status,
              };
            }
          } catch (err) {
            console.error(`AbuseIPDB query failed for ${ip}:`, err);
          }
        }

        return ioc;
      }),
    );

    return resolvedIocs;
  };

  const extractIocsFromText = (text, sourceTag = "Text Input") => {
    const iocs = [];

    // IPs
    const ipRegex = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g;
    const ips = text.match(ipRegex) || [];
    ips.forEach((ip) =>
      iocs.push({
        type: "IPv4",
        value: ip,
        source: sourceTag,
        country: "US",
        asn: "AS15169",
        status: "Malicious",
      }),
    );

    // URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = text.match(urlRegex) || [];
    urls.forEach((url) =>
      iocs.push({
        type: "URL",
        value: url,
        source: sourceTag,
        country: "-",
        asn: "-",
        status: "Malicious",
      }),
    );

    // Deduplicate
    return Array.from(new Set(iocs.map((a) => a.value))).map((val) =>
      iocs.find((a) => a.value === val),
    );
  };

  const processFile = (file) => {
    setSelectedFile(file);
    setHasIngested(false);

    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
    setReportTitle(nameWithoutExt);

    let extractedTenantName = "";
    const tenantMatch = nameWithoutExt.match(/\(([^)]+)\)/);
    if (tenantMatch) {
      extractedTenantName = tenantMatch[1].toLowerCase();
    }

    const ruleMatch = file.name.match(
      /-\s*(.*?)(?=\s*\(|\.txt|\.pdf|\.json|$)/i,
    );
    if (ruleMatch) {
      setRuleDescription(ruleMatch[1].replace(/\.+$/, "").trim());
    }

    setReportDate(new Date().toISOString().split("T")[0]);

    if (file.name.endsWith(".pdf")) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const typedarray = new Uint8Array(event.target.result);
          const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
          let fullText = "";
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const strings = content.items.map((item) => item.str);
            fullText += strings.join(" ") + " ";
          }

          setRawFileContent(fullText);
          const textLower = fullText.toLowerCase();

          const foundTenant = tenants.find((t) =>
            textLower.includes(t.name.toLowerCase()),
          );
          if (foundTenant) {
            setSelectedTenantId(String(foundTenant.id));
            const foundAgent = foundTenant.agents?.find((a) =>
              textLower.includes(a.name.toLowerCase()),
            );
            if (foundAgent) {
              setSelectedAgentId(String(foundAgent.id));
            } else if (foundTenant.agents?.length > 0) {
              setSelectedAgentId(String(foundTenant.agents[0].id));
            }
          }

          const dateRegex = /(\d{4}-\d{2}-\d{2})|(\d{2}-\d{2}-\d{4})/;
          const dateMatch = fullText.match(dateRegex);
          if (dateMatch) {
            const d = dateMatch[1] || dateMatch[2];
            try {
              setReportDate(new Date(d).toISOString().split("T")[0]);
            } catch {
              // fallback remains current date
            }
          }

          const uniqueIocs = extractIocsFromText(fullText, "PDF Text");
          setExtractedIocs(uniqueIocs);
          toast.success("PDF parsed successfully", {
            description: "Auto-filled data from document contents.",
          });
        } catch (err) {
          console.error("PDF parsing failed:", err);
          toast.error("PDF parsing failed", { description: err.message });
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        setRawFileContent(text);
        try {
          const json = JSON.parse(text);
          const hits = json.hits?.hits || (Array.isArray(json) ? json : [json]);
          const firstHit = hits[0]?._source || hits[0];

          if (!firstHit) throw new Error("No hits");

          if (firstHit.rule?.description)
            setRuleDescription(firstHit.rule.description);
          if (firstHit["@timestamp"] || firstHit.timestamp) {
            setReportDate(
              new Date(firstHit["@timestamp"] || firstHit.timestamp)
                .toISOString()
                .split("T")[0],
            );
          }

          if (firstHit.agent?.labels?.tenant) {
            const tenantName = firstHit.agent.labels.tenant.toLowerCase();
            const t = tenants.find((t) => t.name.toLowerCase() === tenantName);
            if (t) {
              setSelectedTenantId(String(t.id));
              if (firstHit.agent?.name) {
                const agentName = firstHit.agent.name.toLowerCase();
                const a = t.agents?.find(
                  (a) => a.name.toLowerCase() === agentName,
                );
                if (a) setSelectedAgentId(String(a.id));
              }
            }
          }

          const iocs = [];
          hits.forEach((hit) => {
            const source = hit._source || hit;
            if (source.data?.srcip)
              iocs.push({
                type: "IPv4",
                value: source.data.srcip,
                source: "srcip",
                country: "NL",
                asn: "AS396982",
                status: "Malicious",
              });
            if (source.data?.url)
              iocs.push({
                type: "URL",
                value: source.data.url,
                source: "url",
                country: "-",
                asn: "-",
                status: "Malicious",
              });
            if (source.location)
              iocs.push({
                type: "File Path",
                value: source.location,
                source: "location",
                country: "-",
                asn: "-",
                status: "Malicious",
              });
          });

          const uniqueIocs = Array.from(new Set(iocs.map((a) => a.value))).map(
            (val) => iocs.find((a) => a.value === val),
          );
          setExtractedIocs(uniqueIocs);
        } catch {
          const uniqueIocs = extractIocsFromText(text, "Raw Text");
          setExtractedIocs(uniqueIocs);

          if (extractedTenantName) {
            const t = tenants.find(
              (t) =>
                t.name.toLowerCase().includes(extractedTenantName) ||
                extractedTenantName.includes(t.name.toLowerCase()),
            );
            if (t) {
              setSelectedTenantId(String(t.id));
              if (t.agents?.length > 0)
                setSelectedAgentId(String(t.agents[0].id));
            }
          }
        }
      };
      reader.readAsText(file);
    }
  };

  const handleExtraction = async (e) => {
    e.preventDefault();
    let targetIocs = extractedIocs;

    if (activeTab === "manual") {
      if (!manualText.trim()) {
        toast.error("Please enter log text or an incident report.");
        return;
      }
      targetIocs = extractIocsFromText(manualText, "Pasted Text");
    }

    const resolvedIocs = await resolveIocsWithGlobalDb(targetIocs);
    setExtractedIocs(resolvedIocs);

    setHasIngested(true);
    toast.success("Extraction complete", {
      description:
        "Review the indicators below before committing to the database.",
    });
  };

  const handleSaveToDatabase = async () => {
    setIsSaving(true);
    try {
      await createReportWithIoCs({
        title: reportTitle,
        reportDate: reportDate,
        tenantId: selectedTenantId,
        agentId: selectedAgentId,
        ruleDescription: ruleDescription,
        fileName: selectedFile ? selectedFile.name : null,
        fileType: selectedFile
          ? selectedFile.name.endsWith(".pdf")
            ? "application/pdf"
            : "text/plain"
          : "text/plain",
        rawContent: activeTab === "manual" ? manualText : rawFileContent,
        iocs: extractedIocs,
      });

      toast.success("Saved to Database", {
        description: `Report and ${extractedIocs.length} IoCs recorded successfully.`,
      });
      removeFile();
    } catch (err) {
      console.error("Supabase write error:", err);
      toast.error("Failed to save to database", { description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setManualText("");
    setRawFileContent("");
    setReportTitle("");
    setReportDate("");
    setSelectedTenantId("");
    setSelectedAgentId("");
    setRuleDescription("");
    setExtractedIocs([]);
    setHasIngested(false);
  };

  const selectedTenant = tenants.find(
    (t) => t.id.toString() === selectedTenantId,
  );
  const availableAgents = selectedTenant ? selectedTenant.agents || [] : [];

  return (
    <div className="max-w-4xl mx-auto w-full flex flex-col fade-in pb-12 overflow-x-hidden">
      <header className="mb-6 flex-shrink-0">
        <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">
          Data Ingestion
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Submit reports or raw logs for automated indicator extraction.
        </p>
      </header>

      <div className="shadcn-card p-6 flex flex-col mb-6">
        <form onSubmit={handleExtraction} className="flex flex-col">
          {/* COMMON TOP FIELDS */}
          <div className="flex-shrink-0 flex flex-col gap-5 mb-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Report Title
                </label>
                <input
                  type="text"
                  required
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  placeholder="e.g., Weekly Threat Report"
                  className="w-full shadcn-input px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Date of Report
                </label>
                <input
                  type="date"
                  required
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="w-full shadcn-input px-3 py-2 text-sm cursor-pointer text-slate-600"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tenant
                </label>
                <select
                  required
                  value={selectedTenantId}
                  onChange={(e) => {
                    setSelectedTenantId(e.target.value);
                    setSelectedAgentId("");
                  }}
                  className="w-full shadcn-input px-3 py-2 text-sm cursor-pointer text-slate-600"
                >
                  <option value="">-- Select Tenant --</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Agent
                </label>
                <select
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  disabled={!selectedTenantId}
                  className="w-full shadcn-input px-3 py-2 text-sm cursor-pointer text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {selectedTenantId
                      ? "-- Select Agent --"
                      : "Select Tenant First"}
                  </option>
                  {availableAgents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} {a.ip ? `(${a.ip})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Rule Description
              </label>
              <input
                type="text"
                required
                value={ruleDescription}
                onChange={(e) => setRuleDescription(e.target.value)}
                placeholder="e.g., Multiple web server 400 error codes"
                className="w-full shadcn-input px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* TAB SWITCHER */}
          <div className="flex gap-6 border-b border-slate-200 mb-4 flex-shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab("upload")}
              className={`text-sm font-semibold pb-2 border-b-2 transition-colors ${
                activeTab === "upload"
                  ? "text-slate-900 border-slate-900"
                  : "text-slate-500 hover:text-slate-700 border-transparent"
              }`}
            >
              Upload Report
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("manual")}
              className={`text-sm font-semibold pb-2 border-b-2 transition-colors ${
                activeTab === "manual"
                  ? "text-slate-900 border-slate-900"
                  : "text-slate-500 hover:text-slate-700 border-transparent"
              }`}
            >
              Paste Text
            </button>
          </div>

          {/* DYNAMIC CONTENT AREA */}
          <div className="flex flex-col relative mb-4">
            {activeTab === "manual" ? (
              <textarea
                required
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="Paste incident report, firewall logs, or SIEM alerts here..."
                className="w-full min-h-[200px] shadcn-input font-mono text-sm p-4 text-slate-600 bg-white resize-y"
              />
            ) : (
              <div className="flex flex-col">
                {!selectedFile ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragOver(true);
                    }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragOver(false);
                      if (e.dataTransfer.files.length)
                        processFile(e.dataTransfer.files[0]);
                    }}
                    className={`min-h-[200px] border-2 dashed rounded-xl flex flex-col items-center justify-center cursor-pointer p-8 transition-all overflow-hidden ${
                      isDragOver
                        ? "border-slate-800 bg-slate-100"
                        : "border-slate-300 bg-slate-50 hover:bg-slate-100"
                    }`}
                    style={{ borderStyle: "dashed" }}
                  >
                    <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-3">
                      <i className="fa-solid fa-file-arrow-up text-slate-500 text-xl"></i>
                    </div>
                    <p className="text-sm font-medium text-slate-900 text-center mb-1">
                      Drag & Drop or Click to Upload
                    </p>
                    <p className="text-xs text-slate-500 text-center">
                      Supports .pdf, .txt, .json
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.txt,.json"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files.length)
                          processFile(e.target.files[0]);
                      }}
                    />
                  </div>
                ) : (
                  <div className="border-2 border-green-500 bg-green-50 rounded-xl flex items-center justify-between p-6 transition-all">
                    <div className="flex items-center min-w-0">
                      <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mr-4 flex-shrink-0">
                        <i
                          className={`fa-solid ${selectedFile.name.endsWith(".pdf") ? "fa-file-pdf" : "fa-file-lines"} text-green-600 text-xl`}
                        ></i>
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-green-800 truncate">
                          {selectedFile.name}
                        </h4>
                        <p className="text-xs text-green-600 mt-0.5">
                          Ready for extraction
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeFile}
                      className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-green-100 text-green-600 hover:text-green-800 transition-colors flex-shrink-0 ml-4"
                      title="Remove file"
                    >
                      <i className="fa-solid fa-xmark text-lg"></i>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ACTION BUTTON */}
          <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-100 bg-white">
            <span className="text-[11px] text-slate-400 font-medium truncate mr-4">
              Extracts: IPv4, Hashes, URLs, Paths
            </span>
            <button
              type="submit"
              disabled={
                (!selectedFile && activeTab === "upload") ||
                (!manualText && activeTab === "manual")
              }
              className="bg-[#0f172a] hover:bg-[#1e293b] text-white disabled:opacity-50 disabled:cursor-not-allowed py-2 px-6 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm flex-shrink-0"
            >
              <i className="fa-solid fa-microchip"></i> Extract Indicators
            </button>
          </div>
        </form>
      </div>

      {hasIngested && (
        <div className="shadcn-card overflow-hidden fade-in mb-8">
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center gap-4">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-slate-900">
                Extracted Indicators (IoC/IoA)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {extractedIocs.length > 0
                  ? "Please review the extracted indicators before saving to the Global IoC database."
                  : "No specific IoCs found. You can still save the report to the database."}
              </p>
            </div>
            <div className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap flex-shrink-0">
              {extractedIocs.length} Found
            </div>
          </div>

          {extractedIocs.length > 0 && (
            <div className="max-h-[420px] overflow-y-auto overflow-x-hidden">
              <table className="w-full table-fixed text-left text-sm text-slate-600">
                <thead className="bg-white border-b border-slate-100 text-xs uppercase font-semibold text-slate-500 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 w-[95px]">Type</th>
                    <th className="px-4 py-3">Value</th>
                    <th className="px-4 py-3 w-[125px]">Context Source</th>
                    <th className="px-4 py-3 w-[85px]">Country</th>
                    <th className="px-4 py-3 w-[130px]">ASN</th>
                    <th className="px-4 py-3 w-[125px]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {extractedIocs.map((ioc, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-3 align-middle whitespace-nowrap">
                        <span
                          className={`inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded text-[11px] font-semibold border ${
                            ioc.type === "IPv4"
                              ? "bg-red-100 text-red-700 border-red-200"
                              : ioc.type === "URL"
                                ? "bg-blue-100 text-blue-700 border-blue-200"
                                : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          {ioc.type}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3 align-middle font-mono text-xs text-slate-900 truncate"
                        title={ioc.value}
                      >
                        {ioc.value}
                      </td>
                      <td
                        className="px-4 py-3 align-middle text-xs text-slate-400 font-mono truncate"
                        title={ioc.source}
                      >
                        {ioc.source}
                      </td>
                      <td
                        className="px-4 py-3 align-middle font-medium text-xs text-slate-700 truncate"
                        title={ioc.country || "-"}
                      >
                        {ioc.country || "-"}
                      </td>
                      <td
                        className="px-4 py-3 align-middle font-mono text-slate-500 text-xs truncate"
                        title={ioc.asn || "-"}
                      >
                        {ioc.asn || "-"}
                      </td>
                      <td className="px-4 py-3 align-middle whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${
                            ioc.status === "Malicious"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : ioc.status === "Suspicious"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-green-50 text-green-700 border-green-200"
                          }`}
                        >
                          <i
                            className={`fa-solid ${
                              ioc.status === "Malicious" ||
                              ioc.status === "Suspicious"
                                ? "fa-shield-virus"
                                : "fa-shield-check"
                            }`}
                          ></i>
                          {ioc.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                toast.info("Extraction rejected. Form cleared.");
                removeFile();
              }}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Reject & Clear
            </button>
            <button
              type="button"
              onClick={handleSaveToDatabase}
              disabled={isSaving}
              className="px-5 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i> Saving...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-check"></i> Accept & Save
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
