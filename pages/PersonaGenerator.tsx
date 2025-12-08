
import React, { useState, useRef } from 'react';
import { generateCandidatePersona } from '../services/geminiService';
import { exportElementToPDF } from '../services/exportService';
import { CandidatePersona, Language, LANGUAGE_OPTIONS, RecruitmentTool, SharedData } from '../types';
import { Loader2, UserCircle2, UploadCloud, FileText, Globe, Sparkles, Briefcase, GraduationCap, Building2, MapPin, Hash, Target, Lightbulb, Heart, Search, Share2, Palette, Download, ArrowRight, Rocket, ClipboardList, ArrowLeft, Edit3 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import * as XLSX from "xlsx";

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs`;

interface PersonaGeneratorProps {
    onNavigateWithData?: (tool: RecruitmentTool, data: SharedData) => void;
}

const PersonaGenerator: React.FC<PersonaGeneratorProps> = ({ onNavigateWithData }) => {
  const [step, setStep] = useState<'input' | 'result'>('input');
  
  const [jdText, setJdText] = useState('');
  const [language, setLanguage] = useState<Language>('zh-TW');
  const [result, setResult] = useState<CandidatePersona | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Helper to detect CJK characters
  const isCJK = (str: string) => /[\u4e00-\u9fa5]/.test(str);

  const parseDocument = async (file: File): Promise<string> => {
    const fileNameLower = file.name.toLowerCase();
    let text = '';

    if (file.type === 'application/pdf' || fileNameLower.endsWith('.pdf')) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument({
                data: new Uint8Array(arrayBuffer),
                cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/',
                cMapPacked: true,
                standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/standard_fonts/'
            });
            const pdf = await loadingTask.promise;
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                let lastItemStr = '';
                const pageText = textContent.items.map((item: any) => {
                    const str = item.str || ''; // Safe fallback
                    if (!str) return '';

                    let prefix = '';
                    if (lastItemStr && str) {
                       if (!isCJK(lastItemStr.slice(-1)) && !isCJK(str[0]) && str !== ' ' && lastItemStr !== ' ') {
                           prefix = ' ';
                       }
                    }
                    lastItemStr = str;
                    return prefix + str;
                }).join('');
                fullText += pageText + '\n';
            }
            text = fullText;
        } catch (e) {
            console.error("PDF Parse Error", e);
            throw new Error("PDF 解析失敗，請確認檔案未加密。");
        }
    } else if (fileNameLower.endsWith('.docx')) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            text = result.value;
        } catch (e) {
             console.error("Word Parse Error", e);
             throw new Error("Word 檔案解析失敗。");
        }
    } else if (fileNameLower.endsWith('.xlsx') || fileNameLower.endsWith('.xls')) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            text = XLSX.utils.sheet_to_txt(worksheet);
        } catch (e) {
            console.error("Excel Parse Error", e);
            throw new Error("Excel 檔案解析失敗。");
        }
    } else if (file.type.startsWith('text/') || fileNameLower.endsWith('.txt')) {
        text = await file.text();
    } else {
        throw new Error('不支援的檔案格式。請上傳 PDF, Word (.docx), Excel 或純文字檔。');
    }
    return text;
  };

  const handleFileProcess = async (file: File) => {
    if (!file) return;
    setIsParsing(true);
    try {
        const text = await parseDocument(file);
        if (!text.trim()) {
             throw new Error("無法從檔案中提取文字。請確認檔案不為空，且不是「純圖片」掃描檔 (Scanned Document)。若問題持續，請嘗試直接貼上文字。");
        }
        setJdText(text);
    } catch (error: any) {
        console.error('File Parsing Error:', error);
        alert(error.message || '檔案解析失敗');
    } finally {
        setIsParsing(false);
    }
  };

  const handleGenerate = async () => {
    if (!jdText) return;
    setIsLoading(true);
    const persona = await generateCandidatePersona(language, jdText);
    
    if (persona) {
        setResult(persona);
        setStep('result'); // Switch to result view on success
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setIsLoading(false);
  };

  const handleBackToEdit = () => {
      setStep('input');
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExportPDF = () => {
      if (result) {
          const filename = `Persona_${result.archetype.replace(/\s+/g, '_')}`;
          exportElementToPDF(filename, 'persona-report');
      }
  };

  const handleAction = (tool: RecruitmentTool) => {
      if (!result || !onNavigateWithData) return;
      
      const sharedData: SharedData = {
          jobTitle: result.archetype,
          skills: result.skills.join(', '),
          cultureValues: result.values.join(', '),
          sellingPoints: `${result.values.join(', ')}. ${result.quote}`,
          jobDescriptionContext: `[Based on Persona: ${result.archetype}]\n${result.bio}\n\nTraits: ${result.traits.join(', ')}\nValues: ${result.values.join(', ')}\n\nOriginal JD Context:\n${jdText.substring(0, 500)}...`
      };
      
      onNavigateWithData(tool, sharedData);
  };

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const onDrop = (e: React.DragEvent) => { 
      e.preventDefault(); e.stopPropagation(); setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if(file) handleFileProcess(file);
  };

  return (
    <div className="w-full h-full">
      {/* STEP 1: INPUT FORM */}
      {step === 'input' && (
          <div className="max-w-4xl mx-auto animate-enter pb-10">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <span className="p-3 bg-orange-100 text-orange-600 rounded-xl"><UserCircle2 size={32}/></span>
                        人才畫像生成器
                    </h2>
                    <div className="flex items-center gap-2">
                        <Globe size={18} className="text-slate-400" />
                        <select 
                            value={language}
                            onChange={(e) => setLanguage(e.target.value as Language)}
                            className="text-sm border border-gray-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-orange-500 bg-white text-slate-700 font-medium"
                        >
                            {LANGUAGE_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100 mb-8">
                    <h3 className="text-orange-900 font-bold text-lg mb-2">為什麼需要人才畫像？</h3>
                    <p className="text-orange-800/80 leading-relaxed">
                        上傳您的 JD，AI 將深入分析並具象化候選人的七大維度：
                        <span className="font-semibold mx-1">工作類型、特質、技能、價值觀、背景、來源與關鍵字</span>。
                        這能幫助您在茫茫人海中，精準鎖定對的人。
                    </p>
                </div>

                <div className="space-y-6">
                    {/* File Upload Area */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">
                            上傳職缺描述 (JD)
                        </label>
                        <div className="bg-slate-50 p-1 rounded-xl border border-slate-200">
                            <label 
                                className={`flex flex-col items-center justify-center w-full h-64 transition border-2 border-dashed rounded-xl cursor-pointer group
                                    ${isDragging 
                                        ? 'border-orange-500 bg-orange-50 scale-[0.99] shadow-inner' 
                                        : jdText ? 'border-orange-500 bg-orange-50/20' : 'border-gray-300 bg-white hover:border-orange-400 hover:bg-white'
                                    }
                                `}
                                onDragOver={onDragOver}
                                onDragLeave={onDragLeave}
                                onDrop={onDrop}
                            >
                                {isParsing ? (
                                    <div className="text-center">
                                        <Loader2 className="animate-spin text-orange-500 mb-3 mx-auto" size={36} />
                                        <p className="font-bold text-orange-600">正在解析文件...</p>
                                    </div>
                                ) : (
                                    <div className="text-center p-6">
                                        <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center transition-colors ${isDragging || jdText ? 'bg-orange-100' : 'bg-gray-100 group-hover:bg-orange-50'}`}>
                                            <UploadCloud className={`${isDragging || jdText ? 'text-orange-600' : 'text-gray-400 group-hover:text-orange-500'}`} size={32} />
                                        </div>
                                        
                                        <h4 className={`text-lg font-bold mb-1 ${isDragging || jdText ? 'text-orange-700' : 'text-slate-700'}`}>
                                            {isDragging ? '放開以開始上傳' : jdText ? '文件讀取成功' : '點擊或拖曳檔案'}
                                        </h4>
                                        <p className="text-sm text-slate-400 mb-4">支援 PDF, Word (.docx), Excel, 純文字</p>
                                        
                                        {jdText && (
                                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                                                <FileText size={12} /> 已匯入 {jdText.length} 字
                                            </div>
                                        )}
                                    </div>
                                )}
                                
                                <input 
                                    type="file" 
                                    className="hidden" 
                                    accept=".pdf,.txt,.docx,.xlsx,.xls"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if(file) handleFileProcess(file);
                                    }}
                                    disabled={isParsing}
                                />
                            </label>
                        </div>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-gray-200" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-2 text-gray-400 font-bold">或手動輸入</span>
                        </div>
                    </div>

                    <textarea
                        value={jdText}
                        onChange={(e) => setJdText(e.target.value)}
                        className="w-full h-32 p-4 text-sm border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 resize-none bg-slate-50 focus:bg-white transition-colors placeholder:text-slate-400"
                        placeholder="請在此貼上職缺內容..."
                    />

                    <button
                        onClick={handleGenerate}
                        disabled={isLoading || !jdText}
                        className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:from-orange-300 disabled:to-orange-300 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-orange-500/25 transform hover:-translate-y-0.5"
                    >
                        {isLoading ? <Loader2 className="animate-spin" size={24} /> : <Sparkles size={24} />}
                        <span className="text-lg">{isLoading ? 'AI 正在深入分析...' : '開始生成人才畫像'}</span>
                    </button>
                </div>
            </div>
          </div>
      )}

      {/* STEP 2: RESULT DISPLAY */}
      {step === 'result' && result && (
          <div className="animate-enter pb-20">
            {/* Top Navigation */}
            <div className="mb-6 flex items-center justify-between">
                <button 
                    onClick={handleBackToEdit}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold transition-colors bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm hover:shadow-md"
                >
                    <ArrowLeft size={18} /> 返回編輯
                </button>
                <div className="flex items-center gap-2">
                     <button 
                        onClick={handleExportPDF}
                        className="flex items-center gap-2 text-orange-600 hover:text-orange-700 font-bold bg-orange-50 hover:bg-orange-100 px-4 py-2 rounded-lg transition-colors"
                    >
                        <Download size={18} /> 下載報告 (PDF)
                    </button>
                </div>
            </div>

            <div className="space-y-6 max-w-5xl mx-auto w-full">
                {/* Persona Card Container - ID Added for PDF Export */}
                <div id="persona-report" className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                    {/* Header */}
                    <div className="bg-slate-900 p-8 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <UserCircle2 size={160} />
                        </div>
                        <div className="relative z-10">
                            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center mb-6">
                                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-4xl font-bold shadow-lg text-white border-4 border-slate-800">
                                    {result.archetype.charAt(0)}
                                </div>
                                <div>
                                    <div className="inline-block px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/50 text-orange-200 text-xs font-bold mb-2 uppercase tracking-wider">
                                        Target Persona
                                    </div>
                                    <h2 className="text-4xl font-bold tracking-tight">{result.archetype}</h2>
                                </div>
                            </div>
                            
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/10 relative">
                                <div className="italic text-orange-200 text-xl mb-3 font-serif">"{result.quote}"</div>
                                <p className="text-slate-300 text-base leading-relaxed">{result.bio}</p>
                            </div>
                        </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-200">
                        {/* Column 1 */}
                        <div className="p-8 space-y-8 bg-slate-50/50">
                            <div>
                                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase text-xs tracking-wider">
                                    <Briefcase size={16} className="text-orange-600"/> 工作類型
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {result.workType.map((type, i) => (
                                        <span key={i} className="px-3 py-1.5 bg-white border border-gray-200 rounded-md text-sm text-slate-600 font-medium shadow-sm">
                                            {type}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase text-xs tracking-wider">
                                    <Palette size={16} className="text-purple-600"/> 人才特質
                                </h4>
                                <ul className="space-y-3">
                                    {result.traits.map((t, i) => (
                                        <li key={i} className="flex items-center gap-3 text-sm text-slate-700">
                                            <span className="w-2 h-2 rounded-full bg-purple-400 shadow-sm"></span> {t}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase text-xs tracking-wider">
                                    <GraduationCap size={16} className="text-slate-600"/> 背景要求
                                </h4>
                                <div className="space-y-3 text-sm text-slate-600">
                                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                                        <span className="block text-xs font-bold text-slate-400 uppercase mb-1">經歷</span>
                                        <span className="text-slate-800 font-medium">{result.background.experience}</span>
                                    </div>
                                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                                        <span className="block text-xs font-bold text-slate-400 uppercase mb-1">教育</span>
                                        <span className="text-slate-800 font-medium">{result.background.education}</span>
                                    </div>
                                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                                        <span className="block text-xs font-bold text-slate-400 uppercase mb-1">產業</span>
                                        <span className="text-slate-800 font-medium">{result.background.industries.join(", ")}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Column 2 */}
                        <div className="p-8 space-y-8">
                            <div>
                                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase text-xs tracking-wider">
                                    <Lightbulb size={16} className="text-yellow-600"/> 專業技能
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {result.skills.map((tech, i) => (
                                        <span key={i} className="px-3 py-1.5 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md text-sm font-bold">
                                            {tech}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase text-xs tracking-wider">
                                    <Heart size={16} className="text-red-500"/> 核心價值觀
                                </h4>
                                <div className="grid gap-3">
                                    {result.values.map((val, i) => (
                                        <div key={i} className="flex items-center gap-3 p-3 bg-red-50/50 rounded-xl border border-red-100">
                                            <div className="bg-white p-1.5 rounded-full shadow-sm text-red-500">
                                                <Heart size={14} className="fill-red-500" />
                                            </div>
                                            <span className="text-sm text-red-900 font-medium">{val}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Column 3 */}
                        <div className="p-8 space-y-8 bg-slate-50/50">
                            <div>
                                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase text-xs tracking-wider">
                                    <Share2 size={16} className="text-blue-600"/> 尋才管道
                                </h4>
                                <ul className="space-y-3">
                                    {result.channels.map((ch, i) => (
                                        <li key={i} className="flex items-center gap-3 text-sm font-medium text-slate-700">
                                            <div className="p-1.5 bg-white border border-gray-200 rounded-lg text-blue-600 shadow-sm">
                                                <Share2 size={12} />
                                            </div>
                                            {ch}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                 <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase text-xs tracking-wider">
                                    <Search size={16} className="text-emerald-600"/> SEO 關鍵字
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {result.keywords.map((kw, i) => (
                                        <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs text-slate-600 font-medium">
                                            <Hash size={12} className="text-slate-400"/> {kw}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Next Actions Toolbar */}
                <div className="bg-slate-900 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl border border-slate-700">
                    <div className="flex items-center gap-4 text-white">
                        <div className="p-3 bg-indigo-500 rounded-xl animate-pulse shadow-lg shadow-indigo-500/30">
                            <Rocket size={24} />
                        </div>
                        <div>
                            <h4 className="font-bold text-lg">下一步行動 (Next Actions)</h4>
                            <p className="text-sm text-slate-400">將此畫像的數據直接應用於：</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button 
                            onClick={() => handleAction(RecruitmentTool.TALENT_SEARCH)}
                            className="flex items-center gap-2 px-5 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-bold transition-all border border-slate-700 hover:border-slate-500"
                        >
                            <Search size={16} className="text-sky-400" /> 尋找人才
                        </button>
                        <button 
                            onClick={() => handleAction(RecruitmentTool.JD_GENERATOR)}
                            className="flex items-center gap-2 px-5 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-bold transition-all border border-slate-700 hover:border-slate-500"
                        >
                            <FileText size={16} className="text-blue-400" /> 生成 JD
                        </button>
                        <button 
                            onClick={() => handleAction(RecruitmentTool.OUTREACH_WRITER)}
                            className="flex items-center gap-2 px-5 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-bold transition-all border border-slate-700 hover:border-slate-500"
                        >
                            <Rocket size={16} className="text-purple-400" /> 撰寫開發信
                        </button>
                         <button 
                            onClick={() => handleAction(RecruitmentTool.INTERVIEW_COPILOT)}
                            className="flex items-center gap-2 px-5 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-bold transition-all border border-slate-700 hover:border-slate-500"
                        >
                            <ClipboardList size={16} className="text-green-400" /> 準備面試
                        </button>
                    </div>
                </div>
            </div>
          </div>
      )}
    </div>
  );
};

export default PersonaGenerator;
