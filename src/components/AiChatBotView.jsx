import { useState, useRef, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({ breaks: true, gfm: true });

// n8n Chat Trigger (workflow V3).
// Bisa dioverride via .env: VITE_N8N_CHAT_URL=http://localhost:5678/webhook/<id>/chat
const N8N_CHAT_URL =
  import.meta.env.VITE_N8N_CHAT_URL ||
  'http://localhost:5678/webhook/62364e61-c6d3-4982-bcd4-b710c4196313/chat';

const getChatSessionId = () => {
  let sid = localStorage.getItem('nexus_chat_session');
  if (!sid) {
    sid = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
    localStorage.setItem('nexus_chat_session', sid);
  }
  return sid;
};

// Agent kadang mengembalikan output kosong ("") tapi hasil tool ada di
// intermediateSteps (kasus: model reasoning / konteks penuh). Formatkan
// observasi tool terakhir jadi ringkasan markdown agar chat tetap berguna.
const formatToolObservationFallback = (data) => {
  const steps = data?.intermediateSteps;
  if (!Array.isArray(steps) || !steps.length) return '';
  for (let i = steps.length - 1; i >= 0; i--) {
    const obs = steps[i]?.observation;
    if (obs == null || obs === '') continue;
    try {
      const parsed = typeof obs === 'string' ? JSON.parse(obs) : obs;
      const root = Array.isArray(parsed) ? parsed[0] : parsed;
      const groups = root?.groups;
      if (!Array.isArray(groups) || !groups.length) continue;
      const total = root.total ?? groups.reduce((a, g) => a + (g.count || 1), 0);
      const uniq = root.groups_count ?? groups.length;
      let md = `🔍 Triase Alert Wazuh (24 Jam Terakhir)\n\nDitemukan ${total} alert, telah di-Dedup (kelompok ancaman unik = ${uniq}).\n\n`;
      md += `| Rule ID | Deskripsi Ancaman | IP Serangan | Target Agent | Count | Severity |\n`;
      md += `|---------|-------------------|-------------|--------------|-------|----------|\n`;
      for (const g of groups) {
        const desc = String(g.rule || '-').replace(/\|/g, '/');
        md += `| **${g.rule_id || '-'}** | ${desc} | \`${g.srcip || '-'}\` | \`${g.agent || '-'} (${g.agent_ip || '-'})\` | ${g.count ?? 1} | Level ${g.level ?? '-'} |\n`;
      }
      return md;
    } catch {
      // observation bukan JSON dedup -> coba step sebelumnya
    }
  }
  return '';
};

const parseChatOutput = (data) => {
  if (!data) return '';
  if (typeof data === 'string') return data;
  const d = Array.isArray(data) ? data[0] : data;
  if (!d) return '';
  if (typeof d === 'string') return d;
  const out = d.output || d.text || d.message || d.reply || d.response;
  if (out && String(out).trim()) return out;
  if (!out) console.warn('[n8n chat] output kosong, pakai fallback intermediateSteps');
  return formatToolObservationFallback(d) || JSON.stringify(d);
};

// Ollama (auto-detect daftar model). Override via .env: VITE_OLLAMA_URL=...
const OLLAMA_URL =
  import.meta.env.VITE_OLLAMA_URL || 'http://192.168.30.178:11434';

// 5 model kanonis yang didukung. `full` adalah nama fallback kalau Ollama
// tidak terjangkau; saat Ollama terdeteksi, `full` diganti nama persis dari /api/tags.
const TARGET_MODEL_DEFS = [
  { key: 'qwen2.5', label: 'qwen2.5', full: 'qwen2.5:14b' },
  { key: 'foundation-sec', label: 'Foundation-Sec-8B', full: 'Foundation-Sec-8B-Reasoning-Q4_K_M-GGUF' },
  { key: 'redsage', label: 'RedSage-Qwen3-8B', full: 'RedSage-Qwen3-8B-DPO-GGUF' },
  { key: 'qwen3.5', label: 'qwen3.5', full: 'qwen3.5:9b' },
  { key: 'deepseek-r1', label: 'deepseek-r1', full: 'deepseek-r1:8b' },
];

// Migrasi key lama -> key kanonis baru (agar localStorage lama tidak rusak).
const migrateModelKey = (key) => {
  if (!key) return key;
  const k = String(key).toLowerCase();
  if (k === 'qwen') return 'qwen3.5';
  if (k === 'qwen2') return 'qwen2.5';
  if (k === 'sec') return 'foundation-sec';
  if (k === 'deepseek') return 'deepseek-r1';
  const hit = TARGET_MODEL_DEFS.find((d) => d.key === k);
  return hit ? hit.key : key;
};

// Normalisasi nama model Ollama agar pencocokan tahan terhadap varian:
// "RedSage-Qwen3-8B-DPO-GGUF:latest", "foundation_sec_8b...", "qwen3:8b", dll.
const normalizeOllamaName = (name) =>
  String(name || '').toLowerCase().replace(/[_]+/g, '-').replace(/\s+/g, '-');

// Mapping 1 nama Ollama -> 1 key kanonis (dari 5 model di atas).
// Urutan penting: redsage dicek dulu karena namanya juga mengandung "qwen3".
const mapOllamaNameToKey = (name) => {
  const n = normalizeOllamaName(name);
  if (!n) return null;
  if (n.includes('redsage')) return 'redsage';
  if (n.includes('foundation-sec') || n.includes('foundationsec') || n.includes('sec-8b')) return 'foundation-sec';
  if (n.includes('deepseek')) return 'deepseek-r1';
  if (n.includes('qwen2.5') || n.includes('qwen2-5')) return 'qwen2.5';
  if (n.includes('qwen3.5') || n.includes('qwen3-5')) return 'qwen3.5';
  // qwen3 polos (mis. "qwen3:8b", "qwen3-8b-gguf") dianggap varian qwen3.5
  if (n.includes('qwen3')) return 'qwen3.5';
  // "qwen" polos tanpa versi -> default ke qwen3.5
  if (/(^|[^a-z0-9])qwen([^a-z0-9]|$)/.test(n)) return 'qwen3.5';
  return null; // tak dikenal -> ditangani caller sebagai model ekstra
};

const shortOllamaLabel = (name) => {
  const noRegistry = name.includes('/') ? name.slice(name.lastIndexOf('/') + 1) : name;
  return noRegistry.includes(':') ? noRegistry.slice(0, noRegistry.indexOf(':')) : noRegistry;
};

const ChatMessageItem = ({ msg }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const MAX_LENGTH = 600;
  const isUser = msg.role === 'user';
  const isLong = (msg.content || '').length > MAX_LENGTH;

  // Bersihkan reasoning mentah model reasoning (deepseek-r1 / Foundation-Sec)
  // agar tidak tampil sebagai teks mentah di chat.
  const cleanContent = useMemo(() => {
    let t = msg.content || '';
    t = t.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    t = t.replace(/<\/?think>/gi, '').trim();
    return t;
  }, [msg.content]);

  // Render markdown -> HTML (hanya untuk assistant), di-sanitize biar aman dari XSS.
  const assistantHtml = useMemo(() => {
    if (isUser) return null;
    try {
      return DOMPurify.sanitize(marked.parse(cleanContent || ''));
    } catch {
      return null;
    }
  }, [cleanContent, isUser]);

  if (isUser) {
    const displayText = (!isExpanded && isLong) ? msg.content.slice(0, MAX_LENGTH) + '...' : msg.content;
    return (
      <div className="fade-in self-end max-w-[85%] md:max-w-[75%] ml-auto">
        <div className="bg-[#f0f4f9] text-[#1f1f1f] rounded-[24px] rounded-br-[8px] px-5 py-3 text-[15px] leading-relaxed break-words shadow-sm">
          <div className="whitespace-pre-wrap">{displayText}</div>
          {isLong && (
            <button onClick={() => setIsExpanded(!isExpanded)} className="text-[#0b57d0] hover:underline font-medium text-[13px] mt-2 block">
              {isExpanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 fade-in self-start w-full max-w-[95%] md:max-w-[90%] mr-auto">
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-transparent text-[#0b57d0] mt-auto mb-1">
        <i className="fa-solid fa-sparkles text-[16px]"></i>
      </div>
      <div className="bg-[#e8f0fe] text-[#1f1f1f] rounded-[24px] rounded-bl-[8px] px-5 py-3 text-[15px] leading-relaxed break-words shadow-sm min-w-0 flex-1 overflow-x-auto">
        <div
          className={`markdown-body ${!isExpanded && isLong ? 'max-h-[320px] overflow-hidden relative' : ''}`}
          dangerouslySetInnerHTML={{ __html: assistantHtml || '' }}
        />
        {!isExpanded && isLong && (
          <div className="h-8 -mt-8 bg-gradient-to-t from-[#e8f0fe] to-transparent pointer-events-none" />
        )}
        {isLong && (
          <button onClick={() => setIsExpanded(!isExpanded)} className="text-[#0b57d0] hover:underline font-medium text-[13px] mt-2 block">
            {isExpanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>
    </div>
  );
};

export default function AiChatBotView() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showHistory, setShowHistory] = useState(window.innerWidth > 1024);
  const [chatModels, setChatModels] = useState(() =>
    TARGET_MODEL_DEFS.map((d) => ({ ...d, available: false }))
  );
  const [activeModelKey, setActiveModelKey] = useState(
    () => migrateModelKey(localStorage.getItem('nexus_chat_model')) || 'qwen3.5'
  );
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [ollamaOnline, setOllamaOnline] = useState(false);
  const textareaRef = useRef(null);
  const scrollRef = useRef(null);

  // Auto-detect model dari Ollama (/api/tags) lalu mapping ke 5 model kanonis.
  // Gagal (CORS/offline) -> tetap tampilkan 5 model fallback (available: false).
  useEffect(() => {
    let cancelled = false;
    const loadModels = async () => {
      setModelsLoading(true);
      try {
        const res = await fetch(`${OLLAMA_URL}/api/tags`);
        if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
        const data = await res.json();
        const names = (data.models || []).map((m) => m.name || m.model).filter(Boolean);
        if (!names.length) throw new Error('Ollama tidak punya model');

        // Petakan setiap nama Ollama ke key kanonis. Satu key satu entri
        // (ambil nama persis pertama yang cocok sebagai `full`).
        const foundByKey = {};
        const extras = [];
        for (const name of names) {
          const key = mapOllamaNameToKey(name);
          if (key && !foundByKey[key]) {
            foundByKey[key] = name;
          } else if (!key && !extras.some((m) => m.full === name)) {
            extras.push({
              key: name, // model tak dikenal: pakai nama penuh sebagai key
              label: shortOllamaLabel(name),
              full: name,
              available: true,
            });
          }
        }

        const mapped = TARGET_MODEL_DEFS.map((def) => ({
          ...def,
          full: foundByKey[def.key] || def.full,
          available: Boolean(foundByKey[def.key]),
        }));
        // Model tak dikenal di Ollama tetap ditampilkan di bawah 5 model utama.
        mapped.push(...extras);

        if (cancelled) return;
        setChatModels(mapped);
        setOllamaOnline(true);
        const saved = migrateModelKey(localStorage.getItem('nexus_chat_model'));
        if (!saved || !mapped.some((m) => m.key === saved)) {
          const fallback = mapped.some((m) => m.key === 'qwen3.5') ? 'qwen3.5' : mapped[0].key;
          setActiveModelKey(fallback);
          localStorage.setItem('nexus_chat_model', fallback);
        } else if (saved !== localStorage.getItem('nexus_chat_model')) {
          localStorage.setItem('nexus_chat_model', saved);
          setActiveModelKey(saved);
        }
      } catch (err) {
        console.warn('[ollama] pakai daftar model fallback:', err.message);
        if (!cancelled) setOllamaOnline(false);
      } finally {
        if (!cancelled) setModelsLoading(false);
      }
    };
    loadModels();
    return () => { cancelled = true; };
  }, []);

  const activeModel = chatModels.find((m) => m.key === activeModelKey) || chatModels[0];

  const handleSelectModel = (key) => {
    setActiveModelKey(key);
    localStorage.setItem('nexus_chat_model', key);
    setModelMenuOpen(false);
  };

  const pastChats = [
    { id: 1, title: 'Analisis Log IP 192.168.1.50' },
    { id: 2, title: 'Ringkasan eksekutif ransomware' },
    { id: 3, title: 'Investigasi anomali traffic SSH' },
    { id: 4, title: 'Cara mitigasi DDoS layer 7' },
  ];

  const dummyChatHistory = {
    1: [
      { role: 'user', content: 'Tolong analisa log dari IP 192.168.1.50' },
      { role: 'assistant', content: 'Berdasarkan log yang ada, IP 192.168.1.50 melakukan port scanning ke berbagai port internal (terutama 22, 80, 443, dan 3389). Direkomendasikan untuk segera melakukan isolasi IP tersebut dari jaringan internal.' }
    ],
    2: [
      { role: 'user', content: 'Buatkan ringkasan eksekutif ransomware' },
      { role: 'assistant', content: 'Insiden Ransomware "DarkLock":\n\n- Vektor Serangan: Phishing email ke divisi HR.\n- Dampak: 3 server file terenkripsi.\n- Status Saat Ini: Jaringan telah diisolasi dan proses pemulihan dari backup sedang berjalan.\n- Rekomendasi: Wajibkan MFA untuk seluruh akses VPN.' }
    ],
    3: [
      { role: 'user', content: 'Ada anomali traffic SSH dari luar, tolong investigasi' },
      { role: 'assistant', content: 'Terdeteksi lebih dari 500 percobaan login SSH gagal dalam 10 menit terakhir, berasal dari IP 104.23.11.x. Ini merupakan pola serangan Brute Force. Saya telah secara otomatis menambahkan IP tersebut ke daftar blokir firewall.' }
    ],
    4: [
      { role: 'user', content: 'Cara mitigasi DDoS layer 7' },
      { role: 'assistant', content: 'Untuk mitigasi DDoS Layer 7 (Application Layer), Anda bisa menerapkan langkah berikut:\n\n1. Menggunakan WAF (Web Application Firewall).\n2. Rate Limiting pada endpoint yang rentan (seperti /login).\n3. Terapkan CAPTCHA jika terdeteksi traffic anomali.\n4. Konfigurasi aturan blokir geo-lokasi jika serangan berasal dari negara tak dikenal.' }
    ],
  };

  const handleLoadHistory = (chatId) => {
    setMessages(dummyChatHistory[chatId] || []);
    if (window.innerWidth < 768) {
      setShowHistory(false);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleInput = (e) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollH = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollH, 200)}px`;
      textareaRef.current.style.overflowY = scrollH > 200 ? 'auto' : 'hidden';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = '44px';
      textareaRef.current.style.overflowY = 'hidden';
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 600000);

    try {
      const res = await fetch(N8N_CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sendMessage',
          sessionId: getChatSessionId(),
          chatInput: `[model:${activeModelKey}] ${userMessage.content}`,
          model: activeModel?.full || activeModelKey,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(`n8n HTTP ${res.status} ${t.slice(0, 200)}`);
      }

      const data = await res.json().catch(() => null);
      const out = parseChatOutput(data);

      if (!out) {
        console.warn('[n8n chat] response tanpa output:', data);
        throw new Error('n8n tidak mengembalikan output. Cek workflow chat.');
      }

      setMessages(prev => [...prev, { role: 'assistant', content: out }]);
    } catch (err) {
      console.error('[n8n chat] gagal:', err);
      if (err?.name === 'AbortError') {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Request timeout (3 menit). Model/LLM di n8n mungkin masih proses atau mati. Coba lagi.',
        }]);
      } else if (err instanceof TypeError) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Gagal menghubungi n8n di :5678. Pastikan n8n jalan dan workflow chat sudah Active (production) atau Listen (test).',
        }]);
        toast.error('Gagal konek ke n8n chat.');
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}` }]);
      }
    } finally {
      clearTimeout(timeoutId);
      setIsTyping(false);
    }
  };

  const renderInputForm = (isCentered = false) => (
    <form onSubmit={handleSend} className={`relative w-full ${isCentered ? 'max-w-3xl mx-auto' : 'max-w-3xl mx-auto'} bg-[#f0f4f9] rounded-[32px] flex items-end p-2 pl-4 transition-all focus-within:bg-white focus-within:shadow-[0_2px_6px_rgba(0,0,0,0.1)] focus-within:border focus-within:border-[#e3e3e3]`}>
      <button type="button" className="w-8 h-8 shrink-0 mr-2 mb-1.5 flex items-center justify-center rounded-full text-[#444746] hover:bg-black/5 transition-colors">
        <i className="fa-solid fa-plus text-[16px]"></i>
      </button>
      <textarea
        ref={textareaRef}
        rows="1"
        placeholder="Ketik pesan di sini..."
        value={input}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        className="flex-1 py-2.5 text-[16px] text-[#1f1f1f] bg-transparent focus:outline-none resize-none overflow-hidden max-h-[200px] placeholder-[#444746] dark:placeholder-slate-400"
        style={{ height: '44px' }}
      />
      <div className="flex items-center gap-1 mb-1 ml-2 mr-1 relative">
        <div className="relative">
          <button
            type="button"
            onClick={() => setModelMenuOpen((v) => !v)}
            title={modelsLoading ? 'Memuat model dari Ollama...' : `Model: ${activeModel?.full || activeModelKey} (klik untuk ganti)`}
            className="shrink-0 flex items-center gap-1.5 px-3 h-10 rounded-full text-[#444746] hover:bg-black/5 transition-colors text-[14px] font-medium max-w-[150px]"
          >
            <span className="truncate">{modelsLoading ? '...' : (activeModel?.label || activeModelKey)}</span>
            <i className={`fa-solid fa-chevron-down text-[11px] transition-transform ${modelMenuOpen ? 'rotate-180' : ''}`}></i>
          </button>
          {modelMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setModelMenuOpen(false)} />
              <div className="absolute bottom-12 right-0 z-50 w-72 max-h-80 overflow-y-auto bg-white border border-[#e3e3e3] rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.15)] p-1.5 custom-scrollbar">
                <div className="px-3 py-2 text-[11px] font-medium text-[#444746] uppercase tracking-wide flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${ollamaOnline ? 'bg-green-500' : 'bg-amber-500'}`} title={ollamaOnline ? 'Ollama online' : 'Ollama offline (fallback)'} />
                  {modelsLoading ? 'Memuat dari Ollama...' : ollamaOnline ? `Ollama: ${chatModels.length} model` : 'Ollama offline — fallback'}
                </div>
                {chatModels.map((m) => (
                  <button
                    key={m.key + m.full}
                    type="button"
                    onClick={() => handleSelectModel(m.key)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-[14px] transition-colors flex items-center gap-2 ${
                      m.key === activeModelKey ? 'bg-[#e8f0fe] text-[#1f1f1f]' : 'text-[#1f1f1f] hover:bg-black/5'
                    }`}
                    title={m.full}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${m.available ? 'bg-green-500' : 'bg-slate-300'}`} title={m.available ? 'Terdeteksi di Ollama' : 'Tidak ada di Ollama'} />
                    <span className="flex-1 min-w-0">
                      <span className="block truncate font-medium">{m.label}</span>
                      <span className="block truncate text-[11px] text-[#444746]">{m.full}</span>
                    </span>
                    {m.key === activeModelKey && (
                      <i className="fa-solid fa-check text-[#0b57d0] text-[12px]"></i>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <button
          type="submit"
          disabled={!input.trim() || isTyping}
          className={`w-10 h-10 shrink-0 flex items-center justify-center rounded-full transition-colors ${
            input.trim() && !isTyping
              ? 'bg-[#007AFF] text-white hover:bg-[#005bb5]'
              : 'bg-transparent text-[#a1a1aa] hover:bg-black/5'
          }`}
        >
          <i className="fa-solid fa-paper-plane text-[16px]"></i>
        </button>
      </div>
    </form>
  );

  return (
    <div className="flex bg-white overflow-hidden text-[#1f1f1f] relative -m-4 lg:-m-10 w-[calc(100%+2rem)] lg:w-[calc(100%+5rem)] h-[calc(100vh-56px)] lg:h-[100vh]">
      <style>{`
        .markdown-body p { margin: 0.4rem 0; }
        .markdown-body h1, .markdown-body h2, .markdown-body h3 { font-weight: 600; margin: 0.7rem 0 0.4rem; line-height: 1.3; }
        .markdown-body h1 { font-size: 17px; } .markdown-body h2 { font-size: 16px; } .markdown-body h3 { font-size: 15px; }
        .markdown-body ul { list-style: disc; padding-left: 1.25rem; margin: 0.4rem 0; }
        .markdown-body ol { list-style: decimal; padding-left: 1.25rem; margin: 0.4rem 0; }
        .markdown-body li { margin: 2px 0; }
        .markdown-body table { border-collapse: collapse; width: 100%; margin: 8px 0; font-size: 13px; display: block; overflow-x: auto; }
        .markdown-body th, .markdown-body td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; white-space: nowrap; }
        .markdown-body th { background: #dbeafe; font-weight: 600; }
        .markdown-body code { background: rgba(0,0,0,0.06); padding: 1px 5px; border-radius: 4px; font-size: 12.5px; }
        .markdown-body pre { background: #0f172a; color: #e2e8f0; padding: 10px 12px; border-radius: 10px; overflow-x: auto; margin: 8px 0; }
        .markdown-body pre code { background: transparent; color: inherit; padding: 0; }
        .markdown-body hr { margin: 10px 0; border: none; border-top: 1px solid #cbd5e1; }
        .markdown-body strong { font-weight: 600; }
      `}</style>
      {/* Mobile Overlay */}
      {showHistory && (
        <div
          className="md:hidden absolute inset-0 z-40 bg-black/20"
          onClick={() => setShowHistory(false)}
        />
      )}

      {/* Main Chat */}
      <div className="flex-1 flex flex-col bg-white h-full min-w-0">
        <header className="shrink-0 p-4 flex items-center justify-between z-10 bg-white border-b border-slate-100">
          <h2 className="text-[18px] font-medium text-[#1f1f1f]">Nexus AI</h2>
          {!showHistory && (
            <button onClick={() => setShowHistory(true)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#f0f4f9] text-[#444746] transition-colors" title="Past chats">
              <i className="fa-solid fa-clock-rotate-left text-[16px]"></i>
            </button>
          )}
        </header>

        <div className="flex-1 flex flex-col overflow-hidden relative">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center px-4 max-w-4xl mx-auto w-full">
              <div className="flex flex-col items-center justify-center w-full my-auto">
                <h1 className="text-4xl md:text-[40px] font-medium mb-8 bg-gradient-to-r from-gray-900 via-gray-400 to-gray-900 text-transparent bg-clip-text inline-block text-center animate-gradient">
                  Halo, Analyst
                </h1>
                <div className="w-full">
                  {renderInputForm(true)}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-4 md:px-8 py-4" ref={scrollRef}>
              <div className="max-w-3xl mx-auto space-y-6">
                {messages.map((msg, idx) => (
                  <ChatMessageItem key={idx} msg={msg} />
                ))}

                {isTyping && (
                  <div className="flex gap-4 fade-in w-full">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-transparent text-[#444746] mt-0.5">
                      <i className="fa-solid fa-sparkles text-[16px] animate-pulse"></i>
                    </div>
                    <div className="text-[#1f1f1f] text-[16px] py-1 flex items-center">
                      <span className="animate-pulse">Mengetik...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {messages.length > 0 && (
          <div className="shrink-0 pt-2 pb-4 px-4 bg-white z-10 border-t border-slate-50/50">
            <div className="max-w-3xl mx-auto w-full">
              {renderInputForm(false)}
              <p className="text-center text-[12px] text-[#444746] mt-3 font-medium">
                AI dapat membuat kesalahan. Harap periksa kembali infonya.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* History Sidebar */}
      {showHistory && (
        <div className="flex w-[280px] flex-col overflow-hidden shrink-0 transition-all absolute md:relative z-50 md:z-auto right-0 top-0 bottom-0 bg-[#f0f4f9] h-full border-l border-[#e3e3e3]/50">
          <div className="p-4 flex items-center justify-between mt-2 md:mt-0">
            <span className="text-[16px] font-medium text-[#1f1f1f]">Past Chats</span>
            <button onClick={() => setShowHistory(false)} className="text-[#444746] hover:bg-black/5 w-10 h-10 flex items-center justify-center rounded-full transition-colors" title="Tutup">
              <i className="fa-solid fa-xmark text-[16px]"></i>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1 custom-scrollbar">
            <div className="mb-2 px-3 text-[12px] font-medium text-[#444746] mt-4">Recent</div>
            {pastChats.map(chat => (
              <button
                key={chat.id}
                onClick={() => handleLoadHistory(chat.id)}
                className="w-full text-left px-3 py-2.5 rounded-full hover:bg-[#e1e5ea] text-[14px] text-[#1f1f1f] truncate transition-colors flex items-center gap-3"
              >
                <i className="fa-regular fa-message text-[#444746] text-[14px]"></i>
                {chat.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
