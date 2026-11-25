import React, { useState } from 'react';
import { 
  BookOpen, Trash2, Copy, Check, MessageSquare, Clock, Tag, 
  Sparkles, Search, Filter, Volume2, VolumeX, ExternalLink, Image as ImageIcon
} from 'lucide-react';
import { IdeaNote, NoteCategory } from '../types';
import { MarkdownView } from '../utils/formatMarkdown';

interface NotesFeedProps {
  notes: IdeaNote[];
  onDeleteNote: (id: string) => void;
  onClearAll: () => void;
  onOpenInChat: (note: IdeaNote) => void;
}

export const NotesFeed: React.FC<NotesFeedProps> = ({
  notes,
  onDeleteNote,
  onClearAll,
  onOpenInChat,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const filteredNotes = notes.filter((note) => {
    const matchesFilter = selectedFilter === 'all' || note.category === selectedFilter;
    const matchesSearch = 
      note.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (note.aiResponse && note.aiResponse.toLowerCase().includes(searchQuery.toLowerCase())) ||
      note.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleCopy = (note: IdeaNote) => {
    const textToCopy = `[${note.category}] ${note.createdAt}\n${note.text}\n\n${
      note.aiResponse ? `--- AI GUIDANCE (${note.modelUsed || 'Gemini'}) ---\n${note.aiResponse}` : ''
    }`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(note.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Browser speech synthesis for accessibility
  const handleReadAloud = (noteId: string, content: string) => {
    if (!('speechSynthesis' in window)) {
      alert('Η σύνθεση ομιλίας δεν υποστηρίζεται από το πρόγραμμα περιήγησής σας.');
      return;
    }

    if (speakingId === noteId) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(content);
    utterance.lang = 'el-GR';
    utterance.rate = 1.0;

    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);

    setSpeakingId(noteId);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Search and Filter Controls */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Αναζήτηση στις σημειώσεις και AI αναλύσεις..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Category Pills & Clear All */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedFilter('all')}
            className={`text-xs px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition ${
              selectedFilter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            Όλα ({notes.length})
          </button>
          {['Σκέψη', 'Επιχειρηματική Ιδέα', 'Στόχος', 'Project'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedFilter(cat)}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition ${
                selectedFilter === cat
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
          {notes.length > 0 && (
            <button
              onClick={onClearAll}
              className="text-xs text-red-400 hover:text-red-300 px-2 py-1 transition whitespace-nowrap ml-1"
            >
              Εκκαθάριση
            </button>
          )}
        </div>
      </div>

      {/* Feed List */}
      {filteredNotes.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-10 text-center text-slate-500 flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-300">
              {notes.length === 0 ? 'Δεν υπάρχουν ακόμη καταγεγραμμένες ιδέες' : 'Δεν βρέθηκαν αποτελέσματα'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              {notes.length === 0
                ? 'Χρησιμοποιήστε το Κέντρο Γρήγορης Καταγραφής παραπάνω για να αποθηκεύσετε την πρώτη σας σκέψη ή φωτογραφία.'
                : 'Δοκιμάστε διαφορετικούς όρους αναζήτησης ή αλλάξτε το φίλτρο κατηγορίας.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              className="bg-slate-900/90 border border-slate-800/90 hover:border-slate-700/80 rounded-2xl p-5 flex flex-col gap-3 shadow-lg transition-all duration-200"
            >
              {/* Card Header: Category & Date & Actions */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-800/60 pb-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {note.category}
                  </span>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    {note.createdAt}
                  </span>
                  {note.modelUsed && (
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 font-mono">
                      {note.modelUsed}
                    </span>
                  )}
                </div>

                {/* Toolbar Buttons */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onOpenInChat(note)}
                    title="Συζήτηση αυτής της ιδέας στο AI Chatbot"
                    className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition flex items-center gap-1 text-xs"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Συζήτηση</span>
                  </button>

                  <button
                    onClick={() => handleCopy(note)}
                    title="Αντιγραφή κειμένου"
                    className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
                  >
                    {copiedId === note.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <button
                    onClick={() => onDeleteNote(note.id)}
                    title="Διαγραφή σημείωσης"
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Note Content Text */}
              <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
                {note.text}
              </p>

              {/* Attached Image Preview */}
              {note.image && (
                <div className="mt-1">
                  <div
                    onClick={() => setExpandedImage(note.image!)}
                    className="group relative inline-block cursor-zoom-in rounded-xl overflow-hidden border border-slate-800 max-w-xs max-h-52"
                  >
                    <img
                      src={note.image}
                      alt="Attached note visual"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-xs text-white font-medium gap-1">
                      <ImageIcon className="w-3.5 h-3.5" />
                      Κλικ για μεγέθυνση
                    </div>
                  </div>
                </div>
              )}

              {/* AI Response Card */}
              {note.aiResponse && (
                <div className="mt-2 bg-gradient-to-br from-indigo-950/40 via-slate-900/80 to-purple-950/30 border border-indigo-500/20 rounded-xl p-4 relative">
                  <div className="flex items-center justify-between mb-2 pb-2 border-b border-indigo-500/10">
                    <div className="flex items-center gap-2 font-semibold text-xs sm:text-sm text-indigo-300">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      <span>AI Σύνοψη & Στρατηγική Κατεύθυνση</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleReadAloud(note.id, note.aiResponse!)}
                        title={speakingId === note.id ? 'Διακοπή ανάγνωσης' : 'Ανάγνωση φωναχτά'}
                        className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition ${
                          speakingId === note.id
                            ? 'bg-indigo-600 text-white animate-pulse'
                            : 'bg-indigo-950/60 text-indigo-300 hover:bg-indigo-900/60'
                        }`}
                      >
                        {speakingId === note.id ? (
                          <VolumeX className="w-3.5 h-3.5" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5" />
                        )}
                        <span className="text-[11px] hidden sm:inline">
                          {speakingId === note.id ? 'Διακοπή' : 'Ανάγνωση'}
                        </span>
                      </button>
                    </div>
                  </div>

                  <MarkdownView content={note.aiResponse} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Image Zoom Modal */}
      {expandedImage && (
        <div
          onClick={() => setExpandedImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out"
        >
          <div className="relative max-w-3xl max-h-[90vh] rounded-2xl overflow-hidden border border-slate-700 bg-slate-900 shadow-2xl">
            <img src={expandedImage} alt="Expanded visual" className="w-full h-full object-contain" />
          </div>
        </div>
      )}
    </div>
  );
};
