import express from 'express';
import cors from 'cors';
import { llmCall } from './llm.js';
import { cache } from './cache.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const SYSTEM = 'You are a linguistics and language learning expert. Always respond with valid JSON only. No markdown formatting, no code blocks, no explanations outside the JSON. Keep responses concise.';

// ─── Robust JSON parser with repair ───
function parseJSON(text) {
  let t = text.trim();
  // Strip markdown fences
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  // Try direct parse
  try { return JSON.parse(t); } catch {}

  // Repair: try closing unclosed strings/arrays/objects
  const repairs = [
    () => t + '"}]',
    () => t + '"]',
    () => t + '"}]}',
    () => t + '"]}',
    () => t + '}]',
    () => t + ']',
    () => t + '}',
    () => t + '"}]}]}',
    () => t + '"}]}}',
    () => t + '"}]}}}',
  ];
  for (const repair of repairs) {
    try { return JSON.parse(repair()); } catch {}
  }
  // Last resort: find the last valid array/object boundary
  for (let i = t.length - 1; i > 0; i--) {
    if (t[i] === '}' || t[i] === ']') {
      try { return JSON.parse(t.slice(0, i + 1)); } catch {}
    }
  }
  throw new Error('Could not parse JSON response');
}

// ─── Prompt builders ───
function getPrompts(language) {
  return {
    wordList_1: `Generate words ranked 1-100 of the most frequently used words in ${language}. Return ONLY a JSON array of objects: { "rank": number, "word": "${language} script", "romanization": "if applicable else empty", "partOfSpeech": "Pronoun|Verb|Noun|Adjective|Conjunction|Number|Question|Adverb|Preposition|Other", "english": "meaning" }. No markdown.`,

    wordList_2: `Generate words ranked 101-200 of the most frequently used words in ${language}. Same format: JSON array of { "rank", "word", "romanization", "partOfSpeech", "english" }. No markdown.`,

    wordList_3: `Generate words ranked 201-300 of the most frequently used words in ${language}. Same format: JSON array of { "rank", "word", "romanization", "partOfSpeech", "english" }. No markdown.`,

    sentenceStructures: `Generate the 20 most common sentence structures in ${language} for beginners. JSON array of: { "id": 1-20, "pattern": "${language}", "romanization": "", "english": "", "example": "${language}", "exampleRomanization": "", "exampleEnglish": "", "notes": "brief" }. No markdown.`,

    scriptInfo: `Analyze the writing system of ${language}. JSON object: { "usesLatinScript": bool, "scriptName": "", "characters": [{ "char": "", "romanization": "", "ipa": "", "exampleWord": "", "exampleMeaning": "" }], "notes": "brief", "isRTL": bool, "hasTones": bool, "hasGender": bool, "hasHonorifics": bool, "pronunciationTips": ["5-8 tips"] }. Include ALL basic characters. No markdown.`,

    roadmap_day1: `Create Day 1 of a ${language} learning roadmap. JSON object: { "id": "day1", "title": "Day 1 — Foundation", "time": "4-6 hours", "color": "#1A3D2B", "steps": [{ "number": 1, "title": "", "description": "specific to ${language}", "tags": ["vocab"|"listen"|"speak"|"write"|"review"], "tool": "flashcards|wordlist|script|journal|conversation|progress|null", "toolPrompt": "brief" }] }. Include 6-7 steps: understanding acquisition, script/alphabet, top 200 words flashcards, sentence structures, beginner videos, evening journal. No markdown.`,

    roadmap_day2: `Create Day 2 of a ${language} learning roadmap. JSON object: { "id": "day2", "title": "Day 2 — First Conversations", "time": "4-5 hours", "color": "#2E7D52", "steps": [{ "number": 1, "title": "", "description": "", "tags": [], "tool": null, "toolPrompt": "" }] }. Include 5-6 steps: flashcard review, next 100 words, speaking practice with AI, listening practice, progress tracking. No markdown.`,

    roadmap_week1: `Create Week 1 phase of a ${language} learning roadmap. JSON object: { "id": "week1", "title": "Week 1 — Building Momentum", "time": "1-2 hrs/day", "color": "#C8A26E", "steps": [{ "number": 1, "title": "", "description": "", "tags": [], "tool": null, "toolPrompt": "" }] }. Include 4-5 steps: daily routine, expand to 500 words, grammar patterns, cultural content. No markdown.`,

    roadmap_month1: `Create Month 1 phase of a ${language} learning roadmap. JSON object: { "id": "month1", "title": "Month 1 — Deepening Skills", "time": "1-2 hrs/day", "color": "#5A5247", "steps": [{ "number": 1, "title": "", "description": "", "tags": [], "tool": null, "toolPrompt": "" }] }. Include 4 steps: intermediate content, conversation practice, regular writing, 1000 word target. No markdown.`,

    roadmap_month2: `Create Month 2+ phase of a ${language} learning roadmap. JSON object: { "id": "month2plus", "title": "Month 2+ — Toward Fluency", "time": "daily practice", "color": "#8A7E70", "steps": [{ "number": 1, "title": "", "description": "", "tags": [], "tool": null, "toolPrompt": "" }] }. Include 4 steps: native content, advanced conversation, specialized vocabulary, fluency building. No markdown.`,

    roadmap_meta: `Provide 5 specific tips for learning ${language} and a note about how the top 300 words cover everyday conversation. JSON: { "tips": ["5 ${language}-specific tips"], "coverageNote": "brief note" }. No markdown.`,
  };
}

