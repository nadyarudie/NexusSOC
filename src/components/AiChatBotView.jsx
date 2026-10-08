import { useState, useRef, useEffect } from 'react';

const ChatMessageItem = ({ msg }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const MAX_LENGTH = 300;
  
  const isLong = msg.content.length > MAX_LENGTH;
  const displayText = (!isExpanded && isLong) ? msg.content.slice(0, MAX_LENGTH) + '...' : msg.content;
  const isUser = msg.role === 'user';

  if (isUser) {
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
    <div className="flex gap-3 fade-in self-start w-full max-w-[85%] md:max-w-[75%] mr-auto">
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-transparent text-[#0b57d0] mt-auto mb-1">
        <i className="fa-solid fa-sparkles text-[16px]"></i>
      </div>
      <div className="bg-[#e8f0fe] text-[#1f1f1f] rounded-[24px] rounded-bl-[8px] px-5 py-3 text-[15px] leading-relaxed break-words shadow-sm">
        <div className="whitespace-pre-wrap">{displayText}</div>
        {isLong && (
          <button onClick={() => setIsExpanded(!isExpanded)} className="text-[#0b57d0] hover:underline font-medium text-[13px] mt-2 block">
            {isExpanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>
    </div>
  );
};

export default function AiChatBotView({ apiKeys }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showHistory, setShowHistory] = useState(window.innerWidth > 1024);
  const textareaRef = useRef(null);
  const scrollRef = useRef(null);

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
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    
    if (textareaRef.current) {
      textareaRef.current.style.height = '44px';
      textareaRef.current.style.overflowY = 'hidden';
    }

    if (!apiKeys?.aiEngine) {
      setTimeout(() => {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: 'Maaf, API Key untuk AI Engine belum dikonfigurasi. Silakan masuk ke menu Configuration > API Config untuk memasukkan API Key Anda.' 
        }]);
        setIsTyping(false);
      }, 1000);
      return;
    }

    setTimeout(() => {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Saya menerima pesan Anda: "${userMessage.content}". Karena ini adalah demo antarmuka (UI), fitur chat interaktif dengan LLM saat ini berjalan dalam mode simulasi.` 
      }]);
      setIsTyping(false);
    }, 1500);
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
      <div className="flex items-center gap-1 mb-1 ml-2 mr-1">
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
