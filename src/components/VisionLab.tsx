import React, { useState, useRef } from 'react';
import { 
  Camera, Upload, Sparkles, Image as ImageIcon, CheckCircle2, 
  Copy, Check, Plus, RefreshCw, Loader2, X, FileText, Eye, Lightbulb
} from 'lucide-react';
import { IdeaNote } from '../types';
import { MarkdownView } from '../utils/formatMarkdown';

interface VisionLabProps {
  onSaveToFeed: (note: Omit<IdeaNote, 'id' | 'createdAt'>) => void;
}

const PRESET_MODES = [
  {
    id: 'general',
    title: 'Ολοκληρωμένη Ανάλυση',
    desc: 'Ανάλυση περιεχομένου, σημασίας και εξαγωγή βασικών ιδεών.',
    prompt: 'Ανάλυσε σε βάθος αυτή την εικόνα. Περίγραψε τι απεικονίζει, εξήγησε την κεντρική ιδέα και δώσε 3 στρατηγικές συμβουλές.',
  },
  {
    id: 'ocr',
    title: 'Χειρόγραφα & Whiteboard',
    desc: 'Πλήρης απομαγνητοφώνηση κειμένου, σημειώσεων και σχεδιαγραμμάτων.',
    prompt: 'Εντόπισε και απομαγνητοφώνησε όλο το κείμενο και τις χειρόγραφες σημειώσεις σε αυτή την εικόνα. Οργάνωσέ τα σε καθαρές ενότητες.',
  },
  {
    id: 'action_plan',
    title: 'Στρατηγικό Πλάνο Δράσης',
    desc: 'Μετατροπή του σχεδίου/σκίτσου σε εκτελέσιμα βήματα εργασίας.',
    prompt: 'Με βάση αυτή την εικόνα ή το σκίτσο, δημιούργησε ένα σαφές, εκτελέσιμο πλάνο δράσης (action plan) με προτεραιότητες και τεχνολογικές προτάσεις.',
  },
  {
    id: 'design_review',
    title: 'UX & Design Critique',
    desc: 'Αξιολόγηση διεπαφής, οπτικής ιεραρχίας και εμπειρίας χρήστη.',
    prompt: 'Κάνε μια επαγγελματική αξιολόγηση UI/UX design για αυτή την εικόνα. Ποια είναι τα δυνατά σημεία και ποιες είναι οι 3 κορυφαίες προτάσεις βελτίωσης;',
  },
];

