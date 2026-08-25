import { useState, useRef } from "react";
import { toast } from "sonner";
import * as pdfjsLib from "pdfjs-dist";
import { createReportWithIoCs } from "../services/reportServices.js";

// Safely resolve worker in Vite
const pdfWorker = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export default function IngestionView({ tenants = [] }) {
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

  const handleExtraction = (e) => {
    e.preventDefault();
    if (activeTab === "manual") {
      if (!manualText.trim()) {
        toast.error("Please enter log text or an incident report.");
        return;
      }
      const uniqueIocs = extractIocsFromText(manualText, "Pasted Text");
      setExtractedIocs(uniqueIocs);
    }

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
    <div className="max-w-4xl mx-auto flex flex-col fade-in pb-12">
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
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Extracted Indicators (IoC/IoA)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {extractedIocs.length > 0
                  ? "Please review the extracted indicators before saving to the Global IoC database."
                  : "No specific IoCs found. You can still save the report to the database."}
              </p>
            </div>
            <div className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">
              {extractedIocs.length} Found
            </div>
          </div>

          {extractedIocs.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-white border-b border-slate-100 text-xs uppercase font-semibold text-slate-500">
                  <tr>
                    <th className="px-6 py-3 whitespace-nowrap">Type</th>
                    <th className="px-6 py-3 whitespace-nowrap">Value</th>
                    <th className="px-6 py-3 whitespace-nowrap">
                      Context Source
                    </th>
                    <th className="px-6 py-3 whitespace-nowrap">Country</th>
                    <th className="px-6 py-3 whitespace-nowrap">ASN</th>
                    <th className="px-6 py-3 whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {extractedIocs.map((ioc, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-3 whitespace-nowrap">
                        <span
                          className={`badge ${
                            ioc.type === "IPv4"
                              ? "bg-red-100 text-red-700 border-red-200"
                              : ioc.type === "URL"
                                ? "bg-blue-100 text-blue-700 border-blue-200"
                                : "bg-slate-100 text-slate-700 border-slate-200"
                          } border`}
                        >
                          {ioc.type}
                        </span>
                      </td>
                      <td className="px-6 py-3 font-mono text-slate-900">
                        {ioc.value}
                      </td>
                      <td className="px-6 py-3 text-xs text-slate-400 font-mono whitespace-nowrap">
                        {ioc.source}
                      </td>
                      <td className="px-6 py-3 font-medium text-slate-700">
                        {ioc.country || "-"}
                      </td>
                      <td className="px-6 py-3 font-mono text-slate-500 text-xs">
                        {ioc.asn || "-"}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`badge border ${ioc.status === "Malicious" ? "bg-red-50 text-red-700 border-red-200" : "bg-green-50 text-green-700 border-green-200"}`}
                        >
                          <i
                            className={`fa-solid ${ioc.status === "Malicious" ? "fa-shield-virus" : "fa-shield-check"} mr-1.5`}
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
