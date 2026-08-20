import { useState } from 'react';
import { toast } from 'sonner';

export default function ChronologyView({ notes }) {
  const [selectedNoteId, setSelectedNoteId] = useState('');
  const [chronologyData, setChronologyData] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const formatToWIB = (timestamp) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return timestamp; // fallback if invalid
      
      // Convert to WIB (UTC+7)
      return new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(date) + ' WIB';
    } catch (e) {
      return timestamp;
    }
  };

  const extractIp = (text) => {
    const ipRegex = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/;
    const match = text?.match(ipRegex);
    return match ? match[0] : null;
  };

  const handleDownloadTxt = () => {
    let content = "Event Chronology\n";
    content += "================\n\n";
    chronologyData.forEach(d => {
      content += `[${formatToWIB(d.timestamp)}]\n`;
      content += `Attacker: ${d.attackerIp}\n`;
      content += `Destination: ${d.destIp}\n`;
      content += `Log: ${d.fullLog}\n`;
      content += `------------------------------------------------\n\n`;
    });
    
    const element = document.createElement("a");
    const file = new Blob([content], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = "chronology_results.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleGenerate = (e) => {
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

    setIsGenerating(true);
    setChronologyData([]);

    setTimeout(() => {
      let results = [];
      const text = note.content;

      // Try to parse the text to find JSON blocks. Wazuh outputs might have text before the JSON.
      // We will look for the first '{' and the last '}' to try parsing it.
      let jsonString = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
      
      try {
        if (jsonString) {
          const parsed = JSON.parse(jsonString);
          let hitsArray = [];

          if (parsed.hits && parsed.hits.hits) {
            hitsArray = parsed.hits.hits;
          } else if (Array.isArray(parsed)) {
            hitsArray = parsed;
          } else {
            hitsArray = [parsed]; // fallback to single object
          }

          hitsArray.forEach(item => {
            const source = item._source || item;
            
            if (source['@timestamp'] || source.timestamp) {
              const rawTimestamp = source['@timestamp'] || source.timestamp;
              
              // Find attacker IP (srcip)
              let attackerIp = 
                source.srcip ||
                source.data?.srcip || 
                source.source?.ip || 
                extractIp(source.full_log) || 
                extractIp(source.previous_output) || 
                'N/A';

              // Find destination IP (destip)
              let destIp = 
                source.destip ||
                source.data?.destip || 
                source.destination?.ip || 
                source.agent?.ip || 
                'N/A';

              let fullLog = 
                source.full_log || 
                source.previous_output || 
                JSON.stringify(source.data || source);

              results.push({
                timestamp: rawTimestamp,
                attackerIp,
                destIp,
                fullLog
              });
            }
          });
        }
      } catch (err) {
        // Fallback 1: If JSON fails, it might be pretty-printed JSON that is malformed.
        // We look for "@timestamp" and extract the block until the next timestamp.
        const timeRegex = /"@timestamp"\s*:\s*"([^"]+)"/g;
        let match;
        let foundRegex = false;
        
        while ((match = timeRegex.exec(text)) !== null) {
           foundRegex = true;
           const nextMatchIndex = text.indexOf('"@timestamp"', match.index + 1);
           const block = text.substring(match.index, nextMatchIndex !== -1 ? nextMatchIndex : text.length);
           
           const srcMatch = block.match(/"srcip"\s*:\s*"((?:[^"\\]|\\.)*)"/) || block.match(/"ip"\s*:\s*"((?:[^"\\]|\\.)*)"/);
           const destMatch = block.match(/"destip"\s*:\s*"((?:[^"\\]|\\.)*)"/) || block.match(/"agent"\s*:\s*\{[\s\S]*?"ip"\s*:\s*"([^"]+)"/);
           const logMatch = block.match(/"full_log"\s*:\s*"((?:[^"\\]|\\.)*)"/) || block.match(/"previous_output"\s*:\s*"((?:[^"\\]|\\.)*)"/);
           
           results.push({
             timestamp: match[1],
             attackerIp: srcMatch ? srcMatch[1] : extractIp(block) || 'N/A',
             destIp: destMatch ? destMatch[1] : 'N/A',
             fullLog: logMatch ? logMatch[1].replace(/\\"/g, '"') : block.trim()
           });
        }

        // Fallback 2: Line by line extraction if no "@timestamp" JSON keys were found
        if (!foundRegex) {
          const lines = text.split('\n');
          lines.forEach(line => {
            const dateMatch = line.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/) || line.match(/[A-Z][a-z]{2}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}/);
            if (dateMatch) {
              const rawTimestamp = dateMatch[0];
              const ips = line.match(/\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g) || [];
              results.push({
                timestamp: rawTimestamp,
                attackerIp: ips[0] || 'N/A',
                destIp: ips[1] || 'N/A',
                fullLog: line.trim()
              });
            }
          });
        }
      }

      // Sort results by timestamp chronologically
      results.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      if (results.length > 0) {
        setChronologyData(results);
        toast.success(`Successfully generated chronology with ${results.length} events.`);
      } else {
        toast.error('Could not extract any chronological events from the note.');
      }
      
      setIsGenerating(false);
    }, 1000);
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col fade-in pb-12">
      <header className="mb-6 flex-shrink-0">
        <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Chronology Table</h2>
        <p className="text-slate-500 text-sm mt-1">Convert raw logs from Analyst Notes into a structured chronological timeline.</p>
      </header>

      <div className="shadcn-card p-6 flex flex-col mb-6 overflow-visible">
        <form onSubmit={handleGenerate} className="flex flex-col sm:flex-row items-start sm:items-end gap-4 relative">
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
            disabled={isGenerating || notes.length === 0} 
            className="bg-[#0f172a] hover:bg-[#1e293b] text-white disabled:opacity-50 disabled:cursor-not-allowed h-[38px] px-6 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm whitespace-nowrap"
          >
            {isGenerating ? (
              <><i className="fa-solid fa-circle-notch fa-spin"></i> Generating...</>
            ) : (
              <><i className="fa-solid fa-timeline"></i> Generate Chronology</>
            )}
          </button>
        </form>
      </div>

      {chronologyData.length > 0 && (
        <div className="shadcn-card overflow-hidden fade-in mb-8">
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Event Timeline</h3>
              <p className="text-xs text-slate-500 mt-0.5">Chronological breakdown of extracted logs.</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-full">
                {chronologyData.length} Events
              </span>
              <button 
                type="button" 
                onClick={handleDownloadTxt}
                className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm"
              >
                <i className="fa-solid fa-download"></i> Download TXT
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-white border-b border-slate-100 text-xs uppercase font-semibold text-slate-500">
                <tr>
                  <th className="px-6 py-3 whitespace-nowrap w-[200px]">Timestamp (WIB)</th>
                  <th className="px-6 py-3 whitespace-nowrap w-[150px]">Attacker IP</th>
                  <th className="px-6 py-3 whitespace-nowrap w-[150px]">Destination IP</th>
                  <th className="px-6 py-3 whitespace-nowrap">Full Log</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {chronologyData.map((data, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 text-slate-900 font-medium whitespace-nowrap">{formatToWIB(data.timestamp)}</td>
                    <td className="px-6 py-4 font-mono text-red-600 font-medium">{data.attackerIp}</td>
                    <td className="px-6 py-4 font-mono text-blue-600 font-medium">{data.destIp}</td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-mono text-slate-500 bg-slate-50 p-3 rounded border border-slate-100 max-h-[150px] overflow-y-auto break-all whitespace-pre-wrap">
                        {data.fullLog}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
