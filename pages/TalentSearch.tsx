import React, { useState, useRef, useEffect } from 'react';
import { generateTalentSearchStrategy, suggestSkillsFromTitle } from '../services/geminiService';
import { TalentStrategyStructured, SharedData } from '../types';
import { Loader2, Globe2, Search, Target, MapPin, ExternalLink, Linkedin, Check, Copy, Building2, Lightbulb, Code2, Sparkles, ArrowLeft } from 'lucide-react';
import { Language, LANGUAGE_OPTIONS } from '../types';

interface TalentSearchProps {
    initialData?: SharedData;
}

const TalentSearch: React.FC<TalentSearchProps> = ({ initialData }) => {
  const [step, setStep] = useState<'input' | 'result'>('input');
  
  const [formData, setFormData] = useState({
    jobTitle: '',
    skills: '',
    location: 'Taiwan'
  });
  const [language, setLanguage] = useState<Language>('zh-TW');
  
  const [result, setResult] = useState<TalentStrategyStructured | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSkillLoading, setIsSkillLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Pre-fill data if available
  useEffect(() => {
      if (initialData) {
          setFormData(prev => ({
              ...prev,
              jobTitle: initialData.jobTitle || prev.jobTitle,
              skills: initialData.skills || prev.skills
          }));
      }
  }, [initialData]);

  const handleSearch = async () => {
    if (!formData.jobTitle) return;
    setIsLoading(true);
    setResult(null);

    const data = await generateTalentSearchStrategy(
        language,
        formData.jobTitle,
        formData.skills,
        formData.location
    );
    setResult(data);
    setIsLoading(false);
    setStep('result');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const generateSkills = async () => {
      if (!formData.jobTitle) return;
      setIsSkillLoading(true);
      const skills = await suggestSkillsFromTitle(language, formData.jobTitle);
      if (skills) {
          setFormData(prev => ({ ...prev, skills: skills }));
      }
      setIsSkillLoading(false);
  };

  const handleTitleBlur = () => {
      // Auto-suggest skills if title exists but skills are empty
      if (formData.jobTitle && !formData.skills) {
          generateSkills();
      }
  };

  const handleCopyBoolean = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleLinkedInSearch = (query: string) => {
      const encoded = encodeURIComponent(query);
      window.open(`https://www.linkedin.com/search/results/people/?keywords=${encoded}`, '_blank');
  };

  const handleGoogleSearch = (company: string) => {
      window.open(`https://www.google.com/search?q=${encodeURIComponent(company + " careers")}`, '_blank');
  };
  
  const handleBackToEdit = () => {
      setStep('input');
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="w-full h-full">
      {/* STEP 1: INPUT */}
      {step === 'input' && (
      <div className="max-w-4xl mx-auto animate-enter pb-10">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <span className="p-2 bg-sky-100 text-sky-600 rounded-lg"><Globe2 size={24}/></span>
                    人才搜尋與策略
                </h2>
                <div className="flex items-center gap-2">
                    <select 
                        value={language}
                        onChange={(e) => setLanguage(e.target.value as Language)}
                        className="text-sm border border-gray-300 rounded-lg p-2 outline-none focus:ring-1 focus:ring-sky-500 bg-white text-slate-700"
                    >
                        {LANGUAGE_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
            </div>
            
            <p className="text-slate-500 mb-8 text-base">
                AI 將透過 Google 搜尋最新的市場資訊，分析最佳招募管道，並列出潛在的挖角目標公司名單。
                輸入職稱後，系統會自動協助帶入建議技能。
            </p>

            <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Left Column: Title & Location */}
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">職缺名稱 (Job Title)</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />
                                <input 
                                    type="text"
                                    className="w-full border border-gray-300 rounded-lg pl-10 pr-10 p-3 outline-none focus:ring-2 focus:ring-sky-500 text-base"
                                    placeholder="例如：Frontend Engineer..."
                                    value={formData.jobTitle}
                                    onChange={(e) => setFormData({...formData, jobTitle: e.target.value})}
                                    onBlur={handleTitleBlur}
                                />
                                {/* Auto-suggest trigger icon */}
                                <div className="absolute right-3 top-3.5 text-sky-500" title="輸入後將自動帶入技能">
                                    <Sparkles size={18} className={isSkillLoading ? "animate-pulse opacity-50" : "opacity-100"} />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">目標地區 (Location)</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-3.5 text-gray-400" size={18} />
                                <input 
                                    type="text"
                                    className="w-full border border-gray-300 rounded-lg pl-10 p-3 outline-none focus:ring-2 focus:ring-sky-500 text-base"
                                    placeholder="例如：Taiwan, Taipei..."
                                    value={formData.location}
                                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Skills (Larger Area) */}
                    <div className="flex flex-col h-full">
                        <label className="flex items-center justify-between text-sm font-medium text-slate-700 mb-1">
                            <span>關鍵技能 (Key Skills)</span>
                            <button 
                                onClick={generateSkills}
                                disabled={!formData.jobTitle || isSkillLoading}
                                className="text-xs flex items-center gap-1 text-sky-600 hover:text-sky-800 disabled:opacity-50"
                            >
                                {isSkillLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                重新生成技能
                            </button>
                        </label>
                        <textarea 
                            className={`w-full border border-gray-300 rounded-lg p-3 flex-grow outline-none focus:ring-2 focus:ring-sky-500 resize-none text-base transition-colors min-h-[140px]
                                ${isSkillLoading ? 'bg-gray-50' : 'bg-white'}
                            `}
                            placeholder={isSkillLoading ? "AI 正在分析職缺所需的關鍵技能..." : "例如：React, AWS, CI/CD..."}
                            value={formData.skills}
                            onChange={(e) => setFormData({...formData, skills: e.target.value})}
                        />
                    </div>
                </div>
            </div>
            
            <div className="mt-8 flex justify-end">
                <button
                    onClick={handleSearch}
                    disabled={isLoading || !formData.jobTitle}
                    className="w-full bg-sky-600 hover:bg-sky-700 disabled:bg-sky-300 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98]"
                >
                    {isLoading ? <Loader2 className="animate-spin" /> : <Target size={20} />}
                    {isLoading ? 'AI 報告生成中...' : '開始搜尋與分析'}
                </button>
            </div>
        </div>
      </div>
      )}

      {/* STEP 2: RESULT */}
      {step === 'result' && result && (
      <div className="animate-enter pb-10">
         <div className="flex items-center justify-between mb-6">
            <button 
                onClick={handleBackToEdit}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold transition-colors bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm hover:shadow-md"
            >
                <ArrowLeft size={18} /> 返回編輯
            </button>
            {/* Can add export buttons here if needed later */}
         </div>

         <div className="bg-white rounded-xl shadow-xl border border-gray-200 flex flex-col min-h-[600px] overflow-hidden max-w-7xl mx-auto w-full">
            {/* Hero Header */}
            <div className="bg-slate-900 p-8 text-white relative overflow-hidden flex-shrink-0">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Globe2 size={160} />
                </div>
                <div className="relative z-10">
                     <div className="flex items-center gap-2 mb-2 text-sky-300 font-bold text-sm tracking-widest uppercase">
                        <Target size={14} /> Market Strategy
                     </div>
                     <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
                         {formData.jobTitle}
                     </h2>
                     <div className="flex gap-4 text-slate-300 text-sm">
                        <span className="flex items-center gap-1"><MapPin size={14}/> {formData.location}</span>
                     </div>
                </div>
            </div>

             <div className="flex-1 overflow-y-auto bg-slate-50 p-8">
                <div className="space-y-8 max-w-6xl mx-auto">
                    
                    {/* 1. Channel Strategy */}
                    <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
                        <h4 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <Lightbulb className="text-yellow-500" size={24} /> 招募管道策略 (Channel Strategy)
                        </h4>
                        <ul className="grid md:grid-cols-2 gap-4">
                            {result.channelStrategy.map((strategy, idx) => (
                                <li key={idx} className="flex gap-4 text-slate-700 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center text-sm font-bold mt-0.5">
                                        {idx + 1}
                                    </span>
                                    <span className="font-medium text-lg leading-relaxed">{strategy}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* 2. Company Hunting List */}
                    <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
                         <h4 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <Building2 className="text-indigo-500" size={24} /> 公司獵捕清單 (Company Hunting List)
                        </h4>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {result.companyHuntingList.map((company, idx) => (
                                <div key={idx} className="p-6 rounded-xl border border-gray-100 bg-gray-50 hover:bg-white hover:shadow-lg hover:border-sky-200 transition-all group flex flex-col">
                                    <div className="flex justify-between items-start mb-3">
                                        <h5 className="font-bold text-slate-900 text-lg">{company.name}</h5>
                                        <button 
                                            onClick={() => handleGoogleSearch(company.name)}
                                            className="text-gray-400 hover:text-sky-600 transition-colors p-1.5 bg-white rounded-lg shadow-sm opacity-0 group-hover:opacity-100"
                                            title="Google Search"
                                        >
                                            <Search size={16} />
                                        </button>
                                    </div>
                                    <p className="text-sm text-slate-500 leading-relaxed flex-1">{company.reason}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 3. Boolean Search Strings */}
                    <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
                        <h4 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <Code2 className="text-pink-500" size={24} /> LinkedIn 布林搜尋字串
                        </h4>
                        <div className="space-y-6">
                            {result.booleanStrings.map((item, idx) => (
                                <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                    <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
                                        <span className="text-sm font-bold text-slate-600 uppercase tracking-wide">{item.label}</span>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => handleLinkedInSearch(item.query)}
                                                className="flex items-center gap-1 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors font-bold"
                                            >
                                                <Linkedin size={14} /> Search
                                            </button>
                                            <button 
                                                onClick={() => handleCopyBoolean(item.query, idx)}
                                                className="flex items-center gap-1 text-xs bg-white border border-gray-300 hover:bg-gray-50 text-slate-600 px-3 py-1.5 rounded-lg transition-colors font-medium"
                                            >
                                                {copiedIndex === idx ? <Check size={14} /> : <Copy size={14} />}
                                                {copiedIndex === idx ? 'Copied' : 'Copy'}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-slate-900 text-emerald-400 font-mono text-sm break-all">
                                        {item.query}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Sources */}
                    {result.sources.length > 0 && (
                        <div className="border-t border-gray-200 pt-6">
                            <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">資料來源 (Sources)</h5>
                            <div className="flex flex-wrap gap-3">
                                {result.sources.map((source, idx) => (
                                    <a 
                                        key={idx} 
                                        href={source.uri} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-xs text-sky-700 bg-sky-50 px-3 py-1.5 rounded-lg hover:bg-sky-100 transition-colors border border-sky-100"
                                    >
                                        <ExternalLink size={12} /> {new URL(source.uri).hostname}
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
             </div>
         </div>
      </div>
      )}
    </div>
  );
};

export default TalentSearch;