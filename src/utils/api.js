const API_BASE = 'http://localhost:3001/api';

export async function validateKey(apiKey) {
  const res = await fetch(`${API_BASE}/validate-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey }),
  });
  return res.json();
}

export async function generateContent(apiKey, language, contentType, forceRefresh = false) {
  const res = await fetch(`${API_BASE}/generate-content`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, language, contentType, forceRefresh }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to generate content');
  }
  const result = await res.json();
  // The server now wraps data in { data, cacheHit, latencyMs, ... }
  return result;
}

export async function chat(apiKey, messages, system, forceRefresh = false) {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, messages, system, forceRefresh }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Chat request failed');
  }
  return res.json();
}

export async function generateBatch(apiKey, language, contentTypes, forceRefresh = false) {
  const res = await fetch(`${API_BASE}/generate-batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, language, contentTypes, forceRefresh }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Batch generation failed');
  }
  return res.json();
}

export async function getCacheStats() {
  const res = await fetch(`${API_BASE}/cache/stats`);
  return res.json();
}

export async function getCacheEntries() {
  const res = await fetch(`${API_BASE}/cache/entries`);
  return res.json();
}

export async function getCacheRequests() {
  const res = await fetch(`${API_BASE}/cache/requests`);
  return res.json();
}
