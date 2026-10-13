import { useState } from 'react';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// n8n config
// ---------------------------------------------------------------------------
// Form di screenshot kamu = n8n "Form Trigger" (/form/...). Itu TIDAK bisa
// di-fetch() untuk dapat JSON (return-nya halaman HTML + Form Ending).
//
// Agar form di web ini "langsung trigger n8n", di n8n harus tambah:
//   Webhook Trigger (POST) sejajar dengan "Alert Intake Form"
//   → hubungkan ke node yang sama ("Parse & Validate Alert JSON")
//   → pastikan ada "Respond to Webhook" return { markdown: "..." }
//
//   Test:       http://localhost:5678/webhook-test/iris-report  (klik Execute dulu)
//   Production: http://localhost:5678/webhook/iris-report       (workflow Active)
const N8N_WEBHOOK_URL =
  import.meta.env.VITE_N8N_AI_WEBHOOK || 'http://localhost:5678/webhook/iris-report';

const FALLBACK_TENANTS = ['Petra', 'Wicida', 'SGU', 'IKMI Cirebon', 'Pradita'];

export default function AiAnalysisView({ notes = [], tenants = [] }) {
  const [nomorTiket, setNomorTiket] = useState('');
  const [tenant, setTenant] = useState('');
  const [irisCaseId, setIrisCaseId] = useState('');
  const [rawAlert, setRawAlert] = useState('');
  const [noteId, setNoteId] = useState('');

  const [markdown, setMarkdown] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [lastPayload, setLastPayload] = useState(null);

  const tenantOptions =
    tenants.length > 0 ? tenants.map((t) => (typeof t === 'string' ? t : t.name)) : FALLBACK_TENANTS;

  const extractMarkdown = (data) => {
    const payload = Array.isArray(data) ? data[0] : data;
    if (!payload) return '';
    if (typeof payload === 'string') return payload;
    return (
      payload.markdown ||
      payload.output ||
      payload.result ||
      payload.text ||
      payload.report ||
      payload.data ||
      payload.response ||
      ''
    );
  };

  const handleFillFromNote = (id) => {
    setNoteId(id);
    if (!id) return;
    const note = notes.find((n) => n.id.toString() === id);
    if (note) {
      setRawAlert(note.content);
      toast.info('Raw Alert diisi dari Analyst Note.');
    }
  };

  const handleValidateJson = () => {
    if (!rawAlert.trim()) {
      toast.error('Raw Alert JSON masih kosong.');
      return;
    }
    try {
      const parsed = JSON.parse(rawAlert);
      const info = Array.isArray(parsed)
        ? `${parsed.length} alert (array)`
        : parsed?.hits?.hits
          ? `${parsed.hits.hits.length} hits (OpenSearch)`
          : '1 alert (object)';
      toast.success(`JSON valid — ${info}.`);
    } catch (e) {
      toast.error('JSON tidak valid: ' + e.message);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      toast.success('Markdown disalin, siap paste ke deskripsi case IRIS.');
    } catch {
      toast.error('Gagal menyalin.');
    }
  };

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeCase = (irisCaseId || 'iris').replace(/[^a-zA-Z0-9-_#]/g, '');
    a.href = url;
    a.download = `iris-${safeCase}-report.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!irisCaseId.trim()) {
      toast.error('IRIS Case ID wajib diisi.');
      return;
    }
    if (!rawAlert.trim()) {
      toast.error('Raw Alert JSON wajib diisi.');
      return;
    }

    // Validasi JSON sebelum kirim ke n8n (node Parse akan gagal kalau invalid)
    let parsedAlert;
    try {
      parsedAlert = JSON.parse(rawAlert);
    } catch (err) {
      toast.error('Raw Alert bukan JSON valid: ' + err.message);
      return;
    }

    setIsLoading(true);
    setMarkdown('');
    setShowRaw(false);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 mnt (Local AI lama)

    // Key EXACT sesuai Form Trigger n8n (fieldName): reportNumber, Tenant,
    // irisId, "Raw Alert". Alias tambahan agar node Code tetap cocok.
    const payload = {
      source: 'NexusSOC-web',
      timestamp: new Date().toISOString(),
      reportNumber: nomorTiket.trim(),
      'Nomor Tiket IRIS': nomorTiket.trim(),
      nomor_tiket: nomorTiket.trim(),
      nomorTiket: nomorTiket.trim(),
      tiket: nomorTiket.trim(),
      Tenant: tenant,
      tenant: tenant,
      tenant_name: tenant,
      organisasi: tenant,
      irisId: irisCaseId.trim(),
      iris_case_id: irisCaseId.trim(),
      irisCaseId: irisCaseId.trim(),
      case_id: irisCaseId.trim(),
      'Raw Alert': rawAlert,
      raw_alert: rawAlert,
      rawAlert: rawAlert,
      alert: rawAlert,
      content: rawAlert,
      raw_alert_parsed: parsedAlert,
    };
    setLastPayload(payload);

    try {
      const res = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(`n8n HTTP ${res.status} ${t.slice(0, 200)}`);
      }

      const data = await res.json().catch(() => null);
      const md = extractMarkdown(data);

      if (!md) {
        console.warn('[n8n] tanpa markdown:', data);
        throw new Error('n8n tidak mengembalikan "markdown". Cek node "Respond to Webhook".');
      }

      setMarkdown(md);
      setLastPayload({ request: payload, response: data });
      toast.success('Laporan Markdown jadi.');
    } catch (err) {
      console.error('[n8n] gagal:', err);
      if (err?.name === 'AbortError') {
        toast.error('Timeout 3 menit. Pastikan workflow Execute/Active & Local AI jalan.');
      } else if (err instanceof TypeError) {
        toast.error('Gagal konek ke n8n :5678. Cek n8n jalan + CORS.');
      } else {
        toast.error(err.message);
      }
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto flex flex-col fade-in pb-12">
      {/* Form — mirip n8n Form */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8">
        <h2 className="text-xl font-semibold text-slate-900 text-center">Nexus : Job Destroyer</h2>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-1.5">
              Nomor Tiket IRIS (Opsional)
            </label>
            <input
              type="text"
              value={nomorTiket}
              onChange={(e) => setNomorTiket(e.target.value)}
              placeholder="Contoh: 30073 (cukup ketik nomornya saja, otomatis: ASOC-30073)"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-1.5">
              Tenant / Organisasi (Opsional)
            </label>
            <select
              value={tenant}
              onChange={(e) => setTenant(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
            >
              <option value="">Select an option ...</option>
              {tenantOptions.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-1.5">
              IRIS Case ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={irisCaseId}
              onChange={(e) => setIrisCaseId(e.target.value)}
              placeholder="Contoh: #123"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-semibold text-slate-900">
                Raw Alert JSON <span className="text-red-500">*</span>
              </label>
              {notes.length > 0 && (
                <select
                  value={noteId}
                  onChange={(e) => handleFillFromNote(e.target.value)}
                  title="Isi otomatis dari Analyst Notes"
                  className="text-xs border border-slate-200 rounded-md px-2 py-1 text-slate-600 bg-slate-50 cursor-pointer max-w-[200px]"
                >
                  <option value="">Dari Note...</option>
                  {notes.map((n) => (
                    <option key={n.id} value={n.id}>{n.title}</option>
                  ))}
                </select>
              )}
            </div>
            <textarea
              required
              value={rawAlert}
              onChange={(e) => setRawAlert(e.target.value)}
              rows={4}
              placeholder="Tempel satu alert, array alert, atau respons OpenSearch hits.hits di sini."
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-mono text-slate-700 placeholder:text-slate-400 placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 resize-y min-h-[110px]"
            />
            <button
              type="button"
              onClick={handleValidateJson}
              className="text-xs text-slate-500 hover:text-slate-900 mt-1.5 font-medium"
            >
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-200 dark:text-slate-900 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg py-3 text-sm transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <><i className="fa-solid fa-circle-notch fa-spin"></i> Membuat laporan (bisa 1–3 mnt)...</>
            ) : (
              'Buat Laporan Markdown'
            )}
          </button>
        </form>
      </div>

      {/* Hasil */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12 text-slate-600 fade-in">
          <i className="fa-solid fa-circle-notch fa-spin text-3xl mb-3"></i>
          <p className="text-sm font-medium animate-pulse">n8n sedang run: Red Sage → Local AI → Translate...</p>
        </div>
      )}

      {markdown && !isLoading && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 mt-6 fade-in">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="font-semibold text-slate-900">Laporan Markdown — siap paste ke IRIS</h3>
            <div className="flex gap-2">
              <button onClick={handleCopy} className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700">
                <i className="fa-solid fa-copy mr-1"></i> Salin
              </button>
              <button onClick={handleDownload} className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700">
                <i className="fa-solid fa-download mr-1"></i> .md
              </button>
            </div>
          </div>
          <div className="bg-slate-950 text-slate-100 p-5 rounded-lg text-[13px] leading-relaxed whitespace-pre-wrap font-mono max-h-[600px] overflow-auto">
            {markdown}
          </div>
          <button
            onClick={() => setShowRaw(!showRaw)}
            className="text-[11px] text-slate-400 hover:text-slate-700 mt-3 font-mono"
          >
            {showRaw ? 'sembunyikan debug' : 'lihat debug request/response'}
          </button>
          {showRaw && (
            <pre className="mt-2 text-[10px] bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-auto max-h-64 font-mono text-slate-600">
              {JSON.stringify(lastPayload, null, 2)?.slice(0, 4000)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