// ─── Chat endpoint ───
app.post('/api/chat', async (req, res) => {
  const { apiKey, messages, system, forceRefresh } = req.body;
  if (!apiKey) return res.status(400).json({ error: 'API key required' });

  try {
    const result = await llmCall({ apiKey, system, messages, forceRefresh: forceRefresh || false });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Helper: run a single prompt and parse JSON ───
async function runAndParse(apiKey, language, contentType, forceRefresh) {
  const prompts = getPrompts(language);
  const prompt = prompts[contentType];
  if (!prompt) throw new Error(`Unknown content type: ${contentType}`);

  const result = await llmCall({
    apiKey, model: 'claude-sonnet-4-6', system: SYSTEM, prompt,
    params: { max_tokens: 4096 },
    forceRefresh: forceRefresh || false,
  });
  return { data: parseJSON(result.content), cacheHit: result.cacheHit, latencyMs: result.latencyMs, estimatedCost: result.estimatedCost, inputTokens: result.inputTokens, outputTokens: result.outputTokens };
}

// ─── Compound types (split internally, run parallel, merge) ───
const COMPOUND_TYPES = {
  wordList: {
    subtypes: ['wordList_1', 'wordList_2', 'wordList_3'],
    merge: (results) => [...(results.wordList_1?.data || []), ...(results.wordList_2?.data || []), ...(results.wordList_3?.data || [])],
  },
  roadmapContent: {
    subtypes: ['roadmap_day1', 'roadmap_day2', 'roadmap_week1', 'roadmap_month1', 'roadmap_month2', 'roadmap_meta'],
    merge: (results) => ({
      phases: [results.roadmap_day1?.data, results.roadmap_day2?.data, results.roadmap_week1?.data, results.roadmap_month1?.data, results.roadmap_month2?.data].filter(Boolean),
      tips: results.roadmap_meta?.data?.tips || [],
      coverageNote: results.roadmap_meta?.data?.coverageNote || '',
    }),
  },
};

// ─── Single content generation ───
app.post('/api/generate-content', async (req, res) => {
  const { apiKey, language, contentType, forceRefresh } = req.body;
  if (!apiKey) return res.status(400).json({ error: 'API key required' });

  // Check if it's a compound type
  const compound = COMPOUND_TYPES[contentType];
  if (compound) {
    try {
      const subResults = {};
      const promises = compound.subtypes.map(async (sub) => {
        subResults[sub] = await runAndParse(apiKey, language, sub, forceRefresh || false);
      });
      await Promise.all(promises);
      const merged = compound.merge(subResults);
      res.json({ data: merged, cacheHit: false, latencyMs: 0, estimatedCost: 0 });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  // Simple type
  try {
    const result = await runAndParse(apiKey, language, contentType, forceRefresh || false);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Batch content generation (parallel) ───
app.post('/api/generate-batch', async (req, res) => {
  const { apiKey, language, contentTypes, forceRefresh } = req.body;
  if (!apiKey) return res.status(400).json({ error: 'API key required' });
  if (!Array.isArray(contentTypes) || contentTypes.length === 0) {
    return res.status(400).json({ error: 'contentTypes must be a non-empty array' });
  }

  const prompts = getPrompts(language);
  const results = {};
  const errors = {};

  // Run all in parallel
  const promises = contentTypes.map(async (type) => {
    const prompt = prompts[type];
    if (!prompt) {
      errors[type] = `Unknown content type: ${type}`;
      return;
    }

    try {
      const result = await llmCall({
        apiKey, model: 'claude-sonnet-4-6', system: SYSTEM, prompt,
        params: { max_tokens: 4096 },
        forceRefresh: forceRefresh || false,
      });
      results[type] = {
        data: parseJSON(result.content),
        cacheHit: result.cacheHit,
        latencyMs: result.latencyMs,
        estimatedCost: result.estimatedCost,
      };
    } catch (err) {
      errors[type] = err.message;
    }
  });

  await Promise.all(promises);
  res.json({ results, errors });
});

// ─── Validate API key ───
app.post('/api/validate-key', async (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey) return res.json({ valid: false, error: 'No key provided' });

  try {
    await llmCall({
      apiKey, prompt: 'Respond with the single word: ok',
      params: { max_tokens: 10 }, forceRefresh: true,
    });
    res.json({ valid: true });
  } catch (err) {
    res.json({ valid: false, error: err.message });
  }
});

// ─── Cache endpoints ───
app.get('/api/cache/stats', (req, res) => res.json(cache.getStats()));
app.get('/api/cache/entries', (req, res) => res.json(cache.getAllCached()));
app.get('/api/cache/requests', (req, res) => res.json(cache.getRecentRequests()));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Immerse48 server running on http://localhost:${PORT}`);
});
