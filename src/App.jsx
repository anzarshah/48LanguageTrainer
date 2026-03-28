import { useState } from 'react';
import { getConfig } from './utils/storage';
import { storage, getContentReady } from './utils/storage';
import Onboarding from './pages/Onboarding';
import ContentLoader from './components/ContentLoader';
import Dashboard from './pages/Dashboard';
import Speaking from './pages/Speaking';
import Roadmap from './pages/Roadmap';
import Flashcards from './pages/Flashcards';
import WordListPage from './pages/WordList';
import ScriptTrainer from './pages/ScriptTrainer';
import Journal from './pages/Journal';
import Conversation from './pages/Conversation';
import Progress from './pages/Progress';

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'speaking', label: 'Speaking' },
  { id: 'roadmap', label: 'Roadmap' },
  { id: 'flashcards', label: 'Flashcards' },
  { id: 'wordlist', label: 'Word List' },
  { id: 'script', label: 'Script' },
  { id: 'journal', label: 'Journal' },
  { id: 'conversation', label: 'Chat' },
  { id: 'progress', label: 'Progress' },
];

function App() {
  const [config, setConfigState] = useState(getConfig());
  const [contentReady, setContentReadyState] = useState(getContentReady());
  const [page, setPage] = useState('dashboard');

  const handleSetupComplete = (newConfig) => {
    setConfigState(newConfig);
    // Content will be loaded by ContentLoader next
  };

  const handleContentReady = () => {
    setContentReadyState(true);
  };

  const handleReset = () => {
    if (window.confirm('This will clear all data and reset the app. Continue?')) {
      storage.clear();
      setConfigState({ apiKey: '', language: '', setupComplete: false });
      setContentReadyState(false);
      setPage('dashboard');
    }
  };

  // Screen 1: Onboarding (no setup yet)
  if (!config.setupComplete) {
    return (
      <>
        <div className="top-nav">
          <span className="top-nav-logo">Immerse48</span>
        </div>
        <Onboarding onComplete={handleSetupComplete} />
      </>
    );
  }

  // Screen 1.5: Content generation (runs once after onboarding)
  if (!contentReady) {
    return (
      <>
        <div className="top-nav">
          <span className="top-nav-logo">Immerse48</span>
          <div className="top-nav-right">
            <span className="nav-lang-badge">{config.language}</span>
          </div>
        </div>
        <ContentLoader onComplete={handleContentReady} />
      </>
    );
  }

  // Main app
  const navigate = (pageId) => setPage(pageId);

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <Dashboard onNavigate={navigate} />;
      case 'speaking': return <Speaking onNavigate={navigate} />;
      case 'roadmap': return <Roadmap onNavigate={(route) => navigate(route.replace('/', ''))} />;
      case 'flashcards': return <Flashcards />;
      case 'wordlist': return <WordListPage />;
      case 'script': return <ScriptTrainer />;
      case 'journal': return <Journal />;
      case 'conversation': return <Conversation />;
      case 'progress': return <Progress />;
      default: return <Dashboard onNavigate={navigate} />;
    }
  };

  return (
    <>
      <div className="top-nav">
        <span className="top-nav-logo">Immerse48</span>
        <div className="top-nav-tabs">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              className={`nav-tab ${page === id ? 'active' : ''}`}
              onClick={() => setPage(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="top-nav-right">
          <span className="nav-lang-badge">{config.language}</span>
          <button className="nav-reset" onClick={handleReset}>Reset</button>
        </div>
      </div>
      <div className="main">
        {renderPage()}
      </div>
    </>
  );
}

export default App;
