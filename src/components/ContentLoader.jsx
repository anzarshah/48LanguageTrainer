import { useState, useEffect } from 'react';
import { generateBatch } from '../utils/api';
import {
  getConfig, setWordList, setSentenceStructures, setScriptInfo, setRoadmap,
  setContentReady, getWordList, getSentenceStructures, getScriptInfo, getRoadmap
} from '../utils/storage';

/*
 * Two parallel waves:
 *   Wave 1: wordList_1, wordList_2, wordList_3, sentenceStructures, scriptInfo  (5 parallel calls)
 *   Wave 2: roadmap_day1, roadmap_day2, roadmap_week1, roadmap_month1, roadmap_month2, roadmap_meta  (6 parallel calls)
 *
 * Each call is small (~4096 tokens max), so they won't truncate.
 * All run in parallel within each wave, cutting total time from ~4min sequential to ~30s.
 */

const WAVE1_TYPES = ['wordList_1', 'wordList_2', 'wordList_3', 'sentenceStructures', 'scriptInfo'];
const WAVE2_TYPES = ['roadmap_day1', 'roadmap_day2', 'roadmap_week1', 'roadmap_month1', 'roadmap_month2', 'roadmap_meta'];

const DISPLAY_STEPS = [
  { label: 'Top 300 frequency words', wave: 1 },
  { label: 'Sentence structures', wave: 1 },
  { label: 'Writing system & pronunciation', wave: 1 },
  { label: 'Learning roadmap', wave: 2 },
];

