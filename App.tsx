import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import JDGenerator from './pages/JDGenerator';
import PersonaGenerator from './pages/PersonaGenerator';
import OutreachWriter from './pages/OutreachWriter';
import InterviewCopilot from './pages/InterviewCopilot';
import AgentChat from './pages/AgentChat';
import TalentSearch from './pages/TalentSearch';
import Settings from './pages/Settings';
import { RecruitmentTool, SharedData } from './types';
import { Briefcase, Key, ShieldCheck, ArrowRight, Lock } from 'lucide-react';
import { hasValidApiKey } from './services/geminiService';

// --- Splash Screen Component ---
const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 500);
    const t2 = setTimeout(() => setStep(2), 2000);
    const t3 = setTimeout(onComplete, 3500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 z-50 bg-slate-900 flex flex-col items-center justify-center transition-opacity duration-1000 ${step === 2 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      <div className="relative">
        <div className={`absolute inset-0 bg-indigo-500 rounded-full blur-3xl opacity-20 animate-pulse`}></div>
        <div className={`flex items-center gap-3 transform transition-all duration-1000 ${step >= 1 ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <div className="p-4 bg-indigo-600 rounded-2xl shadow-xl">
             <Briefcase size={48} className="text-white" />
          </div>
          <div className="text-white">
            <h1 className="text-4xl font-bold tracking-tighter">RecruitAI</h1>
            <p className="text-indigo-300 tracking-widest text-sm mt-1">Step1ne AI招募</p>
          </div>
        </div>
      </div>
      <div className={`mt-8 flex gap-2 transition-opacity duration-700 ${step >= 1 ? 'opacity-100' : 'opacity-0'}`}>
         <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
         <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
         <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
      </div>
    </div>
  );
};

// --- API Key Entry Component (Gate) ---
const ApiKeyEntry = ({ onUnlock }: { onUnlock: () => void }) => {
    const [key, setKey] = useState('');

    const handleSave = () => {
        if (!key.trim()) return;
        localStorage.setItem('user_gemini_api_key', key.trim());
        onUnlock();
    };

    return (
        <div className="fixed inset-0 z-40 bg-slate-900 flex items-center justify-center p-4">
             {/* Background Decoration */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[100px]"></div>
            </div>

            <div className="relative w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8 animate-enter">
                <div className="flex flex-col items-center mb-8">
                    <div className="p-4 bg-indigo-600 rounded-full mb-4 shadow-lg shadow-indigo-600/30">
                        <Lock size={32} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white text-center">歡迎使用 RecruitAI</h2>
                    <p className="text-indigo-200 text-center mt-2 text-sm">
                        Step1ne 智能招募顧問系統
                    </p>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-indigo-200 uppercase tracking-wide mb-2 pl-1">
                            請輸入您的 Gemini API Key
                        </label>
                        <div className="relative">
                            <Key className="absolute left-3 top-3.5 text-indigo-300" size={18} />
                            <input 
                                type="password"
                                value={key}
                                onChange={(e) => setKey(e.target.value)}
                                placeholder="AIzaSy..."
                                className="w-full bg-slate-800/50 border border-slate-600 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            />
                        </div>
                    </div>

                    <button 
                        onClick={handleSave}
                        disabled={!key.trim()}
                        className="w-full bg-indigo-500 hover:bg-indigo-400 disabled:bg-indigo-500/50 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98]"
                    >
                        進入系統 <ArrowRight size={18} />
                    </button>

                    <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                        <div className="flex items-start gap-3">
                             <ShieldCheck size={20} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                             <div className="space-y-1">
                                <p className="text-xs font-bold text-emerald-100">安全承諾</p>
                                <p className="text-xs text-slate-300 leading-relaxed">
                                    您的 API Key 僅儲存於本地瀏覽器 (LocalStorage)，<strong>不會</strong>上傳至我們的主機。重新整理頁面後若希望清除，請至設定移除。
                                </p>
                             </div>
                        </div>
                    </div>

                    <div className="text-center">
                        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-xs text-indigo-300 hover:text-white transition-colors underline">
                            沒有 API Key? 前往 Google AI Studio 獲取
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Main App Component ---
const App: React.FC = () => {
  const [currentTool, setCurrentTool] = useState<RecruitmentTool>(RecruitmentTool.DASHBOARD);
  const [showSplash, setShowSplash] = useState(true);
  const [sharedData, setSharedData] = useState<SharedData | undefined>(undefined);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check for LinkedIn Token Return
  useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('linkedin_token');
      const error = params.get('error');

      if (token) {
          localStorage.setItem('linkedin_access_token', token);
          localStorage.setItem('linkedin_connected', 'true');
          // Clear query params from URL without refresh
          window.history.replaceState({}, document.title, window.location.pathname);
          // Optional: Notify user? Or just let them see status in settings
          console.log("LinkedIn connected successfully");
      }
      
      if (error) {
          alert(`LinkedIn 連線失敗: ${error}`);
          window.history.replaceState({}, document.title, window.location.pathname);
      }
  }, []);

  // Check for API key on mount
  useEffect(() => {
      const checkAuth = () => {
          if (hasValidApiKey()) {
              setIsAuthenticated(true);
          }
      };
      checkAuth();
  }, []);

  const handleNavigateWithData = (tool: RecruitmentTool, data: SharedData) => {
      setSharedData(data);
      setCurrentTool(tool);
  };

  const handleUnlock = () => {
      setIsAuthenticated(true);
  };

  const renderContent = () => {
    switch (currentTool) {
      case RecruitmentTool.DASHBOARD:
        return <Dashboard onNavigate={setCurrentTool} />;
      case RecruitmentTool.SETTINGS:
        return <Settings />;
      case RecruitmentTool.TALENT_SEARCH:
        return <TalentSearch initialData={sharedData} />;
      case RecruitmentTool.JD_GENERATOR:
        return <JDGenerator initialData={sharedData} />;
      case RecruitmentTool.PERSONA_GENERATOR:
        return <PersonaGenerator onNavigateWithData={handleNavigateWithData} />;
      case RecruitmentTool.OUTREACH_WRITER:
        return <OutreachWriter initialData={sharedData} />;
      case RecruitmentTool.INTERVIEW_COPILOT:
        return <InterviewCopilot initialData={sharedData} />;
      case RecruitmentTool.AGENT_CHAT:
        return <AgentChat />;
      default:
        return <Dashboard onNavigate={setCurrentTool} />;
    }
  };

  return (
    <>
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      
      {!showSplash && !isAuthenticated ? (
          <ApiKeyEntry onUnlock={handleUnlock} />
      ) : (
          <div className={showSplash ? 'opacity-0' : 'opacity-100 transition-opacity duration-500'}>
            <Layout currentTool={currentTool} onToolChange={setCurrentTool}>
              {renderContent()}
            </Layout>
          </div>
      )}
    </>
  );
};

export default App;