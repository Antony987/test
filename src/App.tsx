/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, BookOpen, MessageSquare, Eye, Download, 
  HelpCircle, CheckCircle2, Layers, Cpu
} from 'lucide-react';
import { IdeaNote } from './types';
import { CaptureHub } from './components/CaptureHub';
import { NotesFeed } from './components/NotesFeed';
import { Chatbot } from './components/Chatbot';
import { VisionLab } from './components/VisionLab';

const STORAGE_KEY = 'ideastream_notes';

export default function App() {
  const [notes, setNotes] = useState<IdeaNote[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse notes from storage', e);
    }
    // Initial sample note
    return [
      {
        id: 'initial-sample',
        text: 'Ανάπτυξη εφαρμογής για μικρές επιχειρήσεις με αυτόματη καταγραφή εξόδων και AI σύνοψη αποδείξεων.',
        category: 'Επιχειρηματική Ιδέα',
        createdAt: new Date().toLocaleString('el-GR'),
        aiResponse: `### 🎯 Σύνοψη & Κεντρική Ιδέα
Μια εφαρμογή αυτόματης κατηγοριοποίησης αποδείξεων για επαγγελματίες, με στόχο την εξοικονόμηση λογιστικού χρόνου.

### 💡 Στρατηγική Αξιολόγηση & Ευκαιρίες
- **Value Proposition**: Μείωση του χρόνου συγκέντρωσης παραστατικών από ώρες σε δευτερόλεπτα.
- **Target Audience**: Ελεύθεροι επαγγελματίες, μικρά καταστήματα και freelancers.

### ⚡ Άμεσα Επόμενα Βήματα (Action Plan)
- [ ] Βήμα 1: Συνομιλία με 3 λογιστές για να κατανοηθούν τα πιο συνηθισμένα λάθη στα έξοδα.
- [ ] Βήμα 2: Δοκιμή OCR & Gemini 4 Argon για την ακρίβεια ανάγνωσης αποδείξεων.
- [ ] Βήμα 3: Δημιουργία ενός clickable wireframe.

### ⚠️ Πιθανά Εμπόδια & Λύση
- **Πρόκληση**: Κακής ποιότητας θερμικές αποδείξεις.
- **Λύση**: Χρήση του Gemini 4 Argon για αυτόματη αναγνώριση ασαφών γραμμάτων και ποσών.`,
        modelUsed: 'gemini-3.8-flash',
      },
    ];
  });

  const [activeTab, setActiveTab] = useState<'capture' | 'chat' | 'vision'>('capture');
  const [attachedNoteForChat, setAttachedNoteForChat] = useState<IdeaNote | null>(null);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    } catch (e) {
      console.error('Failed to save notes to storage', e);
    }
  }, [notes]);

  const handleSaveNote = (newNoteData: Omit<IdeaNote, 'id' | 'createdAt'>) => {
    const newNote: IdeaNote = {
      ...newNoteData,
      id: Date.now().toString(),
      createdAt: new Date().toLocaleString('el-GR'),
    };
    setNotes((prev) => [newNote, ...prev]);
  };

  const handleDeleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const handleClearAll = () => {
    if (confirm('Είστε σίγουροι ότι θέλετε να διαγράψετε όλες τις σημειώσεις σας;')) {
      setNotes([]);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const handleOpenInChat = (note: IdeaNote) => {
    setAttachedNoteForChat(note);
    setActiveTab('chat');
  };

  const handleExportData = () => {
    if (notes.length === 0) {
      alert('Δεν υπάρχουν σημειώσεις για εξαγωγή.');
      return;
    }

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(notes, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `ideastream_export_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen flex flex-col font-sans selection:bg-indigo-500/30 selection:text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur-md sticky top-0 z-50 transition-all">
        <div className="max-w-5xl mx-auto px-4 py-3 sm:py-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          {/* Logo & Tagline */}
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 p-2.5 rounded-2xl text-white shadow-lg shadow-indigo-600/30">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">IdeaStream AI</h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Gemini Online
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Γρήγορη καταγραφή σκέψεων & AI στρατηγική καθοδήγηση
              </p>
            </div>
          </div>

          {/* Top Actions: Export */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportData}
              title="Εξαγωγή όλων των σημειώσεων σε JSON"
              className="bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition border border-slate-700/60"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Εξαγωγή</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="max-w-5xl mx-auto px-4 pt-1 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('capture')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-xl transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
              activeTab === 'capture'
                ? 'border-indigo-500 text-white bg-slate-800/60 shadow-sm'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <BookOpen className="w-4 h-4 text-indigo-400" />
            <span>Καταγραφή & Ιδέες</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 rounded-full text-slate-400 font-mono">
              {notes.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-xl transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
              activeTab === 'chat'
                ? 'border-indigo-500 text-white bg-slate-800/60 shadow-sm'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-purple-400" />
            <span>AI Σύμβουλος (Chatbot)</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-indigo-950 text-indigo-300 rounded-full border border-indigo-500/30 font-mono">
              Roles & History
            </span>
          </button>

          <button
            onClick={() => setActiveTab('vision')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-xl transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
              activeTab === 'vision'
                ? 'border-indigo-500 text-white bg-slate-800/60 shadow-sm'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <Eye className="w-4 h-4 text-pink-400" />
            <span>Οπτική Ανάλυση</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-pink-950/60 text-pink-300 rounded-full border border-pink-500/30 font-mono">
              Gemini 4 Argon
            </span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 py-6 flex-1 w-full flex flex-col gap-6">
        {activeTab === 'capture' && (
          <>
            <CaptureHub onSaveNote={handleSaveNote} onOpenChatWithNote={(txt) => {
              setAttachedNoteForChat({
                id: 'temp',
                text: txt,
                category: 'Σκέψη',
                createdAt: new Date().toLocaleString('el-GR'),
              });
              setActiveTab('chat');
            }} />
            
            <div className="pt-2">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-400" />
                  <span>Οι Σκέψεις & Στόχοι μου</span>
                  <span className="text-xs text-slate-400 font-normal">
                    ({notes.length} αποθηκευμένες)
                  </span>
                </h3>
              </div>

              <NotesFeed
                notes={notes}
                onDeleteNote={handleDeleteNote}
                onClearAll={handleClearAll}
                onOpenInChat={handleOpenInChat}
              />
            </div>
          </>
        )}

        {activeTab === 'chat' && (
          <Chatbot
            attachedNote={attachedNoteForChat}
            onClearAttachedNote={() => setAttachedNoteForChat(null)}
            onSaveIdeaFromChat={(content) => {
              handleSaveNote({
                text: `[Ιδέα από AI Chat]\n${content.slice(0, 180)}...`,
                category: 'Επιχειρηματική Ιδέα',
                aiResponse: content,
                modelUsed: 'Gemini Chatbot',
              });
              alert('Η απάντηση του AI αποθηκεύτηκε στο Feed των Ιδεών σας!');
            }}
          />
        )}

        {activeTab === 'vision' && (
          <VisionLab onSaveToFeed={handleSaveNote} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500 bg-slate-950/90">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">IdeaStream AI</span>
            <span>&bull;</span>
            <span>Ασφαλής αποθήκευση & επεξεργασία</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span>Powered by Gemini 4 Argon & Gemini 3.8 Flash</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
