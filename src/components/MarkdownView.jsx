import { useState, useRef } from 'react';
export default function MarkdownView() {
  const [activeTab, setActiveTab] = useState('upload');
  const [selectedFile, setSelectedFile] = useState(null);
  const [linkInput, setLinkInput] = useState('');
  const [outputMarkdown, setOutputMarkdown] = useState('');
  const [loading, setLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef(null);

  const handleFileDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleConvert = async () => {
    let sourceName = '';

    if (activeTab === 'upload') {
      if (!selectedFile) {
        alert('Please select a file first.');
        return;
      }
      sourceName = selectedFile.name;
    } else {
      if (!linkInput) {
        alert('Please enter a URL.');
        return;
      }
      sourceName = linkInput;
    }

    setLoading(true);

    // Simulate script processing delay
    await new Promise(r => setTimeout(r, 1500));

    const dateStr = new Date().toISOString().split('T')[0];
    const generatedMd = `
# Threat Intelligence Report
**Source:** \`${sourceName}\`
**Date Parsed:** ${dateStr}

This document was automatically parsed and converted into Markdown format using local scripting (No AI).

## 1. Executive Summary
The analyzed document contains telemetry related to a recent phishing campaign. Several malicious endpoints and payloads were successfully extracted and cataloged below.

## 2. Extracted Indicators (IoCs)

| Type   | Indicator | Threat Level |
|--------|-----------|--------------|
| IPv4   | \`10.0.1.15\` | High |
| SHA256 | \`e3b0c44298fc1c149afbf4c8...\` | Critical |
| URL    | \`http://malicious-login.com/auth\` | High |

## 3. Tactical Recommendations
1. **Block** the listed IPv4 and URLs on the perimeter firewall.
2. **Isolate** any internal hosts that have communicated with the extracted IPs.
3. **Monitor** endpoint telemetry for the identified file hashes.

> **Note:** This markdown was generated entirely offline using local template parsing.
`.trim();

    setOutputMarkdown(generatedMd);
    setLoading(false);
  };

  const handleCopy = () => {
    if (!outputMarkdown) return;
    navigator.clipboard.writeText(outputMarkdown).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  return (
    <div className="max-w-7xl mx-auto fade-in h-full flex flex-col pb-6 block">
      <header className="mb-6 shrink-0">
        <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Report Generator</h2>
        <p className="text-slate-500 text-sm mt-1">Convert Docs, PDF, or Links directly into Markdown format.</p>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[500px]">
        <div className="shadcn-card p-6 flex flex-col">
          <div className="flex gap-2 border-b border-slate-200 mb-6 pb-2">
            <button
              onClick={() => setActiveTab('upload')}
              className={`text-sm font-medium px-2 border-b-2 transition-colors ${
                activeTab === 'upload' ? 'text-slate-900 border-slate-900' : 'text-slate-500 hover:text-slate-700 border-transparent'
              }`}
            >
              File Upload
            </button>
            <button
              onClick={() => setActiveTab('link')}
              className={`text-sm font-medium px-2 border-b-2 transition-colors ${
                activeTab === 'link' ? 'text-slate-900 border-slate-900' : 'text-slate-500 hover:text-slate-700 border-transparent'
              }`}
            >
              Document Link
            </button>
          </div>

          {activeTab === 'upload' ? (
            <div className="flex-1 flex flex-col">
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleFileDrop}
                className={`drop-zone flex-1 flex flex-col items-center justify-center cursor-pointer p-6 min-h-[200px] transition-colors ${
                  isDragOver ? 'dragover' : ''
                } ${
                  selectedFile 
                    ? 'bg-green-50 border-green-200 hover:bg-green-100/70' 
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                }`}
              >
                {selectedFile ? (
                  <>
                    <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-4 shadow-sm">
                      <i className="fa-solid fa-check text-lg"></i>
                    </div>
                    <p className="text-sm font-semibold text-green-900">{selectedFile.name}</p>
                    <p className="text-xs text-green-600 mt-1 font-medium">Ready to parse</p>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center mb-4">
                      <i className="fa-solid fa-file-pdf text-slate-400 text-lg"></i>
                    </div>
                    <p className="text-sm font-medium text-slate-900">Drag & Drop or Click to Upload</p>
                    <p className="text-xs text-slate-500 mt-1">Supports .pdf, .doc, .docx, .txt</p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  className="hidden"
                  onChange={(e) => e.target.files.length && setSelectedFile(e.target.files[0])}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-center">
              <label className="block text-sm font-medium text-slate-700 mb-2">Remote Document URL</label>
              <input
                type="url"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                placeholder="https://docs.google.com/..."
                className="w-full shadcn-input px-4 py-3"
              />
              <p className="text-xs text-slate-500 mt-2">
                <i className="fa-solid fa-circle-info mr-1"></i>Ensure the link is publicly accessible.
              </p>
            </div>
          )}

          <button onClick={handleConvert} className="btn-primary w-full py-3 mt-6 flex items-center justify-center gap-2">
            Generate Markdown <i className="fa-solid fa-wand-magic-sparkles text-xs"></i>
          </button>
        </div>

        <div className="shadcn-card flex flex-col bg-black text-white border-neutral-800 overflow-hidden relative">
          <div className="px-4 py-3 border-b border-neutral-800 flex justify-between items-center bg-black">
            <span className="text-xs font-mono text-neutral-400">output.md</span>
            <button
              onClick={handleCopy}
              className={`text-xs font-medium px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
                isCopied ? 'bg-green-600 text-white' : 'bg-neutral-800 hover:bg-neutral-700 text-white'
              }`}
            >
              <i className={isCopied ? 'fa-solid fa-check' : 'fa-regular fa-copy'}></i> {isCopied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div className="flex-1 relative">
            <textarea
              readOnly
              value={outputMarkdown}
              placeholder="Markdown output will appear here..."
              className="w-full h-full bg-black resize-none p-6 font-mono text-sm focus:outline-none text-white placeholder-neutral-600"
            ></textarea>

            {loading && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center">
                <i className="fa-solid fa-circle-notch fa-spin text-3xl text-blue-500 mb-3"></i>
                <p className="text-sm font-medium text-white">Analyzing Document...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}