export default function ContentLoader({ onComplete }) {
  const config = getConfig();
  const [wave, setWave] = useState(0); // 0 = checking, 1 = wave1, 2 = wave2, 3 = done
  const [error, setError] = useState('');
  const [stepStatuses, setStepStatuses] = useState(['pending', 'pending', 'pending', 'pending']);

  useEffect(() => {
    run();
  }, []);

  const alreadyLoaded = () => {
    return getWordList().length > 0 &&
      getSentenceStructures().length > 0 &&
      getScriptInfo() !== null &&
      getRoadmap() !== null;
  };

  const run = async () => {
    // Check if everything already exists
    if (alreadyLoaded()) {
      setStepStatuses(['cached', 'cached', 'cached', 'cached']);
      setContentReady(true);
      setTimeout(() => onComplete(), 300);
      return;
    }

    // ── Wave 1: words, sentences, script (parallel) ──
    setWave(1);
    const statuses = [...stepStatuses];

    const needWave1 = getWordList().length === 0 || getSentenceStructures().length === 0 || getScriptInfo() === null;

    if (needWave1) {
      // Mark loading
      if (getWordList().length > 0) statuses[0] = 'cached';
      else statuses[0] = 'loading';
      if (getSentenceStructures().length > 0) statuses[1] = 'cached';
      else statuses[1] = 'loading';
      if (getScriptInfo() !== null) statuses[2] = 'cached';
      else statuses[2] = 'loading';
      setStepStatuses([...statuses]);

      // Only request types we actually need
      const wave1Needed = [];
      if (getWordList().length === 0) wave1Needed.push('wordList_1', 'wordList_2', 'wordList_3');
      if (getSentenceStructures().length === 0) wave1Needed.push('sentenceStructures');
      if (getScriptInfo() === null) wave1Needed.push('scriptInfo');

      try {
        const batch = await generateBatch(config.apiKey, config.language, wave1Needed);

        if (Object.keys(batch.errors || {}).length > 0) {
          const firstErr = Object.values(batch.errors)[0];
          throw new Error(firstErr);
        }

        const r = batch.results;

        // Merge word lists
        if (r.wordList_1 || r.wordList_2 || r.wordList_3) {
          const allWords = [
            ...(r.wordList_1?.data || []),
            ...(r.wordList_2?.data || []),
            ...(r.wordList_3?.data || []),
          ];
          setWordList(allWords);
          statuses[0] = 'done';
        } else if (getWordList().length > 0) {
          statuses[0] = 'cached';
        }

        if (r.sentenceStructures) {
          setSentenceStructures(r.sentenceStructures.data);
          statuses[1] = 'done';
        } else {
          statuses[1] = 'cached';
        }

        if (r.scriptInfo) {
          setScriptInfo(r.scriptInfo.data);
          statuses[2] = 'done';
        } else {
          statuses[2] = 'cached';
        }

        setStepStatuses([...statuses]);
      } catch (err) {
        statuses[0] = statuses[0] === 'loading' ? 'error' : statuses[0];
        statuses[1] = statuses[1] === 'loading' ? 'error' : statuses[1];
        statuses[2] = statuses[2] === 'loading' ? 'error' : statuses[2];
        setStepStatuses([...statuses]);
        setError('Wave 1 failed: ' + err.message);
        return;
      }
    } else {
      statuses[0] = 'cached';
      statuses[1] = 'cached';
      statuses[2] = 'cached';
      setStepStatuses([...statuses]);
    }

    // ── Wave 2: roadmap phases (parallel) ──
    setWave(2);
    const existingRoadmap = getRoadmap();

    if (existingRoadmap) {
      statuses[3] = 'cached';
      setStepStatuses([...statuses]);
    } else {
      statuses[3] = 'loading';
      setStepStatuses([...statuses]);

      try {
        const batch = await generateBatch(config.apiKey, config.language, WAVE2_TYPES);

        if (Object.keys(batch.errors || {}).length > 0) {
          const firstErr = Object.values(batch.errors)[0];
          throw new Error(firstErr);
        }

        const r = batch.results;

        // Assemble roadmap from phases
        const phases = [
          r.roadmap_day1?.data,
          r.roadmap_day2?.data,
          r.roadmap_week1?.data,
          r.roadmap_month1?.data,
          r.roadmap_month2?.data,
        ].filter(Boolean);

        const meta = r.roadmap_meta?.data || {};

        const roadmap = {
          phases,
          tips: meta.tips || [],
          coverageNote: meta.coverageNote || '',
        };

        setRoadmap(roadmap);
        statuses[3] = 'done';
        setStepStatuses([...statuses]);
      } catch (err) {
        statuses[3] = 'error';
        setStepStatuses([...statuses]);
        setError('Roadmap generation failed: ' + err.message);
        return;
      }
    }

    // Done
    setWave(3);
    setContentReady(true);
    setTimeout(() => onComplete(), 600);
  };

  const retry = () => {
    setError('');
    setStepStatuses(['pending', 'pending', 'pending', 'pending']);
    run();
  };

  const skip = () => {
    setContentReady(true);
    onComplete();
  };

  const completedCount = stepStatuses.filter(s => s === 'done' || s === 'cached').length;
  const progressPct = (completedCount / DISPLAY_STEPS.length) * 100;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: 'calc(100vh - 56px)', padding: '40px 24px',
    }}>
      <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>
          preparing your {config.language} course
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 32 }}>
          Generating personalized content with Claude AI. This only happens once — everything is cached for instant access afterward.
        </p>

        {/* Progress bar */}
        <div style={{ height: 8, background: 'rgba(26,61,43,0.08)', borderRadius: 4, overflow: 'hidden', marginBottom: 28 }}>
          <div style={{ height: '100%', width: `${progressPct}%`, background: 'var(--primary)', borderRadius: 4, transition: 'width 0.5s ease' }} />
        </div>

        {/* Steps */}
        <div style={{ textAlign: 'left' }}>
          {DISPLAY_STEPS.map((step, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
              borderBottom: i < DISPLAY_STEPS.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{ width: 24, textAlign: 'center', flexShrink: 0 }}>
                {stepStatuses[i] === 'done' && <span style={{ color: 'var(--green-tint)', fontSize: 16 }}>&#10003;</span>}
                {stepStatuses[i] === 'cached' && <span style={{ color: 'var(--accent)', fontSize: 16 }}>&#10003;</span>}
                {stepStatuses[i] === 'loading' && (
                  <div style={{ width: 16, height: 16, border: '2px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                )}
                {stepStatuses[i] === 'error' && <span style={{ color: 'var(--red-tint)', fontSize: 16 }}>&#10007;</span>}
                {stepStatuses[i] === 'pending' && <span style={{ color: 'var(--text-hint)', fontSize: 14 }}>&#9675;</span>}
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 14, fontWeight: stepStatuses[i] === 'loading' ? 600 : 400, color: stepStatuses[i] === 'pending' ? 'var(--text-hint)' : 'var(--text)' }}>
                  {step.label}
                </span>
                {stepStatuses[i] === 'cached' && <span style={{ fontSize: 11, color: 'var(--accent)', marginLeft: 8 }}>cached</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div style={{ marginTop: 24 }}>
            <div style={{ background: 'var(--red-tint-bg)', color: 'var(--red-tint)', padding: '10px 14px', borderRadius: 'var(--radius)', fontSize: 13, marginBottom: 12 }}>
              {error}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={retry}>Retry</button>
              <button className="btn btn-outline" onClick={skip}>Skip & Continue</button>
            </div>
          </div>
        )}

        {/* Done */}
        {wave === 3 && !error && (
          <div style={{ marginTop: 24, fontSize: 15, color: 'var(--green-tint)', fontWeight: 600 }}>
            All content ready. Let's begin!
          </div>
        )}

        {wave > 0 && wave < 3 && !error && (
          <p style={{ marginTop: 20, fontSize: 12, color: 'var(--text-hint)' }}>
            Running {wave === 1 ? '5' : '6'} parallel requests — much faster than sequential.
          </p>
        )}
      </div>
    </div>
  );
}
