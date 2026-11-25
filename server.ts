import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '35mb' }));

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  return new GoogleGenAI({
    apiKey: apiKey || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// Model selection helper based on requirements
// "Use gemini-4-argon for particularly complex tasks, gemini-3.8-flash for general tasks, and gemini-3.1-flash-lite for tasks that should happen fast."
// "Allow app users to upload a photo and then analyze it using Gemini. You MUST add image understanding to the app using model gemini-4-argon"
const getModelForTask = (preference?: string, hasImage?: boolean): string => {
  if (hasImage) {
    return 'gemini-4-argon';
  }
  switch (preference) {
    case 'complex':
      return 'gemini-4-argon';
    case 'fast':
      return 'gemini-3.1-flash-lite';
    case 'balanced':
    default:
      return 'gemini-3.8-flash';
  }
};

// Health and capability check
app.get('/api/health', (_req: Request, res: Response) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY);
  res.json({
    status: 'ok',
    hasApiKey: hasKey,
    models: {
      complex: 'gemini-4-argon',
      general: 'gemini-3.8-flash',
      fast: 'gemini-3.1-flash-lite',
      imageAnalysis: 'gemini-4-argon',
    },
  });
});

// Thought analysis endpoint (with optional image)
app.post('/api/analyze-thought', async (req: Request, res: Response) => {
  try {
    const { text = '', imageBase64, category = 'Γενική Σκέψη' } = req.body;

    if (!text && !imageBase64) {
      res.status(400).json({ error: 'Απαιτείται κείμενο ή φωτογραφία για ανάλυση.' });
      return;
    }

    const ai = getGeminiClient();
    const modelToUse = imageBase64 ? 'gemini-4-argon' : 'gemini-3.8-flash';

    const systemInstruction = `
Είσαι ο IdeaStream AI Executive Coach & Strategic Analyst.
Ο ρόλος σου είναι να αναλύεις γρήγορες σκέψεις, επιχειρηματικές ιδέες, προβλήματα και στόχους, μετατρέποντάς τα σε δομημένη στρατηγική και ξεκάθαρα επόμενα βήματα.

Δώσε απάντηση στην ελληνική γλώσσα με την εξής δομή (σε καθαρό Markdown):
### 🎯 Σύνοψη & Κεντρική Ιδέα
(1-2 περιεκτικές προτάσεις που αποτυπώνουν την ουσία)

### 💡 Στρατηγική Αξιολόγηση & Ευκαιρίες
(Σύντομη ανάλυση αξίας, δυνατά σημεία και τι κάνει την ιδέα ξεχωριστή)

### ⚡ Άμεσα Επόμενα Βήματα (Action Plan)
- [ ] Βήμα 1: (άμεση ενέργεια για σήμερα/αύριο)
- [ ] Βήμα 2: (ενέργεια υλοποίησης)
- [ ] Βήμα 3: (τρόπος μέτρησης αποτελέσματος)

### ⚠️ Πιθανά Εμπόδια & Λύση
(Ένα σημαντικό ρίσκο ή πρόκληση και πώς ξεπερνιέται)
`;

    const promptText = `Κατηγορία: ${category}\nΠεριεχόμενο: "${text || '(Χρήστης ανέβασε οπτικό υλικό)'}"`;
    const parts: any[] = [{ text: promptText }];

    if (imageBase64) {
      const mimeMatch = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
      if (mimeMatch) {
        parts.push({
          inlineData: {
            mimeType: mimeMatch[1],
            data: mimeMatch[2],
          },
        });
      }
    }

    let responseText: string | undefined;
    let usedModel = modelToUse;

    try {
      const response = await ai.models.generateContent({
        model: modelToUse,
        contents: { parts },
        config: { systemInstruction },
      });
      responseText = response.text;
    } catch (primaryErr: any) {
      // If gemini-4-argon encounters quota or auth issues, fallback to gemini-3.8-flash
      if (modelToUse === 'gemini-4-argon') {
        console.warn('Falling back from gemini-4-argon to gemini-3.8-flash due to error:', primaryErr.message);
        usedModel = 'gemini-3.8-flash';
        const fallbackResponse = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: { parts },
          config: { systemInstruction },
        });
        responseText = fallbackResponse.text;
      } else {
        throw primaryErr;
      }
    }

    res.json({
      success: true,
      analysis: responseText,
      model: usedModel,
    });
  } catch (err: any) {
    console.error('Error in analyze-thought:', err);
    res.status(500).json({
      error: err.message || 'Σφάλμα κατά την επικοινωνία με το Gemini API.',
    });
  }
});

