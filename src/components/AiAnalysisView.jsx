import { useState } from 'react';
import { toast } from 'sonner';

export default function AiAnalysisView({ notes }) {
  const [selectedNoteId, setSelectedNoteId] = useState('');
  const [aiReport, setAiReport] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const extractIps = (text) => {
    const ipRegex = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g;
    const matches = text?.match(ipRegex) || [];
    return [...new Set(matches)];
  };

  const handleAiAnalysis = (e) => {
    e.preventDefault();
    if (!selectedNoteId) {
      toast.error('Please select a note first');
      return;
    }

    const note = notes.find(n => n.id.toString() === selectedNoteId);
    if (!note) {
      toast.error('Note not found');
      return;
    }

    setIsAnalyzing(true);
    setAiReport(null);
    
    // Simulate AI generation delay
    setTimeout(() => {
      const allIps = extractIps(note.content);
      const attackerIps = allIps.length > 0 ? [allIps[0]] : [];
      const destIps = allIps.length > 1 ? [allIps[1]] : [];
      const eventCount = note.content.split('\n').length; // Mock event count based on lines
      
      setAiReport({
        attackerIps,
        destIps,
        eventCount: eventCount > 100 ? 100 : eventCount // just a mock number
      });
      setIsAnalyzing(false);
      toast.success('AI Analysis complete.');
    }, 2500);
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col fade-in pb-12">
      <header className="mb-6 flex-shrink-0">
        <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">AI Analyst</h2>
        <p className="text-slate-500 text-sm mt-1">Leverage AI to automatically summarize logs, identify threats, and generate remediation steps from Analyst Notes.</p>
      </header>

      <div className="shadcn-card p-6 flex flex-col mb-8 overflow-visible">
        <form onSubmit={handleAiAnalysis} className="flex flex-col sm:flex-row items-start sm:items-end gap-4 relative">
          <div className="flex-1 w-full relative">
            <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Source Note</label>
            <select 
              required 
              value={selectedNoteId}
              onChange={(e) => setSelectedNoteId(e.target.value)}
              className="w-full shadcn-input px-3 py-2 text-sm cursor-pointer text-slate-700"
            >
              <option value="">-- Select a Note --</option>
              {notes.map(n => (
                <option key={n.id} value={n.id}>{n.title}</option>
              ))}
            </select>
            {notes.length === 0 && (
              <p className="text-xs text-amber-600 mt-1 absolute -bottom-5 left-0 whitespace-nowrap"><i className="fa-solid fa-triangle-exclamation mr-1"></i> No Analyst Notes found.</p>
            )}
          </div>
          
          <button 
            type="submit" 
            disabled={isAnalyzing || notes.length === 0} 
            className="bg-slate-900 hover:bg-black text-white disabled:opacity-50 disabled:cursor-not-allowed h-[38px] px-6 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm whitespace-nowrap"
          >
            {isAnalyzing ? (
              <><i className="fa-solid fa-circle-notch fa-spin"></i> Menganalisis...</>
            ) : (
              <><i className="fa-solid fa-robot"></i> Run AI Analysis</>
            )}
          </button>
        </form>
      </div>

      {isAnalyzing && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-800 fade-in">
          <i className="fa-solid fa-circle-notch fa-spin text-4xl mb-4"></i>
          <p className="font-medium animate-pulse">AI sedang membaca catatan dan menyusun laporan...</p>
        </div>
      )}

      {aiReport && !isAnalyzing && (
        <div className="shadcn-card p-8 fade-in mb-8 border-t-4 border-t-slate-900 relative overflow-hidden bg-white">
          <div className="absolute top-0 right-0 bg-slate-100 text-slate-600 text-[10px] font-bold px-3 py-1 rounded-bl-lg">
            DIBUAT OLEH AI
          </div>
          
          <div className="flex flex-col items-center text-center mb-10 pb-8 border-b border-slate-100">
            <img 
              src="/nexus-logo.png" 
              alt="" 
              className="h-9 w-auto object-contain mb-5 opacity-90" 
              onError={(e) => { e.target.style.display = 'none'; }} 
            />
            <h3 className="text-[22px] font-semibold text-slate-900 tracking-tight leading-none mb-2">Laporan Analisis Otomatis</h3>
            <p className="text-[11px] text-slate-400 uppercase tracking-[0.2em] font-medium">Nexus SOC Intelligence Engine</p>
          </div>
          
          <div className="space-y-10">
             {/* SECTION 1: KNOWLEDGE (5W + 1H) */}
             <section>
               <h4 className="font-bold text-slate-900 mb-4 text-lg border-l-4 border-slate-900 pl-3">I. Knowledge (Analisis 5W + 1H)</h4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                 <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                   <b className="text-slate-900 block mb-1">What (Apa yang terjadi?)</b>
                   <p className="text-slate-600">Terdeteksi adanya aktivitas pemindaian (scanning) atau eksploitasi berulang yang tidak wajar pada sistem.</p>
                 </div>
                 <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                   <b className="text-slate-900 block mb-1">Who (Siapa pelakunya?)</b>
                   <p className="text-slate-600">Alamat IP penyerang utama yang teridentifikasi adalah <span className="font-mono bg-slate-200 text-slate-800 px-1 rounded">{aiReport.attackerIps.length > 0 ? aiReport.attackerIps.join(', ') : 'Tidak diketahui'}</span>.</p>
                 </div>
                 <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                   <b className="text-slate-900 block mb-1">Where (Di mana targetnya?)</b>
                   <p className="text-slate-600">Serangan ini ditujukan pada aset internal perusahaan dengan IP <span className="font-mono bg-slate-200 text-slate-800 px-1 rounded">{aiReport.destIps.length > 0 ? aiReport.destIps.join(', ') : 'Tidak spesifik'}</span>.</p>
                 </div>
                 <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                   <b className="text-slate-900 block mb-1">When (Kapan terjadinya?)</b>
                   <p className="text-slate-600">Aktivitas ini tercatat secara masif dalam <b>{aiReport.eventCount} log events</b> yang terjadi secara berurutan dalam waktu singkat.</p>
                 </div>
                 <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                   <b className="text-slate-900 block mb-1">Why (Mengapa ini terjadi?)</b>
                   <p className="text-slate-600">Penyerang secara otomatis mencoba mencari kerentanan sistem, celah keamanan pada endpoint publik, atau melakukan teknik <i>brute-force</i>.</p>
                 </div>
                 <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                   <b className="text-slate-900 block mb-1">How (Bagaimana cara kerjanya?)</b>
                   <p className="text-slate-600">Penyerang mengirimkan <i>request</i> secara masif menggunakan <i>script</i> otomatis, yang dibuktikan dengan banyaknya kode error HTTP pada log.</p>
                 </div>
               </div>
             </section>
             
             {/* SECTION 2: ACTIONABLE REPORT */}
             <section>
               <h4 className="font-bold text-slate-900 mb-4 text-lg border-l-4 border-slate-900 pl-3">II. Actionable Report</h4>
               
               <div className="mb-6">
                 <h5 className="font-semibold text-slate-800 mb-2 text-sm uppercase tracking-wide">Ringkasan Eksekutif</h5>
                 <p className="text-sm text-slate-600 leading-relaxed bg-white border border-slate-200 p-4 rounded-lg">
                   Telah terjadi total <b>{aiReport.eventCount} aktivitas mencurigakan</b> dari IP penyerang yang mengarah ke target internal. Saat ini belum ditemukan indikasi kebocoran data yang berhasil <i>(data exfiltration)</i>, namun intensitas serangan memerlukan tindakan mitigasi segera untuk mencegah eskalasi insiden lebih lanjut.
                 </p>
               </div>

               <div>
                 <h5 className="font-semibold text-slate-800 mb-3 text-sm uppercase tracking-wide">Langkah Mitigasi (Remediation)</h5>
                 <ul className="space-y-3 text-sm">
                   <li className="flex items-start gap-3">
                     <div className="bg-slate-900 text-white w-6 h-6 rounded flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">1</div>
                     <div>
                       <b className="text-slate-900 block mb-0.5">Blokir IP Berbahaya</b>
                       <p className="text-slate-600">Segera masukkan IP <span className="font-mono text-xs bg-slate-100 px-1 rounded">{aiReport.attackerIps.length > 0 ? aiReport.attackerIps[0] : 'pelaku'}</span> ke dalam daftar blokir (Blacklist) pada <i>Firewall</i> utama atau WAF.</p>
                     </div>
                   </li>
                   <li className="flex items-start gap-3">
                     <div className="bg-slate-900 text-white w-6 h-6 rounded flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">2</div>
                     <div>
                       <b className="text-slate-900 block mb-0.5">Patch & Pembaruan Sistem</b>
                       <p className="text-slate-600">Pastikan layanan publik pada server target (<span className="font-mono text-xs bg-slate-100 px-1 rounded">{aiReport.destIps.length > 0 ? aiReport.destIps[0] : 'target'}</span>) menggunakan versi terbaru dan dikonfigurasi dengan prinsip hak akses terendah <i>(least privilege)</i>.</p>
                     </div>
                   </li>
                   <li className="flex items-start gap-3">
                     <div className="bg-slate-900 text-white w-6 h-6 rounded flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">3</div>
                     <div>
                       <b className="text-slate-900 block mb-0.5">Peningkatan Deteksi WAF</b>
                       <p className="text-slate-600">Sesuaikan aturan WAF untuk membatasi laju <i>(rate-limiting)</i> terhadap pemindai otomatis dan memblokir anomali kode status HTTP secara proaktif.</p>
                     </div>
                   </li>
                   <li className="flex items-start gap-3">
                     <div className="bg-slate-900 text-white w-6 h-6 rounded flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">4</div>
                     <div>
                       <b className="text-slate-900 block mb-0.5">Rotasi Kredensial</b>
                       <p className="text-slate-600">Jika ditemukan log <i>login</i> yang berhasil dari IP penyerang, segera paksa reset <i>password</i> dan lakukan rotasi token/kredensial terkait.</p>
                     </div>
                   </li>
                 </ul>
               </div>
             </section>
          </div>
        </div>
      )}
    </div>
  );
}
