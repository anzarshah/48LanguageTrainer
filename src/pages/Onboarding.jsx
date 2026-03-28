import { useState } from 'react';
import { validateKey } from '../utils/api';
import { setConfig } from '../utils/storage';

const LANGUAGES = [
  { name: 'Spanish', flag: '🇪🇸', script: 'Español' },
  { name: 'French', flag: '🇫🇷', script: 'Français' },
  { name: 'Japanese', flag: '🇯🇵', script: '日本語' },
  { name: 'Arabic', flag: '🇸🇦', script: 'العربية' },
  { name: 'Italian', flag: '🇮🇹', script: 'Italiano' },
  { name: 'Mandarin Chinese', flag: '🇨🇳', script: '中文' },
  { name: 'Portuguese', flag: '🇧🇷', script: 'Português' },
  { name: 'German', flag: '🇩🇪', script: 'Deutsch' },
  { name: 'Hindi', flag: '🇮🇳', script: 'हिन्दी' },
  { name: 'Korean', flag: '🇰🇷', script: '한국어' },
  { name: 'Turkish', flag: '🇹🇷', script: 'Türkçe' },
  { name: 'Swahili', flag: '🇰🇪', script: 'Kiswahili' },
];

const GOALS = ['travel', 'business', 'family roots', 'culture & film', 'relocating', 'just curious'];

export default function Onboarding({ onComplete }) {
  const [selected, setSelected] = useState('');
  const [customLang, setCustomLang] = useState('');
  const [goals, setGoals] = useState([]);
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const toggleGoal = (g) => {
    setGoals((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]);
  };

  const targetLanguage = showCustom ? customLang : selected;

  const handleSubmit = async () => {
    if (!apiKey.trim() || !targetLanguage.trim()) {
      setError('Please enter your API key and select a language.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await validateKey(apiKey.trim());
      if (!result.valid) {
        setError('Invalid API key: ' + (result.error || 'Check your key.'));
        setLoading(false);
        return;
      }

      const config = {
        apiKey: apiKey.trim(),
        language: targetLanguage.trim(),
        goals,
        setupComplete: true,
        setupDate: new Date().toISOString(),
      };
      setConfig(config);
      onComplete(config);
    } catch (err) {
      setError('Connection error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboarding">
      <h1 className="onboarding-title">which language calls to you?</h1>
      <p className="onboarding-sub">Pick your target language and begin the 48-hour sprint</p>

      {error && <div className="error-msg" style={{ maxWidth: 440, width: '100%' }}>{error}</div>}

      {/* Language grid */}
      <div className="lang-grid">
        {LANGUAGES.map((lang) => (
          <div
            key={lang.name}
            className={`lang-card ${selected === lang.name ? 'selected' : ''}`}
            onClick={() => { setSelected(lang.name); setShowCustom(false); }}
          >
            <div className="flag">{lang.flag}</div>
            <div className="name">{lang.name}</div>
            <div className="script">{lang.script}</div>
          </div>
        ))}
      </div>

      {/* Other language option */}
      <div style={{ marginBottom: 28, textAlign: 'center' }}>
        {!showCustom ? (
          <button
            className="pill"
            onClick={() => { setShowCustom(true); setSelected(''); }}
            style={{ fontSize: 13 }}
          >
            Other language...
          </button>
        ) : (
          <div style={{ maxWidth: 300, margin: '0 auto' }}>
            <input
              type="text"
              placeholder="Type your language (e.g., Vietnamese, Welsh...)"
              value={customLang}
              onChange={(e) => setCustomLang(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontSize: 14,
                fontFamily: 'var(--font-body)',
                outline: 'none',
              }}
            />
            <button
              className="pill"
              onClick={() => { setShowCustom(false); setCustomLang(''); }}
              style={{ marginTop: 8, fontSize: 12 }}
            >
              Back to grid
            </button>
          </div>
        )}
      </div>

      {/* Goals */}
      <div className="goal-section">
        <div className="goal-label">what's your motivation?</div>
        <div className="goal-pills">
          {GOALS.map((g) => (
            <button
              key={g}
              className={`pill ${goals.includes(g) ? 'selected' : ''}`}
              onClick={() => toggleGoal(g)}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* API Key */}
      <div className="api-section">
        <div className="input-group">
          <label>Anthropic API Key</label>
          <input
            type="password"
            placeholder="sk-ant-..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <p className="input-hint">
            Get your key at{' '}
            <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">
              console.anthropic.com
            </a>
            . Stays local — never sent to any server except Anthropic.
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="cta-full">
        <button
          className="btn btn-primary btn-full"
          onClick={handleSubmit}
          disabled={loading || !apiKey.trim() || !targetLanguage.trim()}
          style={{ padding: '14px 20px', fontSize: 16 }}
        >
          {loading ? 'Validating...' : 'begin the 48-hour sprint'}
        </button>
      </div>

      <p style={{ marginTop: 20, fontSize: 12, color: 'var(--text-hint)', textAlign: 'center', maxWidth: 400 }}>
        Built on Comprehensible Input, Spaced Repetition, and Output Forcing.
        <br />
        Powered by Claude AI.
      </p>
    </div>
  );
}