export const VisionLab: React.FC<VisionLabProps> = ({ onSaveToFeed }) => {
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string>('');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [selectedPreset, setSelectedPreset] = useState<string>('general');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [modelUsed, setModelUsed] = useState<string>('gemini-4-argon');
  const [copied, setCopied] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Παρακαλώ επιλέξτε ένα αρχείο εικόνας (PNG, JPG, WebP κ.λπ.).');
      return;
    }
    setImageName(file.name);
    setAnalysisResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageBase64(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!imageBase64) {
      alert('Παρακαλώ επιλέξτε πρώτα μια φωτογραφία.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);
    setSavedSuccess(false);

    const activePreset = PRESET_MODES.find((p) => p.id === selectedPreset);
    const promptToSend = customPrompt.trim() || activePreset?.prompt || 'Ανάλυσε αυτή την εικόνα';

    try {
      const res = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          customPrompt: promptToSend,
          analysisMode: selectedPreset,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Αποτυχία ανάλυσης εικόνας.');
      }

      setAnalysisResult(data.result);
      if (data.model) {
        setModelUsed(data.model);
      }
    } catch (err: any) {
      alert('Σφάλμα κατά την ανάλυση εικόνας: ' + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveToNotebook = () => {
    if (!imageBase64 || !analysisResult) return;

    onSaveToFeed({
      text: `[Οπτική Ανάλυση: ${imageName || 'Εικόνα'}]\n${customPrompt ? `Ερώτημα: "${customPrompt}"` : ''}`,
      category: 'Επιχειρηματική Ιδέα',
      image: imageBase64,
      aiResponse: analysisResult,
      modelUsed: modelUsed,
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 4000);
  };

  const handleCopy = () => {
    if (!analysisResult) return;
    navigator.clipboard.writeText(analysisResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clearImage = () => {
    setImageBase64(null);
    setImageName('');
    setAnalysisResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white shadow-lg shadow-indigo-600/30">
            <Eye className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">
                Οπτική Ανάλυση & Κατανόηση Εικόνων
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                Gemini 4 Argon
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Ανεβάστε φωτογραφίες από χειρόγραφες σημειώσεις, whiteboards, διαγράμματα ή προϊόντα για άμεση βαθιά ανάλυση.
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Upload Area & Mode Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Dropzone / Preview */}
        <div className="lg:col-span-6 flex flex-col gap-3">
          {!imageBase64 ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-indigo-500 bg-slate-950/60 hover:bg-slate-950 rounded-2xl p-8 flex flex-col items-center justify-center gap-4 cursor-pointer transition text-center min-h-[280px]"
            >
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <Upload className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-200">
                  Σύρετε και αφήστε την εικόνα σας εδώ
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  ή κάντε κλικ για επιλογή από τη συσκευή σας (JPG, PNG, WebP)
                </p>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </div>
          ) : (
            <div className="relative bg-slate-950 rounded-2xl border border-slate-800 p-2 flex flex-col items-center">
              <div className="relative max-h-80 w-full overflow-hidden rounded-xl bg-slate-900 flex items-center justify-center">
                <img
                  src={imageBase64}
                  alt="Upload preview"
                  className="max-h-80 object-contain rounded-lg"
                />
              </div>
              <div className="w-full flex items-center justify-between mt-2 px-2 text-xs text-slate-400">
                <span className="truncate max-w-[200px]">{imageName}</span>
                <button
                  onClick={clearImage}
                  className="text-red-400 hover:text-red-300 flex items-center gap-1 transition"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Αφαίρεση</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Modes & Custom Prompt */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
              Επιλέξτε Στόχο Ανάλυσης
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESET_MODES.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => {
                    setSelectedPreset(mode.id);
                    setCustomPrompt(mode.prompt);
                  }}
                  className={`text-left p-3 rounded-xl border transition flex flex-col gap-1 ${
                    selectedPreset === mode.id
                      ? 'bg-indigo-950/40 border-indigo-500 text-white shadow-md'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    {mode.title}
                  </span>
                  <span className="text-[11px] text-slate-400 leading-snug">
                    {mode.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Prompt Textarea */}
          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">
              Εξειδικευμένο Ερώτημα (Προαιρετικό)
            </label>
            <textarea
              rows={3}
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Π.χ. Εξήγησε το διάγραμμα στη δεξιά γωνία ή δώσε μου το κόστος υλοποίησης..."
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
            />
          </div>

          {/* Analyze Button */}
          <button
            onClick={handleAnalyze}
            disabled={!imageBase64 || isAnalyzing}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 active:scale-[0.99]"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Ανάλυση εικόνας με Gemini 4 Argon...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Εκτέλεση Ανάλυσης Εικόνας (Gemini 4 Argon)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Analysis Result Display */}
      {analysisResult && (
        <div className="bg-slate-950 border border-indigo-500/30 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded-lg">
                <FileText className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-bold text-white">
                Αποτέλεσμα Οπτικής Ανάλυσης
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {modelUsed}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Αντιγράφηκε' : 'Αντιγραφή'}</span>
              </button>

              <button
                onClick={handleSaveToNotebook}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 transition shadow-sm"
              >
                {savedSuccess ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Αποθηκεύτηκε στο Feed!</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Αποθήκευση στο Notebook</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="text-sm leading-relaxed text-slate-200">
            <MarkdownView content={analysisResult} />
          </div>
        </div>
      )}
    </div>
  );
};
