import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Shield, 
  Award, 
  History, 
  LogIn, 
  LogOut, 
  User as UserIcon, 
  HelpCircle, 
  BookOpen, 
  Trophy, 
  TrendingUp,
  KeyRound 
} from 'lucide-react';

export const Navbar = ({ 
  onOpenAuth, 
  onOpenHistory, 
  onOpenScoreHistory, 
  onOpenHowToPlay, 
  onOpenAccount,
  onResetCase, 
  isInvestigating 
}) => {
  const { user, logout, isAuthenticated } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const sessionPoints = user?.currentSession?.pointsEarned || 0;
  const lifetimeScore = user?.stats?.lifetimeScore ?? user?.stats?.score ?? 0;

  return (
    <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <div 
          onClick={onResetCase}
          className="flex items-center space-x-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-lg bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 group-hover:border-cyan-400 transition-colors shadow-lg shadow-cyan-950/50">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold tracking-wider text-base lg:text-lg text-white">
                AI MYSTERY <span className="text-cyan-400">ROOM</span>
              </span>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-cyan-900/40 border border-cyan-500/30 text-cyan-300">
                Gemini Powered
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono hidden sm:block">
              Forensic Intelligence & Logic Simulation Desk
            </p>
          </div>
        </div>

        {/* Right Nav / Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* How to Play / Field Guide Button (Always visible) */}
          <button
            onClick={onOpenHowToPlay}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-500/40 text-cyan-300 hover:text-white text-xs font-mono font-semibold transition-all shadow-sm"
            title="Read Detective Field Manual / How to Play"
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Field Guide</span>
            <span className="sm:hidden">Guide</span>
          </button>

          {isInvestigating && (
            <button
              onClick={onResetCase}
              className="text-xs font-mono px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white transition-colors"
            >
              Solve New Mystery
            </button>
          )}

          {isAuthenticated ? (
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Separate Session and Lifetime Scores Badge */}
              <div 
                onClick={onOpenScoreHistory}
                title="Click to view full Score History"
                className="hidden md:flex items-center space-x-3 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono cursor-pointer hover:border-cyan-500/40 transition-colors"
              >
                <span className="flex items-center space-x-1 text-amber-400 font-semibold">
                  <Award className="w-3.5 h-3.5" />
                  <span>{user.stats?.rank || 'Rookie Sleuth'}</span>
                </span>
                <span className="text-slate-600">|</span>
                <span className="text-cyan-300 font-medium" title="Points earned in current login session">
                  Session: <strong className="text-white">{sessionPoints}</strong> PTS
                </span>
                <span className="text-slate-600">|</span>
                <span className="text-amber-300 font-medium" title="All-time lifetime accumulated points">
                  Lifetime: <strong className="text-white">{lifetimeScore}</strong> PTS
                </span>
              </div>

              {/* Score History Trigger Button */}
              <button
                onClick={onOpenScoreHistory}
                title="View Session & Lifetime Score History"
                className="flex items-center space-x-1.5 p-2 px-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-amber-500/50 text-amber-400 hover:text-amber-300 transition-colors text-xs font-mono"
              >
                <Trophy className="w-4 h-4 text-amber-400" />
                <span className="hidden lg:inline">Scores</span>
              </button>

              {/* Case Archives Button */}
              <button
                onClick={onOpenHistory}
                title="View Case Archives"
                className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-colors"
              >
                <History className="w-4 h-4" />
              </button>

              {/* User Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center space-x-2 p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/50 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-cyan-600/30 text-cyan-300 flex items-center justify-center font-bold text-xs uppercase font-mono">
                    {user.username ? user.username.slice(0, 2) : 'ID'}
                  </div>
                  <span className="text-xs font-medium text-slate-200 hidden sm:inline max-w-[110px] truncate font-mono">
                    {user.username}
                  </span>
                </button>

                {dropdownOpen && (
                  <div 
                    onClick={() => setDropdownOpen(false)}
                    className="absolute right-0 mt-2 w-52 rounded-xl bg-slate-900 border border-slate-800 shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 font-mono text-xs"
                  >
                    <div className="px-4 py-2 border-b border-slate-800">
                      <p className="text-slate-400 text-[10px]">Investigator Codename</p>
                      <p className="font-bold text-cyan-300 truncate">{user.username}</p>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">{user.email}</p>
                    </div>

                    <div className="px-4 py-2 border-b border-slate-800 text-[11px] space-y-1">
                      <div className="flex justify-between text-slate-400">
                        <span>Session PTS:</span>
                        <span className="text-cyan-400 font-bold">{sessionPoints}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Lifetime PTS:</span>
                        <span className="text-amber-400 font-bold">{lifetimeScore}</span>
                      </div>
                    </div>

                    <button
                      onClick={onOpenScoreHistory}
                      className="w-full text-left px-4 py-2 text-slate-300 hover:bg-slate-800 flex items-center space-x-2"
                    >
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      <span>Score History Table</span>
                    </button>
                    <button
                      onClick={onOpenAccount}
                      className="w-full text-left px-4 py-2 text-slate-300 hover:bg-slate-800 flex items-center space-x-2"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Account & Security</span>
                    </button>
                    <button
                      onClick={onOpenHistory}
                      className="w-full text-left px-4 py-2 text-slate-300 hover:bg-slate-800 flex items-center space-x-2"
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>Case Archives</span>
                    </button>
                    <button
                      onClick={onOpenHowToPlay}
                      className="w-full text-left px-4 py-2 text-slate-300 hover:bg-slate-800 flex items-center space-x-2"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Field Guide</span>
                    </button>
                    <button
                      onClick={() => {
                        if (onResetCase) onResetCase();
                        logout();
                      }}
                      className="w-full text-left px-4 py-2 text-rose-400 hover:bg-rose-950/30 flex items-center space-x-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onOpenAuth('login')}
                className="flex items-center space-x-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Investigator Login</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
