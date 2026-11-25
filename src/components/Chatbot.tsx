import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, Bot, User, Sparkles, Zap, Brain, ShieldAlert, 
  Lightbulb, Target, Trash2, Copy, Check, Paperclip, X, Loader2, ArrowDown
} from 'lucide-react';
import { ChatMessage, ChatRole, ModelSpeed, IdeaNote } from '../types';
import { MarkdownView } from '../utils/formatMarkdown';

interface ChatbotProps {
  attachedNote: IdeaNote | null;
  onClearAttachedNote: () => void;
  onSaveIdeaFromChat?: (ideaText: string) => void;
}

const ROLES: {
  id: ChatRole;
  title: string;
  shortName: string;
  description: string;
  icon: any;
  color: string;
}[] = [
  {
    id: 'strategic_advisor',
    title: 'Στρατηγικός Σύμβουλος',
    shortName: 'Strategy',
    description: 'Επιχειρηματική στρατηγική, monetization, και κριτήρια επιτυχίας.',
    icon: Target,
    color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  },
  {
    id: 'action_coach',
    title: 'Action Coach',
    shortName: 'Action',
    description: 'Διάσπαση ιδεών σε καθημερινές μικρο-ενέργειες & πλάνο δράσης.',
    icon: Zap,
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  },
  {
    id: 'creative_brainstormer',
    title: 'Creative Brainstormer',
    shortName: 'Creative',
    description: 'Καινοτομία, out-of-the-box ιδέες, και ανατρεπτικές οπτικές γωνίες.',
    icon: Lightbulb,
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  },
  {
    id: 'devils_advocate',
    title: "Devil's Advocate",
    shortName: 'Critic',
    description: 'Εντοπισμός τυφλών σημείων, ρίσκων, και δοκιμασία αντοχής.',
    icon: ShieldAlert,
    color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  },
];

const MODELS: {
  id: ModelSpeed;
  name: string;
  modelCode: string;
  description: string;
  badge: string;
}[] = [
  {
    id: 'complex',
    name: 'Gemini 4 Argon',
    modelCode: 'gemini-4-argon',
    description: 'Για ιδιαίτερα σύνθετες εργασίες & βαθιά ανάλυση',
    badge: 'Deep Reasoning',
  },
  {
    id: 'balanced',
    name: 'Gemini 3.8 Flash',
    modelCode: 'gemini-3.8-flash',
    description: 'Για γενικές εργασίες και άριστη ισορροπία',
    badge: 'General Purpose',
  },
  {
    id: 'fast',
    name: 'Gemini 3.1 Flash Lite',
    modelCode: 'gemini-3.1-flash-lite',
    description: 'Για εργασίες που πρέπει να γίνουν άμεσα',
    badge: 'Ultra Fast',
  },
];

const QUICK_PROMPTS = [
  'Ποια είναι τα 3 μεγαλύτερα ρίσκα και πώς τα αντιμετωπίζω;',
  'Φτιάξε μου ένα πλάνο δράσης 7 ημερών βήμα προς βήμα.',
  'Πώς μπορώ να επικυρώσω (validate) αυτή την ιδέα με μηδενικό κόστος;',
  'Ποιες καινοτόμες παραλλαγές υπάρχουν για αυτή τη σκέψη;',
];

