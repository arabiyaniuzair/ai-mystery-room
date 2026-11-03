import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { AccountModal } from './components/AccountModal';
import { CaseHistoryModal } from './components/CaseHistoryModal';
import { ScoreHistoryModal } from './components/ScoreHistoryModal';
import { HowToPlayModal } from './components/HowToPlayModal';
import { CaseGenerator } from './components/CaseGenerator';
import { InvestigationRoom } from './components/InvestigationRoom';
import { AccusationModal } from './components/AccusationModal';
import { DebriefModal } from './components/DebriefModal';
import { WelcomeModal } from './components/WelcomeModal';
import { ChatbotSentinel } from './components/ChatbotSentinel';
import { mysteryAPI } from './services/api';
import { AlertCircle } from 'lucide-react';

export function App() {
  const { user, updateStats, isAuthenticated, dismissWelcome } = useAuth();

  // State
  const [activeCase, setActiveCase] = useState(null);
  const [loadingCase, setLoadingCase] = useState(false);
  const [authModal, setAuthModal] = useState({ isOpen: false, mode: 'login' });
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [scoreHistoryOpen, setScoreHistoryOpen] = useState(false);
  const [howToPlayOpen, setHowToPlayOpen] = useState(false);
  const [accusationModalOpen, setAccusationModalOpen] = useState(false);
  const [preselectedSuspectId, setPreselectedSuspectId] = useState(null);
  const [submittingAccusation, setSubmittingAccusation] = useState(false);
  const [debriefModalOpen, setDebriefModalOpen] = useState(false);
  const [resolutionData, setResolutionData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // CRITICAL SECURITY FIX: Clear all user-specific active investigation state on logout or account switch
  useEffect(() => {
    setActiveCase(null);
    setResolutionData(null);
    setErrorMessage('');
    setScoreHistoryOpen(false);
    setHistoryModalOpen(false);
    setAccountModalOpen(false);
    setAccusationModalOpen(false);
  }, [user?.id, user?.username]);

  // Generate Case handler with custom or auto-generated Mystery Name
  const handleGenerateCase = async (mysteryName, scenarioPrompt, difficulty) => {
    if (!isAuthenticated) {
      setAuthModal({ isOpen: true, mode: 'login' });
      setErrorMessage('Please sign in or create an investigator dossier to generate a mystery.');
      return;
    }

    setLoadingCase(true);
    setErrorMessage('');
    try {
      const res = await mysteryAPI.generateCase(mysteryName, scenarioPrompt, difficulty);
      setActiveCase(res.data.caseData);
    } catch (err) {
      console.error('Case generation failed:', err);
      setErrorMessage(
        err.response?.data?.message || 'Failed to initialize the investigation. Please try again.'
      );
    } finally {
      setLoadingCase(false);
    }
  };

  // Submit Accusation
  const handleSubmitAccusation = async (suspectId, playerNotes) => {
    if (!activeCase) return;
    setSubmittingAccusation(true);
    try {
      const res = await mysteryAPI.accuse(activeCase._id, suspectId, playerNotes);
      setResolutionData(res.data);
      
      // Update both lifetime stats and current login session score
      if (res.data.userStats || res.data.currentSession) {
        updateStats(res.data.userStats, res.data.currentSession);
      }
      
      setAccusationModalOpen(false);
      setDebriefModalOpen(true);
    } catch (err) {
      console.error('Accusation failed:', err);
      alert(err.response?.data?.message || 'Failed to submit accusation.');
    } finally {
      setSubmittingAccusation(false);
    }
  };

  const handleResetCase = () => {
    setActiveCase(null);
    setResolutionData(null);
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-[#080B11] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Navigation Bar */}
      <Navbar
        onOpenAuth={(mode) => setAuthModal({ isOpen: true, mode })}
        onOpenAccount={() => setAccountModalOpen(true)}
        onOpenHistory={() => setHistoryModalOpen(true)}
        onOpenScoreHistory={() => setScoreHistoryOpen(true)}
        onOpenHowToPlay={() => setHowToPlayOpen(true)}
        onResetCase={handleResetCase}
        isInvestigating={!!activeCase}
      />

      {/* Main Container */}
      <main className="flex-1 pb-16">
        {errorMessage && (
          <div className="max-w-4xl mx-auto px-4 mt-6">
            <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs sm:text-sm flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {!activeCase ? (
          <CaseGenerator
            onGenerate={handleGenerateCase}
            loading={loadingCase}
            onOpenHowToPlay={() => setHowToPlayOpen(true)}
          />
        ) : (
          <InvestigationRoom
            caseData={activeCase}
            onOpenAccusation={(suspectId) => {
              setPreselectedSuspectId(suspectId || null);
              setAccusationModalOpen(true);
            }}
            onBackToGenerator={handleResetCase}
          />
        )}
      </main>

      {/* Accusation Modal */}
      {activeCase && (
        <AccusationModal
          isOpen={accusationModalOpen}
          onClose={() => setAccusationModalOpen(false)}
          suspects={activeCase.suspects}
          preselectedSuspectId={preselectedSuspectId}
          onSubmitAccusation={handleSubmitAccusation}
          submitting={submittingAccusation}
        />
      )}

      {/* Debrief / Verdict Modal with "Solve New Mystery" */}
      <DebriefModal
        isOpen={debriefModalOpen}
        onClose={() => setDebriefModalOpen(false)}
        resolutionData={resolutionData}
        onPlayAgain={handleResetCase}
      />

      {/* How to Play / Field Guide Modal */}
      <HowToPlayModal
        isOpen={howToPlayOpen}
        onClose={() => setHowToPlayOpen(false)}
        onStartPlaying={() => setHowToPlayOpen(false)}
      />

      {/* Score History Modal (Session & Lifetime Table) */}
      <ScoreHistoryModal
        isOpen={scoreHistoryOpen}
        onClose={() => setScoreHistoryOpen(false)}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={authModal.isOpen}
        initialMode={authModal.mode}
        onClose={() => setAuthModal({ isOpen: false, mode: 'login' })}
      />

      {/* Account Management & Password Security Modal */}
      <AccountModal
        isOpen={accountModalOpen}
        onClose={() => setAccountModalOpen(false)}
      />

      {/* Case Archives / History Modal */}
      <CaseHistoryModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
      />

      {/* First-Time Registration Welcome Modal */}
      <WelcomeModal
        isOpen={Boolean(user && user.hasSeenWelcome === false)}
        onClose={dismissWelcome}
        username={user?.username}
        onOpenGuide={() => setHowToPlayOpen(true)}
      />

      {/* In-App Floating AI Assistant: Mystery Assistant */}
      <ChatbotSentinel onOpenHowToPlay={() => setHowToPlayOpen(true)} />
    </div>
  );
}

export default App;