// Dedicated Image Understanding endpoint with gemini-4-argon
app.post('/api/analyze-image', async (req: Request, res: Response) => {
  try {
    const { imageBase64, customPrompt, analysisMode = 'deep' } = req.body;

    if (!imageBase64) {
      res.status(400).json({ error: 'Απαιτείται εικόνα για ανάλυση.' });
      return;
    }

    const ai = getGeminiClient();
    const mimeMatch = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
    if (!mimeMatch) {
      res.status(400).json({ error: 'Μη έγκυρη μορφή εικόνας base64.' });
      return;
    }

    const mimeType = mimeMatch[1];
    const data = mimeMatch[2];

    const systemInstruction = `
Είσαι ένας προηγμένος αναλυτής εικόνων και οπτικής τεκμηρίωσης (Gemini 4 Argon Image Specialist).
Η αποστολή σου είναι να αναλύεις οπτικό υλικό (χειρόγραφες σημειώσεις, πίνακες whiteboard, σχεδιαγράμματα, οθόνες, πρωτότυπα, περιβάλλοντα ή προϊόντα).
Δώσε απάντηση στα Ελληνικά με εξαιρετική σαφήνεια, αναγνωρίζοντας οποιοδήποτε κείμενο, σχήματα, διαγράμματα ή στοιχεία.
Δομή απάντησης:
1. 🔍 **Οπτική Περιγραφή & Αποκρυπτογράφηση**: Τι ακριβώς φαίνεται στην εικόνα (συμπεριλαμβανομένης πλήρους απομαγνητοφώνησης τυχόν κειμένου ή σημειώσεων).
2. 💡 **Κύρια Συμπεράσματα & Αξιολόγηση**: Τι σημαίνει αυτό το περιεχόμενο, ποια είναι τα βασικά concepts.
3. 🚀 **Εκτελέσιμες Προτάσεις (Action Plan)**: Πώς μπορεί ο χρήστης να προχωρήσει με βάση αυτό το οπτικό ερέθισμα.
`;

    const userQuery = customPrompt?.trim() || 'Κάνε πλήρη ανάλυση αυτής της εικόνας: εντόπισε κείμενο/σημειώσεις, ιδέες και δώσε προτάσεις υλοποίησης.';

    const parts = [
      {
        inlineData: {
          mimeType,
          data,
        },
      },
      {
        text: userQuery,
      },
    ];

    let usedModel = 'gemini-4-argon';
    let responseText: string | undefined;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-argon',
        contents: { parts },
        config: { systemInstruction },
      });
      responseText = response.text;
    } catch (err: any) {
      console.warn('gemini-4-argon image call fallback triggered:', err.message);
      usedModel = 'gemini-3.8-flash';
      const fallback = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: { parts },
        config: { systemInstruction },
      });
      responseText = fallback.text;
    }

    res.json({
      success: true,
      result: responseText,
      model: usedModel,
    });
  } catch (err: any) {
    console.error('Error in analyze-image:', err);
    res.status(500).json({
      error: err.message || 'Αποτυχία ανάλυσης εικόνας.',
    });
  }
});