export const Chatbot: React.FC<ChatbotProps> = ({
  attachedNote,
  onClearAttachedNote,
  onSaveIdeaFromChat,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('ideastream_chat_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [
      {
        id: 'welcome-1',
        role: 'model',
        content: `Γεια σας! Είμαι ο AI Σύμβουλος του **IdeaStream**.
Μπορείτε να συζητήσετε μαζί μου οποιαδήποτε σκέψη, επιχειρηματική ιδέα ή στόχο σας.

Επιλέξτε τον κατάλληλο **Ρόλο Συμβούλου** και το μοντέλο **Gemini** παραπάνω και ρωτήστε με ό,τι θέλετε!`,
        timestamp: new Date().toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' }),
        modelUsed: 'gemini-3.8-flash',
      },
    ];
  });

  const [input, setInput] = useState('');
  const [selectedRole, setSelectedRole] = useState<ChatRole>('strategic_advisor');
  const [selectedModel, setSelectedModel] = useState<ModelSpeed>('balanced');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync chat history to localStorage
  useEffect(() => {
    localStorage.setItem('ideastream_chat_history', JSON.stringify(messages));
  }, [messages]);

  // Auto scroll to bottom
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Handle when an attached note is passed
  useEffect(() => {
    if (attachedNote) {
      const notePrompt = `Θέλω να συζητήσουμε αυτή την ιδέα από το IdeaStream:\n"${attachedNote.text}"\nΚατηγορία: ${attachedNote.category}${
        attachedNote.aiResponse ? `\nΑρχική AI Σύνοψη: ${attachedNote.aiResponse}` : ''
      }`;
      setInput(notePrompt);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  }, [attachedNote]);

  const handleSendMessage = async (textToSend?: string) => {
    const messageContent = (textToSend || input).trim();
    if (!messageContent || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent,
      timestamp: new Date().toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          role: selectedRole,
          modelPreference: selectedModel,
          attachedIdeaContext: attachedNote ? attachedNote.text : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Σφάλμα επικοινωνίας με το Gemini Chat.');
      }

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: data.message,
        timestamp: new Date().toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' }),
        modelUsed: data.model,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: `⚠️ **Σφάλμα Chat**: ${err.message || 'Δεν ήταν δυνατή η επικοινωνία με το Gemini API.'}`,
        timestamp: new Date().toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopyMessage = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleClearHistory = () => {
    if (confirm('Θέλετε να καθαρίσετε το ιστορικό της συνομιλίας;')) {
      const resetMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'model',
        content: 'Το ιστορικό καθαρίστηκε. Πώς μπορώ να σας βοηθήσω με μια νέα ιδέα;',
        timestamp: new Date().toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' }),
        modelUsed: 'gemini-3.8-flash',
      };
      setMessages([resetMsg]);
      localStorage.removeItem('ideastream_chat_history');
    }
  };

  const currentRoleInfo = ROLES.find((r) => r.id === selectedRole) || ROLES[0];
  const currentModelInfo = MODELS.find((m) => m.id === selectedModel) || MODELS[1];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col h-[750px] max-h-[85vh] overflow-hidden">
      {/* Chat Header: Roles & Model Selector */}
      <div className="bg-slate-900/95 border-b border-slate-800 p-4 flex flex-col gap-3">
        {/* Top bar with active persona info & clear button */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${currentRoleInfo.color}`}>
              <currentRoleInfo.icon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white">
                  {currentRoleInfo.title}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-indigo-300 border border-slate-700">
                  {currentModelInfo.name}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {currentRoleInfo.description}
              </p>
            </div>
          </div>

          <button
            onClick={handleClearHistory}
            className="text-xs text-slate-400 hover:text-red-400 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Εκκαθάριση Chat</span>
          </button>
        </div>

        {/* Role Selector Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mr-1 hidden sm:inline">
            Ρόλος:
          </span>
          {ROLES.map((r) => {
            const Icon = r.icon;
            const isSelected = selectedRole === r.id;
            return (
              <button
                key={r.id}
                onClick={() => setSelectedRole(r.id)}
                className={`text-xs px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5 whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-700/80'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{r.shortName}</span>
              </button>
            );
          })}
        </div>

        {/* Model Speed Selector */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/60 flex-wrap">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Brain className="w-3.5 h-3.5 text-indigo-400" />
            Μοντέλο Gemini:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {MODELS.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedModel(m.id)}
                title={m.description}
                className={`text-[11px] px-2.5 py-1 rounded-lg font-mono transition flex items-center gap-1 ${
                  selectedModel === m.id
                    ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-500/40 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-800/50'
                }`}
              >
                <span>{m.name}</span>
                <span className="text-[9px] opacity-70">({m.badge})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Attached Note Context Banner */}
      {attachedNote && (
        <div className="bg-indigo-950/40 border-b border-indigo-500/30 px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-indigo-200">
          <div className="flex items-center gap-2 truncate">
            <Paperclip className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            <span className="font-semibold text-indigo-300">Συζήτηση για ιδέα:</span>
            <span className="truncate text-slate-300 italic">"{attachedNote.text}"</span>
          </div>
          <button
            onClick={onClearAttachedNote}
            className="p-1 hover:bg-indigo-900/50 rounded-md transition text-slate-400 hover:text-white"
            title="Αποσύνδεση ιδέας από το chat"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Scrollable Message Thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex gap-3 items-start ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-sm shadow-md ${
                  isUser
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-indigo-400 border border-slate-700'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`group relative max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 shadow-md transition-all ${
                  isUser
                    ? 'bg-indigo-600 text-white rounded-tr-none'
                    : 'bg-slate-800/90 border border-slate-700/70 text-slate-200 rounded-tl-none'
                }`}
              >
                {/* Header inside bubble */}
                <div className="flex items-center justify-between gap-2 mb-1.5 opacity-70 text-[10px]">
                  <span className="font-medium">
                    {isUser ? 'Εσείς' : 'IdeaStream AI'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {msg.modelUsed && (
                      <span className="font-mono bg-slate-900/40 px-1.5 py-0.5 rounded">
                        {msg.modelUsed}
                      </span>
                    )}
                    <span>{msg.timestamp}</span>
                  </div>
                </div>

                {/* Content */}
                <div className="text-sm leading-relaxed">
                  {isUser ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <MarkdownView content={msg.content} />
                  )}
                </div>

                {/* Floating copy & save actions for bot messages */}
                {!isUser && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-3 right-3 flex items-center gap-1 bg-slate-900/90 border border-slate-700 px-2 py-0.5 rounded-full shadow-lg text-[10px] text-slate-300">
                    <button
                      onClick={() => handleCopyMessage(msg.id, msg.content)}
                      className="hover:text-white flex items-center gap-1 p-0.5"
                      title="Αντιγραφή απάντησης"
                    >
                      {copiedMsgId === msg.id ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>Αντιγραφή</span>
                    </button>
                    {onSaveIdeaFromChat && (
                      <>
                        <span className="text-slate-600">|</span>
                        <button
                          onClick={() => onSaveIdeaFromChat(msg.content)}
                          className="hover:text-indigo-400 flex items-center gap-1 p-0.5"
                          title="Αποθήκευση ως νέα ιδέα στο Feed"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Αποθήκευση</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-xl bg-slate-800 text-indigo-400 border border-slate-700 flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-slate-800/90 border border-slate-700/70 rounded-2xl rounded-tl-none p-4 flex items-center gap-2 text-xs text-indigo-300">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              <span>
                Ο {currentRoleInfo.title} ({currentModelInfo.name}) σκέφτεται...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div className="px-4 py-2 bg-slate-900/80 border-t border-slate-800 flex items-center gap-2 overflow-x-auto">
        <Sparkles className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
        {QUICK_PROMPTS.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSendMessage(prompt)}
            disabled={isLoading}
            className="text-[11px] whitespace-nowrap bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white px-3 py-1 rounded-full border border-slate-700/50 transition flex-shrink-0 disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Chat Input Bar */}
      <div className="p-3 bg-slate-950 border-t border-slate-800">
        <div className="relative flex items-end gap-2 bg-slate-900 border border-slate-700/80 rounded-2xl p-2 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500">
          <textarea
            ref={textareaRef}
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Μιλήστε με τον ${currentRoleInfo.title} (Enter για αποστολή, Shift+Enter για νέα γραμμή)...`}
            className="flex-1 bg-transparent border-0 text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none resize-none p-1.5 max-h-32 leading-relaxed"
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={!input.trim() || isLoading}
            className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white disabled:text-slate-500 rounded-xl transition shadow-md shadow-indigo-600/20 disabled:shadow-none flex-shrink-0 active:scale-95"
            title="Αποστολή μηνύματος"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
