import React, { useState, useRef } from 'react';
import { Camera, Mic, MicOff, Sparkles, Plus, Image as ImageIcon, X, Loader2, Tag, CheckCircle2 } from 'lucide-react';
import { IdeaNote, NoteCategory } from '../types';

interface CaptureHubProps {
  onSaveNote: (note: Omit<IdeaNote, 'id' | 'createdAt'>) => void;
  onOpenChatWithNote?: (noteText: string) => void;
}

const CATEGORIES: NoteCategory[] = [
  'Σκέψη',
  'Επιχειρηματική Ιδέα',
  'Στόχος',
  'Πρόβλημα',
  'Project',
  'Γρήγορη Σημείωση',
];

export const CaptureHub: React.FC<CaptureHubProps> = ({ onSaveNote }) => {
  const [text, setText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<NoteCategory>('Σκέψη');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Handle Image Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      alert('Το αρχείο είναι πολύ μεγάλο. Μέγιστο όριο 20MB.');
      return;
    }

    setImageName(file.name);
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setImageBase64(uploadEvent.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageBase64(null);
    setImageName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Web Speech API for voice dictation
  const toggleRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechError('Ο browser σας δεν υποστηρίζει Web Speech API. Δοκιμάστε Google Chrome.');
      setTimeout(() => setSpeechError(null), 5000);
      return;
    }

    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'el-GR';
      recognition.interimResults = true;
      recognition.continuous = true;

      recognition.onstart = () => {
        setIsRecording(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        setText((prev) => (prev ? prev + ' ' : '') + transcript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event);
        if (event.error !== 'no-speech') {
          setSpeechError(`Σφάλμα φωνής: ${event.error}`);
        }
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Speech initialization failed', err);
      setIsRecording(false);
    }
  };

  // Fast Save Note without AI
  const handleQuickSave = () => {
    if (!text.trim() && !imageBase64) {
      alert('Παρακαλώ εισάγετε μια σκέψη ή επισυνάψτε μια εικόνα.');
      return;
    }

    onSaveNote({
      text: text.trim() || '(Καταγραφή εικόνας χωρίς κείμενο)',
      category: selectedCategory,
      image: imageBase64,
      aiResponse: null,
    });

    // Reset fields
    setText('');
    removeImage();
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
    showToast('Η σκέψη αποθηκεύτηκε επιτυχώς!');
  };

  // AI Analyze and Guidance
  const handleAIAnalyzeAndSave = async () => {
    if (!text.trim() && !imageBase64) {
      alert('Παρακαλώ εισάγετε κείμενο ή φωτογραφία για να γίνει ανάλυση.');
      return;
    }

    setIsAnalyzing(true);
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }

    try {
      const res = await fetch('/api/analyze-thought', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          imageBase64: imageBase64,
          category: selectedCategory,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Αποτυχία κατά την ανάλυση.');
      }

      onSaveNote({
        text: text.trim() || '(Οπτική καταγραφή με AI ανάλυση)',
        category: selectedCategory,
        image: imageBase64,
        aiResponse: data.analysis,
        modelUsed: data.model,
      });

      // Clear input
      setText('');
      removeImage();
      showToast('Η ιδέα αναλύθηκε και αποθηκεύτηκε με AI καθοδήγηση!');
    } catch (err: any) {
      alert('Σφάλμα ανάλυσης: ' + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const showToast = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3500);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl backdrop-blur-md relative overflow-hidden transition-all duration-300 hover:border-slate-700/80">
      {/* Decorative top accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

      {/* Header and Category Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
            <Sparkles className="w-4 h-4" />
          </span>
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
            Κέντρο Γρήγορης Καταγραφής (2-Click Capture)
          </h2>
        </div>

        {/* Categories */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Tag className="w-3.5 h-3.5 text-slate-500 hidden sm:inline" />
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Textarea */}
      <div className="relative mb-3">
        <textarea
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Γράψτε τη σκέψη, την ιδέα, τον στόχο ή το πρόβλημά σας... (ή μιλήστε με το μικρόφωνο)"
          className="w-full p-4 bg-slate-950/80 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-100 placeholder-slate-500 resize-none text-sm sm:text-base leading-relaxed transition-all shadow-inner"
        />

        {isRecording && (
          <div className="absolute bottom-3 right-3 flex items-center gap-2 bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 px-3 py-1 rounded-full text-xs font-semibold animate-pulse">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Ακούω... Μιλήστε τώρα
          </div>
        )}
      </div>

      {/* Image Preview Box */}
      {imageBase64 && (
        <div className="relative mb-4 inline-flex items-center gap-3 p-2 bg-slate-950/60 border border-slate-800 rounded-xl">
          <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-700">
            <img src={imageBase64} alt="Attached Preview" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 pr-6">
            <div className="text-xs font-medium text-slate-200 truncate max-w-[220px]">
              {imageName || 'Επισυναπτόμενη εικόνα'}
            </div>
            <div className="text-[11px] text-indigo-400 mt-0.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Έτοιμη για ανάλυση με Gemini 4 Argon
            </div>
          </div>
          <button
            type="button"
            onClick={removeImage}
            title="Αφαίρεση φωτογραφίας"
            className="absolute top-2 right-2 p-1 bg-red-600/80 hover:bg-red-600 text-white rounded-full transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Speech Error Feedback */}
      {speechError && (
        <div className="mb-3 text-xs text-amber-400 bg-amber-950/30 border border-amber-800/50 p-2.5 rounded-lg flex items-center justify-between">
          <span>{speechError}</span>
          <button onClick={() => setSpeechError(null)} className="text-amber-300 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Notification Toast */}
      {statusMessage && (
        <div className="mb-3 text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 p-2.5 rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {statusMessage}
        </div>
      )}

      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
        {/* Left: Input Modalities (Camera, Voice) */}
        <div className="flex items-center gap-2 flex-wrap">
          <label className="cursor-pointer bg-slate-800 hover:bg-slate-700/80 text-slate-200 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2 transition border border-slate-700/50 shadow-sm active:scale-95">
            <Camera className="w-4 h-4 text-indigo-400" />
            <span>Φωτογραφία / Κάμερα</span>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>

          <button
            type="button"
            onClick={toggleRecording}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2 transition border shadow-sm active:scale-95 ${
              isRecording
                ? 'bg-emerald-600 text-white border-emerald-400 ring-2 ring-emerald-500/40 animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700/80 text-slate-200 border-slate-700/50'
            }`}
          >
            {isRecording ? (
              <>
                <MicOff className="w-4 h-4 text-white" />
                <span>Διακοπή (Ηχογραφεί)</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 text-emerald-400" />
                <span>Φωνή (Dictation)</span>
              </>
            )}
          </button>
        </div>

        {/* Right: Save & AI Guidance */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handleQuickSave}
            disabled={isAnalyzing}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition border border-slate-700/60 flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>Αποθήκευση</span>
          </button>

          <button
            type="button"
            onClick={handleAIAnalyzeAndSave}
            disabled={isAnalyzing}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-medium flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition border border-indigo-500/30 active:scale-95 disabled:opacity-60 flex-1 sm:flex-none"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Ανάλυση από AI...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-indigo-200" />
                <span>AI Σύνοψη & Κατεύθυνση</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