// Multi-turn Chatbot endpoint with role-based personas and model selection
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const {
      messages = [],
      role = 'strategic_advisor',
      modelPreference = 'balanced',
      attachedIdeaContext,
    } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Δεν βρέθηκαν μηνύματα στη συνομιλία.' });
      return;
    }

    const ai = getGeminiClient();

    // Determine model according to feature requirements:
    // gemini-4-argon for complex tasks, gemini-3.8-flash for general, gemini-3.1-flash-lite for fast
    let targetModel = getModelForTask(modelPreference);

    // Persona-based system instructions
    let personaPrompt = '';
    switch (role) {
      case 'action_coach':
        personaPrompt = `Είσαι ο Action & Productivity Coach στο IdeaStream.
Στόχος σου είναι να διασπάς μεγάλες και χαοτικές ιδέες σε καθημερινά, απόλυτα υλοποιήσιμα μικρά βήματα (micro-actions).
Είσαι ενθαρρυντικός, εστιασμένος στη δράση (no excuses, practical solutions) και στις προθεσμίες.`;
        break;
      case 'creative_brainstormer':
        personaPrompt = `Είσαι ο Creative Innovation Partner στο IdeaStream.
Στόχος σου είναι η παραγωγή ανατρεπτικών ιδεών, πρωτότυπων οπτικών γωνιών, out-of-the-box λύσεων και καινοτόμων συνδυασμών.
Χρησιμοποίησε τεχνικές lateral thinking και SCAMPER.`;
        break;
      case 'devils_advocate':
        personaPrompt = `Είσαι ο Devil's Advocate / Risk Analyst στο IdeaStream.
Ο ρόλος σου είναι να εντοπίζεις ευγενικά αλλά αυστηρά τα "τυφλά σημεία", τα ρίσκα, τα πιθανά εμπόδια αγοράς και τις παραδοχές που ίσως αποτύχουν.
Βοήθησε τον χρήστη να θωρακίσει την ιδέα του πριν προχωρήσει.`;
        break;
      case 'strategic_advisor':
      default:
        personaPrompt = `Είσαι ο Strategic Business & Life Advisor στο IdeaStream.
Συνδυάζεις στρατηγική σκέψη, επιχειρηματική οξυδέρκεια και πρακτικό σχεδιασμό.
Απαντάς με δομημένες προτάσεις, σαφή κριτήρια απόφασης και υψηλή προστιθέμενη αξία.`;
        break;
    }

    let systemInstruction = `${personaPrompt}
Απάντα πάντα στην ελληνική γλώσσα με καθαρή, κομψή μορφοποίηση Markdown (λίστες, bold λέξεις κλειδιά).
Εάν ο χρήστης ρωτήσει στα αγγλικά, απάντησε στα αγγλικά, αλλιώς διατήρησε τα ελληνικά.`;

    if (attachedIdeaContext) {
      systemInstruction += `\n\n[ΤΡΕΧΟΥΣΑ ΙΔΕΑ ΑΠΟ ΤΟ NOTEBOOK ΤΟΥ ΧΡΗΣΤΗ ΠΡΟΣ ΣΥΖΗΤΗΣΗ]:
${attachedIdeaContext}`;
    }

    // Format contents for @google/genai generateContent
    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    let usedModel = targetModel;
    let replyText: string | undefined;

    try {
      const response = await ai.models.generateContent({
        model: targetModel,
        contents,
        config: { systemInstruction },
      });
      replyText = response.text;
    } catch (modelErr: any) {
      if (targetModel === 'gemini-4-argon') {
        console.warn('Fallback from gemini-4-argon in chat to gemini-3.8-flash:', modelErr.message);
        usedModel = 'gemini-3.8-flash';
        const fallback = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents,
          config: { systemInstruction },
        });
        replyText = fallback.text;
      } else {
        throw modelErr;
      }
    }

    res.json({
      success: true,
      message: replyText,
      model: usedModel,
    });
  } catch (err: any) {
    console.error('Error in /api/chat:', err);
    res.status(500).json({
      error: err.message || 'Σφάλμα κατά την αποστολή μηνύματος στο Chatbot.',
    });
  }
});

app.use((err: any, _req: Request, res: Response, _next: any) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: err?.message || 'Internal Server Error' });
});

async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`  ➜  Local:   http://localhost:${PORT}/`);
    console.log(`  ➜  Network: http://0.0.0.0:${PORT}/`);
  });
}

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});

