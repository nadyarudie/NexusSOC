import { useState } from 'react';
import { toast } from 'sonner';

export default function NotesView({ notes, setNotes }) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentNote, setCurrentNote] = useState({ title: '', content: '' });
  const [editingId, setEditingId] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('time-desc');

  const handleSave = (e) => {
    e.preventDefault();
    if (!currentNote.title || !currentNote.content) {
      toast.error('Title and content are required');
      return;
    }
    
    if (editingId) {
      setNotes(notes.map(n => n.id === editingId ? { ...currentNote, id: editingId, date: n.date } : n));
      toast.success('Note updated');
    } else {
      setNotes([{ ...currentNote, id: Date.now(), date: new Date().toISOString() }, ...notes]);
      toast.success('Note added');
    }
    
    setIsFormOpen(false);
    setCurrentNote({ title: '', content: '' });
    setEditingId(null);
  };

  const handleEdit = (note) => {
    setCurrentNote({ title: note.title, content: note.content });
    setEditingId(note.id);
    setIsFormOpen(true);
  };

  const handleDelete = (id) => {
    setNotes(notes.filter(n => n.id !== id));
    toast.success('Note deleted');
  };

  const handleDownloadTxt = (note) => {
    const element = document.createElement("a");
    const file = new Blob([`${note.title}\n\n${note.content}`], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${note.title.replace(/\s+/g, '_').toLowerCase()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success('Note downloaded');
  };

  const [viewingNoteId, setViewingNoteId] = useState(null);

  const filteredAndSortedNotes = notes
    .filter(note => 
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      note.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'time-desc') return new Date(b.date) - new Date(a.date);
      if (sortBy === 'time-asc') return new Date(a.date) - new Date(b.date);
      if (sortBy === 'title-asc') return a.title.localeCompare(b.title);
      if (sortBy === 'title-desc') return b.title.localeCompare(a.title);
      return 0;
    });

  const viewingNote = notes.find(n => n.id === viewingNoteId);

  return (
    <div className="max-w-7xl mx-auto fade-in">
      {!viewingNote && (
        <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Analyst Notes</h2>
            <p className="text-slate-500 text-sm mt-1">Quick drafts and findings for your reports.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {!isFormOpen && (
              <>
                <div className="relative w-full sm:w-56">
                  <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                  <input 
                    type="text" 
                    placeholder="Search notes..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="shadcn-input w-full pl-8 pr-3 py-2 text-sm" 
                  />
                </div>
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="shadcn-input px-3 py-2 text-sm w-full sm:w-auto cursor-pointer"
                >
                  <option value="time-desc">Newest First</option>
                  <option value="time-asc">Oldest First</option>
                  <option value="title-asc">Title (A-Z)</option>
                  <option value="title-desc">Title (Z-A)</option>
                </select>
                <button onClick={() => setIsFormOpen(true)} className="btn-primary py-2 px-4 whitespace-nowrap w-full sm:w-auto">
                  <i className="fa-solid fa-plus mr-2 text-xs"></i> New Note
                </button>
              </>
            )}
          </div>
        </header>
      )}

      {viewingNote && !isFormOpen && (
        <div className="fade-in">
          <button 
            onClick={() => setViewingNoteId(null)}
            className="text-sm font-medium text-slate-500 hover:text-slate-900 mb-6 flex items-center gap-2 transition-colors"
          >
            <i className="fa-solid fa-arrow-left"></i> Back to Notes
          </button>
          
          <div className="shadcn-card p-8 lg:p-10 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-900"></div>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pl-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 leading-tight mb-2">{viewingNote.title}</h2>
                <div className="text-sm font-medium text-slate-400 flex items-center gap-2">
                  <i className="fa-regular fa-clock"></i>
                  {new Date(viewingNote.date).toLocaleString()}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => handleDownloadTxt(viewingNote)} className="px-3 py-1.5 rounded-md text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-1.5">
                  <i className="fa-solid fa-download"></i> Download
                </button>
                <button onClick={() => { handleEdit(viewingNote); setViewingNoteId(null); }} className="px-3 py-1.5 rounded-md text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-1.5">
                  <i className="fa-solid fa-pen"></i> Edit
                </button>
                <button onClick={() => { handleDelete(viewingNote.id); setViewingNoteId(null); }} className="px-3 py-1.5 rounded-md text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors flex items-center gap-1.5">
                  <i className="fa-solid fa-trash"></i> Delete
                </button>
              </div>
            </div>
            
            <div className="pl-4 prose prose-slate max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap">
              {viewingNote.content}
            </div>
          </div>
        </div>
      )}

      {isFormOpen && (
        <div className="shadcn-card p-6 mb-8 fade-in border border-slate-200 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900 mb-4">{editingId ? 'Edit Note' : 'Create Note'}</h3>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Title</label>
              <input 
                type="text" 
                value={currentNote.title}
                onChange={e => setCurrentNote({...currentNote, title: e.target.value})}
                className="w-full shadcn-input px-3 py-2 text-sm"
                placeholder="e.g., Malware Analysis on 10.0.1.15"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Content</label>
              <textarea 
                value={currentNote.content}
                onChange={e => setCurrentNote({...currentNote, content: e.target.value})}
                className="w-full shadcn-input px-3 py-2 min-h-[300px] resize-y text-sm"
                placeholder="Write your findings here..."
              ></textarea>
            </div>
            <div className="flex gap-2 justify-end">
              <button 
                type="button" 
                onClick={() => { setIsFormOpen(false); setEditingId(null); setCurrentNote({title:'', content:''}); }}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary py-2 px-4">
                Save Note
              </button>
            </div>
          </form>
        </div>
      )}

      {!viewingNote && !isFormOpen && (
        <div className="space-y-4">
          {notes.length === 0 && (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400 text-sm border border-dashed border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50/50 dark:bg-slate-800/50">
              No notes yet. Click 'New Note' to create one.
            </div>
          )}
          {notes.length > 0 && filteredAndSortedNotes.length === 0 && (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400 text-sm border border-dashed border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50/50 dark:bg-slate-800/50">
              No notes matching your search.
            </div>
          )}
          {filteredAndSortedNotes.map(note => {
            const shouldTruncate = note.content.length > 250;
            return (
              <div key={note.id} className="shadcn-card p-6 group hover:border-slate-300 transition-colors shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-slate-900"></div>
                <div className="flex justify-between items-start mb-2 pl-2">
                  <h3 className="text-lg font-semibold text-slate-900 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => setViewingNoteId(note.id)}>{note.title}</h3>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium text-slate-400 mr-3">{new Date(note.date).toLocaleString()}</span>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      <button onClick={() => handleDownloadTxt(note)} className="w-7 h-7 rounded flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors" title="Download as TXT">
                        <i className="fa-solid fa-download text-xs"></i>
                      </button>
                      <button onClick={() => handleEdit(note)} className="w-7 h-7 rounded flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors" title="Edit">
                        <i className="fa-solid fa-pen text-xs"></i>
                      </button>
                      <button onClick={() => handleDelete(note.id)} className="w-7 h-7 rounded flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete">
                        <i className="fa-solid fa-trash text-xs"></i>
                      </button>
                    </div>
                  </div>
                </div>
                <div className="cursor-pointer" onClick={() => setViewingNoteId(note.id)}>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap pl-2 leading-relaxed">
                    {shouldTruncate ? note.content.substring(0, 250) + '...' : note.content}
                  </p>
                  {shouldTruncate && (
                    <div className="text-xs text-blue-600 font-medium pl-2 mt-2 hover:underline">Read full note</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
