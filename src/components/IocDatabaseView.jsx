import { useState, useMemo, useEffect, Fragment } from "react";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";
import ConfirmDialog from "./ConfirmDialog";

export default function IocDatabaseView({ setActiveView }) {
  const [dbData, setDbData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState("IPv4"); // 'IPv4', 'SHA256', 'URL'

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterHost, setFilterHost] = useState("");
  const [filterAlertType, setFilterAlertType] = useState("");
  const [filterOutcome, setFilterOutcome] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Expanded Row for Raw Summary Inspection
  const [expandedRowId, setExpandedRowId] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Selection & KQL
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [dqlMode, setDqlMode] = useState("include");
  const [generatedQuery, setGeneratedQuery] = useState("");

  // Inline Editing
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  // Confirm Dialog State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: null,
  });

  const closeConfirmModal = () => {
    setConfirmModal({
      isOpen: false,
      title: "",
      description: "",
      onConfirm: null,
    });
  };

  // Fetch all rows in 1,000-row batches to bypass Supabase's default 1,000-row limit
  const fetchIocs = async () => {
    setLoading(true);
    try {
      let allRows = [];
      let from = 0;
      const step = 1000;

      while (true) {
        const { data, error } = await supabase
          .from("global_iocs_view")
          .select("*")
          .order("seen_at", { ascending: false })
          .order("id", { ascending: true })
          .range(from, from + step - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;

        allRows = [...allRows, ...data];
        if (data.length < step) break;
        from += step;
      }

      setDbData(allRows);
    } catch (err) {
      toast.error("Failed to load threat events", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIocs();
  }, []);

  // Dynamic Filter Options from ip_intel_events
  const dynamicHosts = useMemo(() => {
    return Array.from(
      new Set(dbData.map((d) => d.target_host).filter((h) => h && h !== "N/A")),
    ).sort();
  }, [dbData]);

  const dynamicAlertTypes = useMemo(() => {
    return Array.from(
      new Set(dbData.map((d) => d.alert_type).filter(Boolean)),
    ).sort();
  }, [dbData]);

  const dynamicOutcomes = useMemo(() => {
    return Array.from(
      new Set(dbData.map((d) => d.outcome).filter(Boolean)),
    ).sort();
  }, [dbData]);

  const handleTabChange = (type) => {
    setActiveType(type);
    setCurrentPage(1);
    setSelectedIds(new Set());
    setEditingId(null);
    setExpandedRowId(null);
    setGeneratedQuery("");
  };

  // Filter Data
  const filteredData = useMemo(() => {
    return dbData
      .filter((item) => item.type === activeType)
      .filter((item) => {
        const q = searchQuery.toLowerCase();
        const matchSearch =
          !q ||
          (item.value || "").toLowerCase().includes(q) ||
          (item.target_host || "").toLowerCase().includes(q) ||
          (item.alert_type || "").toLowerCase().includes(q) ||
          (item.attack_subtype || "").toLowerCase().includes(q) ||
          (item.endpoint || "").toLowerCase().includes(q) ||
          (item.country || "").toLowerCase().includes(q) ||
          (item.asn || "").toLowerCase().includes(q) ||
          (item.raw_summary || "").toLowerCase().includes(q);

        const matchHost = !filterHost || item.target_host === filterHost;
        const matchAlert =
          !filterAlertType || item.alert_type === filterAlertType;
        const matchOutcome = !filterOutcome || item.outcome === filterOutcome;

        return matchSearch && matchHost && matchAlert && matchOutcome;
      });
  }, [
    dbData,
    activeType,
    searchQuery,
    filterHost,
    filterAlertType,
    filterOutcome,
  ]);

  // Paginate Data
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  // Selection Logic
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allPageIds = paginatedData.map((item) => item.id);
      setSelectedIds(new Set([...selectedIds, ...allPageIds]));
    } else {
      const newSelected = new Set(selectedIds);
      paginatedData.forEach((item) => newSelected.delete(item.id));
      setSelectedIds(newSelected);
    }
    setGeneratedQuery("");
  };

  const handleSelectOne = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
    setGeneratedQuery("");
  };

  const isAllSelected =
    paginatedData.length > 0 &&
    paginatedData.every((item) => selectedIds.has(item.id));

  // Inline Edit Logic
  const startEdit = (item) => {
    setEditingId(item.id);
    setEditForm({ ...item });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async () => {
    try {
      if (editForm.origin_table === "events") {
        const updatePayload =
          activeType === "URL"
            ? {
                endpoint: editForm.value,
                target_host: editForm.target_host,
                alert_type: editForm.alert_type,
                attack_subtype: editForm.attack_subtype,
                outcome: editForm.outcome,
              }
            : {
                target_host: editForm.target_host,
                alert_type: editForm.alert_type,
                attack_subtype: editForm.attack_subtype,
                endpoint: editForm.endpoint,
                outcome: editForm.outcome,
              };

        const { error } = await supabase
          .from("ip_intel_events")
          .update(updatePayload)
          .eq("id", editForm.event_id);

        if (error) throw error;
      } else {
        const rawId = editForm.id.replace("ioc-", "");
        const { error } = await supabase
          .from("extracted_iocs")
          .update({
            value: editForm.value.trim(),
            country: editForm.country || null,
            asn: editForm.asn || null,
            status: editForm.status || "Safe",
          })
          .eq("id", rawId);

        if (error) throw error;
      }

      await fetchIocs();
      setEditingId(null);
      setEditForm({});
      toast.success("Event record updated");
    } catch (err) {
      toast.error("Failed to update record", { description: err.message });
    }
  };

  // Delete Logic with Glassmorphic ConfirmDialog
  const handleDeleteItem = (item) => {
    setConfirmModal({
      isOpen: true,
      title: "DELETE EVENT RECORD",
      description: `Are you sure you want to delete this ${item.value} event (${item.alert_type})? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          if (item.origin_table === "events") {
            const { error } = await supabase
              .from("ip_intel_events")
              .delete()
              .eq("id", item.event_id);
            if (error) throw error;
          } else {
            const rawId = item.id.replace("ioc-", "");
            const { error } = await supabase
              .from("extracted_iocs")
              .delete()
              .eq("id", rawId);
            if (error) throw error;
          }

          setDbData((prev) =>
            prev.filter(
              (i) => i.id !== item.id && i.event_id !== item.event_id,
            ),
          );
          setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(item.id);
            return next;
          });
          toast.success("Event deleted");
        } catch (err) {
          toast.error("Failed to delete event", { description: err.message });
        } finally {
          closeConfirmModal();
        }
      },
    });
  };

  // Deduplicated Wazuh KQL Generator
  const handleGenerateKql = () => {
    if (selectedIds.size === 0) {
      toast.error("No events selected");
      return;
    }

    const selectedItems = dbData.filter((item) => selectedIds.has(item.id));
    const uniqueValues = Array.from(
      new Set(
        selectedItems.flatMap((item) =>
          item.value.split(",").map((v) => `"${v.trim()}"`),
        ),
      ),
    ).join(" OR ");

    let field = "data.srcip";
    if (activeType === "SHA256") field = "syscheck.sha256";
    if (activeType === "URL") field = "data.url";

    const query =
      dqlMode === "include"
        ? `${field}: (${uniqueValues})`
        : `NOT ${field}: (${uniqueValues})`;

    navigator.clipboard.writeText(query);
    setGeneratedQuery(query);
    toast.success("KQL copied to clipboard!");
  };

  const formatTimestamp = (ts) => {
    if (!ts) return "N/A";
    const d = new Date(ts);
    return d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getScoreBadge = (score) => {
    const num = Number(score) || 0;
    if (num >= 50) {
      return (
        <span className="inline-block whitespace-nowrap px-2 py-0.5 rounded text-xs font-bold bg-red-50 text-red-700 border border-red-200">
          {num}%
        </span>
      );
    }
    if (num > 0) {
      return (
        <span className="inline-block whitespace-nowrap px-2 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
          {num}%
        </span>
      );
    }
    return (
      <span className="inline-block whitespace-nowrap px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
        0%
      </span>
    );
  };

  const getStatusBadge = (status) => {
    if (status === "Malicious") {
      return (
        <span className="inline-block whitespace-nowrap px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 uppercase tracking-wider">
          Malicious
        </span>
      );
    }
    if (status === "Suspicious") {
      return (
        <span className="inline-block whitespace-nowrap px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 uppercase tracking-wider">
          Suspicious
        </span>
      );
    }
    return (
      <span className="inline-block whitespace-nowrap px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 uppercase tracking-wider">
        Safe
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto w-full h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden fade-in">
      {/* HEADER */}
      <header className="mb-4 flex-shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Global IoC & Threat Events
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Event-level intelligence from{" "}
            <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">
              ip_intel_events
            </code>{" "}
            enriched with reputation telemetry ({filteredData.length}{" "}
            {activeType} records shown).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`h-9 px-3 rounded-md border text-xs font-medium transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              showFilters
                ? "bg-slate-100 border-slate-300 text-slate-800"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <i className="fa-solid fa-filter text-[10px]"></i> Filters
          </button>
          <div className="relative w-full sm:w-72">
            <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
            <input
              type="text"
              placeholder="Search IP, host, endpoint, alert, summary..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="shadcn-input w-full pl-8 pr-3 py-2 text-sm bg-white"
            />
          </div>
        </div>
      </header>

      {/* FILTER BAR */}
      {showFilters && (
        <div className="flex-shrink-0 flex flex-col sm:flex-row gap-4 mb-4 p-4 bg-white border border-slate-200 rounded-lg shadow-xs fade-in">
          <div className="flex-1 min-w-0">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">
              Target Host
            </label>
            <select
              value={filterHost}
              onChange={(e) => {
                setFilterHost(e.target.value);
                setCurrentPage(1);
              }}
              className="shadcn-input px-3 py-2 text-sm w-full bg-white"
            >
              <option value="">All Target Hosts ({dynamicHosts.length})</option>
              {dynamicHosts.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-0">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">
              Alert Type
            </label>
            <select
              value={filterAlertType}
              onChange={(e) => {
                setFilterAlertType(e.target.value);
                setCurrentPage(1);
              }}
              className="shadcn-input px-3 py-2 text-sm w-full bg-white"
            >
              <option value="">
                All Alert Types ({dynamicAlertTypes.length})
              </option>
              {dynamicAlertTypes.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-0">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">
              Outcome
            </label>
            <select
              value={filterOutcome}
              onChange={(e) => {
                setFilterOutcome(e.target.value);
                setCurrentPage(1);
              }}
              className="shadcn-input px-3 py-2 text-sm w-full bg-white"
            >
              <option value="">All Outcomes ({dynamicOutcomes.length})</option>
              {dynamicOutcomes.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* KQL BUILDER BAR */}
      {selectedIds.size > 0 && (
        <div className="flex-shrink-0 bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 fade-in">
          <div className="flex items-center gap-3 text-slate-700 text-sm pl-2">
            <i className="fa-solid fa-layer-group text-slate-400"></i>
            <span>
              <span className="font-bold text-slate-900">
                {selectedIds.size}
              </span>{" "}
              events selected
            </span>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={dqlMode}
              onChange={(e) => setDqlMode(e.target.value)}
              className="shadcn-input px-3 py-2 text-sm bg-white"
            >
              <option value="include">Include (OR)</option>
              <option value="exclude">Exclude (NOT)</option>
            </select>
            <button
              onClick={handleGenerateKql}
              className="bg-slate-900 hover:bg-slate-800 text-white py-2 px-4 rounded-md text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="fa-solid fa-terminal text-xs"></i> Generate Wazuh
              KQL
            </button>
          </div>
        </div>
      )}

      {generatedQuery && (
        <div className="flex-shrink-0 mb-4 fade-in relative">
          <textarea
            readOnly
            value={generatedQuery}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs font-mono text-slate-800 resize-none outline-none"
            rows="2"
          />
        </div>
      )}

      {/* TABS */}
      <div className="flex-shrink-0 flex justify-between items-end border-b border-slate-200 mb-4">
        <div className="flex gap-6 overflow-x-auto">
          {[
            { id: "IPv4", label: "IP Events", icon: "fa-network-wired" },
            { id: "SHA256", label: "File Hashes", icon: "fa-hashtag" },
            { id: "URL", label: "URLs", icon: "fa-link" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`text-sm font-semibold pb-3 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeType === tab.id
                  ? "text-slate-900 border-slate-900"
                  : "text-slate-500 hover:text-slate-700 border-transparent"
              }`}
            >
              <i className={`fa-solid ${tab.icon} text-xs`}></i>
              {tab.label}
              <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-slate-100 text-slate-600">
                {dbData.filter((d) => d.type === tab.id).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* LOCKED CONTAINER FOR EVENT-LEVEL DATA TABLE */}
      <div className="shadcn-card flex-1 min-h-0 flex flex-col overflow-hidden mb-2">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full table-fixed min-w-[1050px] text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase font-semibold text-slate-500 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 w-11">
                  <input
                    type="checkbox"
                    className="cursor-pointer"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="px-4 py-3 w-[190px]">
                  {activeType === "URL"
                    ? "Targeted Endpoint & Seen At"
                    : "Indicator & Seen At"}
                </th>
                <th className="px-4 py-3 w-[200px]">Target Host</th>
                <th className="px-4 py-3 w-[220px]">Alert & Attack Subtype</th>
                <th className="px-4 py-3 w-[210px]">
                  {activeType === "URL"
                    ? "Source IP & Outcome"
                    : "Endpoint & Outcome"}
                </th>
                {activeType === "IPv4" && (
                  <>
                    <th className="px-4 py-3 w-[150px]">Country & ASN</th>
                    <th className="px-4 py-3 w-[80px] text-center">Score</th>
                  </>
                )}
                <th className="px-4 py-3 w-[100px]">Status</th>
                <th className="px-4 py-3 w-[85px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td
                    colSpan={activeType === "IPv4" ? 9 : 7}
                    className="px-6 py-12 text-center text-slate-400"
                  >
                    Loading ip_intel_events from database...
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={activeType === "IPv4" ? 9 : 7}
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    No matching threat events found.
                  </td>
                </tr>
              ) : (
                paginatedData.map((item) => {
                  const isEditing = editingId === item.id;
                  const isExpanded = expandedRowId === item.id;
                  const mitreList = item.mitre || [];

                  return (
                    <Fragment key={item.id}>
                      <tr className="group hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 align-middle">
                          <input
                            type="checkbox"
                            className="cursor-pointer"
                            checked={selectedIds.has(item.id)}
                            onChange={() => handleSelectOne(item.id)}
                          />
                        </td>

                        {/* Indicator & Timestamp */}
                        <td className="px-4 py-3 align-middle overflow-hidden">
                          <div
                            className="font-mono font-medium text-slate-900 text-xs truncate"
                            title={item.value}
                          >
                            {item.value}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 whitespace-nowrap">
                            {formatTimestamp(item.seen_at)}
                          </div>
                        </td>

                        {/* Target Host (Single-Line Unbroken Pill) */}
                        <td className="px-4 py-3 align-middle overflow-hidden">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editForm.target_host || ""}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  target_host: e.target.value,
                                })
                              }
                              className="shadcn-input px-2 py-1 text-xs w-full"
                            />
                          ) : (
                            <span
                              className="inline-block max-w-full truncate whitespace-nowrap px-2.5 py-0.5 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 align-middle"
                              title={item.target_host}
                            >
                              {item.target_host}
                            </span>
                          )}
                        </td>

                        {/* Alert Type, Attack Subtype & MITRE */}
                        <td className="px-4 py-3 align-middle overflow-hidden">
                          {isEditing ? (
                            <div className="flex flex-col gap-1">
                              <input
                                type="text"
                                value={editForm.alert_type || ""}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    alert_type: e.target.value,
                                  })
                                }
                                className="shadcn-input px-2 py-1 text-xs w-full"
                                placeholder="Alert Type"
                              />
                              <input
                                type="text"
                                value={editForm.attack_subtype || ""}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    attack_subtype: e.target.value,
                                  })
                                }
                                className="shadcn-input px-2 py-1 text-xs w-full"
                                placeholder="Attack Subtype"
                              />
                            </div>
                          ) : (
                            <>
                              <div
                                className="text-xs font-medium text-slate-800 truncate"
                                title={item.alert_type}
                              >
                                {item.alert_type}
                              </div>
                              <div className="flex flex-wrap items-center gap-1 mt-1">
                                {item.attack_subtype &&
                                  item.attack_subtype !== "N/A" && (
                                    <span
                                      className="inline-block max-w-full truncate whitespace-nowrap px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200"
                                      title={item.attack_subtype}
                                    >
                                      {item.attack_subtype}
                                    </span>
                                  )}
                                {mitreList.map((m) => (
                                  <span
                                    key={m}
                                    className="inline-block whitespace-nowrap px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-800 text-white"
                                  >
                                    {m}
                                  </span>
                                ))}
                              </div>
                            </>
                          )}
                        </td>

                        {/* Endpoint / Source IP & Outcome */}
                        <td className="px-4 py-3 align-middle overflow-hidden">
                          {isEditing ? (
                            <div className="flex flex-col gap-1">
                              <input
                                type="text"
                                value={editForm.endpoint || ""}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    endpoint: e.target.value,
                                  })
                                }
                                className="shadcn-input px-2 py-1 text-xs font-mono w-full"
                                placeholder="Endpoint"
                              />
                              <input
                                type="text"
                                value={editForm.outcome || ""}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    outcome: e.target.value,
                                  })
                                }
                                className="shadcn-input px-2 py-1 text-xs w-full"
                                placeholder="Outcome"
                              />
                            </div>
                          ) : (
                            <>
                              <div
                                className="text-xs font-mono text-slate-700 truncate"
                                title={item.endpoint}
                              >
                                {item.endpoint}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="inline-block whitespace-nowrap text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                  {item.outcome}
                                </span>
                                {item.raw_summary && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedRowId(
                                        isExpanded ? null : item.id,
                                      )
                                    }
                                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium underline cursor-pointer whitespace-nowrap"
                                  >
                                    {isExpanded ? "Hide Log" : "View Log"}
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </td>

                        {activeType === "IPv4" && (
                          <>
                            {/* Country & ASN */}
                            <td className="px-4 py-3 align-middle overflow-hidden">
                              <div
                                className="text-xs font-medium text-slate-800 truncate"
                                title={item.country}
                              >
                                {item.country}
                              </div>
                              <div
                                className="text-[11px] font-mono text-slate-400 truncate"
                                title={item.asn}
                              >
                                {item.asn}
                              </div>
                            </td>

                            {/* Abuse Score */}
                            <td className="px-4 py-3 align-middle text-center whitespace-nowrap">
                              {getScoreBadge(item.abuse_score)}
                            </td>
                          </>
                        )}

                        {/* Status */}
                        <td className="px-4 py-3 align-middle whitespace-nowrap">
                          {getStatusBadge(item.status)}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 align-middle text-right whitespace-nowrap">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={saveEdit}
                                className="w-7 h-7 rounded text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                                title="Save"
                              >
                                <i className="fa-solid fa-check text-xs"></i>
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="w-7 h-7 rounded text-red-600 hover:bg-red-50 cursor-pointer"
                                title="Cancel"
                              >
                                <i className="fa-solid fa-xmark text-xs"></i>
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => startEdit(item)}
                                className="w-7 h-7 rounded text-slate-400 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                                title="Edit Event"
                              >
                                <i className="fa-solid fa-pen text-xs"></i>
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item)}
                                className="w-7 h-7 rounded text-slate-400 hover:text-red-600 hover:bg-slate-100 cursor-pointer"
                                title="Delete Event"
                              >
                                <i className="fa-solid fa-trash text-xs"></i>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>

                      {/* Expandable Raw Summary Row */}
                      {isExpanded && item.raw_summary && (
                        <tr className="bg-slate-50/90 border-b border-slate-200">
                          <td
                            colSpan={activeType === "IPv4" ? 9 : 7}
                            className="px-6 py-3"
                          >
                            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                              Raw Event Summary
                            </div>
                            <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap break-all bg-white p-3 rounded-lg border border-slate-200 max-h-40 overflow-y-auto">
                              {item.raw_summary}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION FOOTER (LOCKED AT BOTTOM OF CARD) */}
        <div className="flex-shrink-0 bg-slate-50 border-t border-slate-200 px-4 py-3 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Showing{" "}
            {filteredData.length === 0
              ? 0
              : (currentPage - 1) * itemsPerPage + 1}{" "}
            to {Math.min(currentPage * itemsPerPage, filteredData.length)} of{" "}
            {filteredData.length} events
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="w-8 h-8 flex items-center justify-center rounded border border-slate-200 bg-white text-slate-600 disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
            >
              <i className="fa-solid fa-chevron-left text-xs"></i>
            </button>
            <span className="text-xs font-medium text-slate-700 px-3 whitespace-nowrap">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="w-8 h-8 flex items-center justify-center rounded border border-slate-200 bg-white text-slate-600 disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
            >
              <i className="fa-solid fa-chevron-right text-xs"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Glassmorphic Confirmation Modal */}
      <ConfirmDialog
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        description={confirmModal.description}
        onConfirm={confirmModal.onConfirm}
        onClose={closeConfirmModal}
      />
    </div>
  );
}
