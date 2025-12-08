
import React, { useState, useRef, useEffect } from 'react';
import { generateInterviewQuestions, analyzeCandidateMatch } from '../services/geminiService';
import { exportElementToPDF, exportToExcel } from '../services/exportService';
import { Loader2, Users, FileText, Search, UploadCloud, ClipboardList, TrendingUp, Globe, FileType, Download, Copy, Check, BarChart3, AlertCircle, CheckCircle2, MessageCircleQuestion, ThumbsUp, ThumbsDown, MinusCircle, ArrowLeft, BrainCircuit, AlertTriangle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Language, LANGUAGE_OPTIONS, SharedData, CandidateAnalysisStructured, InterviewQuestionsStructured } from '../types';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import * as XLSX from "xlsx";

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs`;

interface InterviewCopilotProps {
    initialData?: SharedData;
}

// --- Helper Component for Result Cards ---
interface ResultCardProps {
    title: string;
    children?: React.ReactNode;
    icon: any;
    colorClass: string;
    onCopy: () => void;
}

const ResultCard = ({ 
    title, 
    children, 
    icon: Icon, 
    colorClass, 
    onCopy 
}: ResultCardProps) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        onCopy();
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow">
            <div className={`px-5 py-4 border-b border-gray-100 flex items-center justify-between ${colorClass}`}>
                <h4 className="font-bold text-base flex items-center gap-2">
                    <Icon size={20} /> {title}
                </h4>
                <button 
                    onClick={handleCopy}
                    className="p-1.5 bg-white rounded-md text-slate-400 hover:text-slate-600 border border-gray-200 shadow-sm transition-colors"
                    title="複製內容"
                >
                    {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                </button>
            </div>
            <div className="p-6 flex-1">
                {children}
            </div>
        </div>
    );
};

const InterviewCopilot: React.FC<InterviewCopilotProps> = ({ initialData }) => {
  const [step, setStep] = useState<'input' | 'result'>('input');
  
  const [jdText, setJdText] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [language, setLanguage] = useState<Language>('zh-TW');
  
  const [questionsResult, setQuestionsResult] = useState<InterviewQuestionsStructured | null>(null);
  const [analysisResult, setAnalysisResult] = useState<CandidateAnalysisStructured | null>(null);
  
  const [activeTab, setActiveTab] = useState<'questions' | 'analysis'>('questions');
  const [isLoading, setIsLoading] = useState(false);
  
  // File Parsing States
  const [isParsingJd, setIsParsingJd] = useState(false);
  const [isParsingResume, setIsParsingResume] = useState(false);
  
  // UI States
  const [isDraggingJd, setIsDraggingJd] = useState(false);
  const [isDraggingResume, setIsDraggingResume] = useState(false);

  // Pre-fill data
  useEffect(() => {
      if(initialData && initialData.jobDescriptionContext) {
          setJdText(initialData.jobDescriptionContext);
      }
  }, [initialData]);

  // Helper to detect CJK characters
  const isCJK = (str: string) => /[\u4e00-\u9fa5]/.test(str);

  // Core parsing logic (Generic for both JD and Resume)
  const parseDocument = async (file: File): Promise<string> => {
    const fileNameLower = file.name.toLowerCase();
    let text = '';

    if (file.type === 'application/pdf' || fileNameLower.endsWith('.pdf')) {
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
            
            // Improved text extraction for CJK
            let lastItemStr = '';
            const pageText = textContent.items.map((item: any) => {
                const str = item.str || '';
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
    } else if (fileNameLower.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result.value;
    } else if (fileNameLower.endsWith('.xlsx') || fileNameLower.endsWith('.xls')) {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        text = XLSX.utils.sheet_to_txt(worksheet);
    } else if (file.type.startsWith('text/') || fileNameLower.endsWith('.txt')) {
        text = await file.text();
    } else {
        throw new Error('不支援的檔案格式。請上傳 PDF, Word (.docx), Excel 或純文字檔。');
    }

    return text;
  };

  const handleJdFileProcess = async (file: File) => {
    if (!file) return;
    setIsParsingJd(true);
    try {
        const text = await parseDocument(file);
        if (!text.trim()) throw new Error("無法提取文字，請確認檔案內容不為空，且不是「純圖片」掃描檔 (Scanned Document)。若問題持續，請嘗試直接貼上文字。");
        setJdText(text);
    } catch (error: any) {
        console.error('JD Parsing Error:', error);
        alert(error.message || 'JD 檔案解析失敗');
    } finally {
        setIsParsingJd(false);
    }
  };

  const handleResumeFileProcess = async (file: File) => {
    if (!file) return;
    setIsParsingResume(true);
    try {
        const text = await parseDocument(file);
        if (!text.trim()) throw new Error("無法提取文字，請確認檔案內容不為空，且不是「純圖片」掃描檔 (Scanned Document)。若問題持續，請嘗試直接貼上文字。");
        setResumeText(text);
    } catch (error: any) {
        console.error('Resume Parsing Error:', error);
        alert(error.message || '履歷檔案解析失敗');
    } finally {
        setIsParsingResume(false);
    }
  };

  const createDragHandlers = (
    setIsDragging: (v: boolean) => void, 
    processFunc: (f: File) => void
  ) => ({
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); },
    onDragLeave: (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); },
    onDrop: (e: React.DragEvent) => { 
        e.preventDefault(); e.stopPropagation(); setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if(file) processFunc(file);
    }
  });

  const jdDragHandlers = createDragHandlers(setIsDraggingJd, handleJdFileProcess);
  const resumeDragHandlers = createDragHandlers(setIsDraggingResume, handleResumeFileProcess);

  const handleGenerateQuestions = async () => {
    if (!jdText) return;
    setIsLoading(true);
    setActiveTab('questions');
    setQuestionsResult(null);
    
    const data = await generateInterviewQuestions(language, jdText, resumeText);
    setQuestionsResult(data);
    setIsLoading(false);
    setStep('result');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAnalyzeMatch = async () => {
    if (!jdText || !resumeText) return;
    setIsLoading(true);
    setActiveTab('analysis');
    setAnalysisResult(null);

    const data = await analyzeCandidateMatch(language, jdText, resumeText);
    setAnalysisResult(data);
    setIsLoading(false);
    setStep('result');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleExportPDF = () => {
    const title = activeTab === 'questions' ? 'Interview_Questions' : 'Candidate_Analysis';
    exportElementToPDF(title, 'interview-result');
  };

  const handleExportExcel = () => {
    let data: Record<string, any>[] = [];
    if (activeTab === 'questions' && questionsResult) {
        data = [
            { Section: 'Resume Deep Dive', Content: questionsResult.resumeDeepDive.join('\n') },
            { Section: 'Gap Analysis', Content: questionsResult.gapAnalysis.join('\n') },
            { Section: 'Behavioral', Content: questionsResult.behavioralQuestions.join('\n') },
        ];
    } else if (activeTab === 'analysis' && analysisResult) {
        data = [{ Type: 'Analysis', Content: JSON.stringify(analysisResult) }];
    }
    exportToExcel(`Interview_${activeTab}`, data);
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
                    <span className="p-2 bg-green-100 text-green-600 rounded-lg"><Users size={24}/></span>
                    面試 Copilot
                </h2>
                <div className="flex items-center gap-2">
                    <Globe size={18} className="text-slate-400" />
                    <select 
                        value={language}
                        onChange={(e) => setLanguage(e.target.value as Language)}
                        className="text-sm border border-gray-300 rounded-lg p-2 outline-none focus:ring-1 focus:ring-green-500 bg-white text-slate-700"
                    >
                        {LANGUAGE_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            <p className="text-slate-500 mb-8 text-base">
                輸入 JD 與候選人履歷，AI 將協助您判斷人選並生成精準面試問題。
            </p>
            
            <div className="space-y-8">
                {/* JD Section */}
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                    <label className="flex items-center justify-between text-base font-bold text-slate-700 mb-4">
                        <div className="flex items-center gap-2">
                            <FileText size={18} className="text-blue-600"/> 職位描述 (JD) <span className="text-red-500">*</span>
                        </div>
                        {isParsingJd && <span className="text-xs text-blue-600 flex items-center gap-1"><Loader2 size={12} className="animate-spin"/> 解析中...</span>}
                    </label>
                    
                    <div className="mb-4">
                        <label 
                            className={`flex flex-col items-center justify-center w-full h-40 transition border-2 border-dashed rounded-xl cursor-pointer
                                ${isDraggingJd 
                                    ? 'border-blue-500 bg-blue-50 scale-[1.01] shadow-md' 
                                    : jdText ? 'border-blue-500 bg-blue-50/20' : 'border-gray-300 bg-white hover:border-blue-500 hover:bg-white'
                                }
                            `}
                            {...jdDragHandlers}
                        >
                            {isParsingJd ? (
                                <Loader2 className="animate-spin text-blue-500" size={28} />
                            ) : (
                                <div className="text-center p-4">
                                    <div className={`w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center ${isDraggingJd || jdText ? 'bg-blue-100' : 'bg-gray-100'}`}>
                                        <UploadCloud className={`${isDraggingJd || jdText ? 'text-blue-600' : 'text-gray-400'}`} size={24} />
                                    </div>
                                    <span className={`block font-bold text-sm mb-1 ${isDraggingJd || jdText ? 'text-blue-700' : 'text-gray-600'}`}>
                                        {isDraggingJd ? '放開上傳' : jdText ? '已匯入 JD (點擊更換)' : '拖曳或點擊上傳'}
                                    </span>
                                    <span className="text-xs text-gray-400">PDF, Word, Excel, Text</span>
                                </div>
                            )}
                            <input 
                                type="file" 
                                className="hidden" 
                                accept=".pdf,.docx,.txt,.xlsx,.xls"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if(file) handleJdFileProcess(file);
                                }}
                                disabled={isParsingJd}
                            />
                        </label>
                    </div>

                    <textarea 
                        className="w-full h-40 border border-gray-300 rounded-xl p-4 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 resize-none text-sm bg-white placeholder:text-slate-400"
                        placeholder="或在此貼上職缺內容..."
                        value={jdText}
                        onChange={(e) => setJdText(e.target.value)}
                    />
                </div>

                {/* Resume Section */}
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                    <label className="flex items-center justify-between text-base font-bold text-slate-700 mb-4">
                        <div className="flex items-center gap-2">
                            <FileType size={18} className="text-green-600"/> 候選人履歷 (Resume)
                        </div>
                        {isParsingResume && <span className="text-xs text-green-600 flex items-center gap-1"><Loader2 size={12} className="animate-spin"/> 解析中...</span>}
                    </label>
                    
                    <div className="mb-4">
                        <label 
                            className={`flex flex-col items-center justify-center w-full h-40 transition border-2 border-dashed rounded-xl cursor-pointer
                                ${isDraggingResume 
                                    ? 'border-green-500 bg-green-50 scale-[1.01] shadow-md' 
                                    : resumeText ? 'border-green-500 bg-green-50/20' : 'border-gray-300 bg-white hover:border-green-500 hover:bg-white'
                                }
                            `}
                            {...resumeDragHandlers}
                        >
                            {isParsingResume ? (
                                <Loader2 className="animate-spin text-green-500" size={28} />
                            ) : (
                                <div className="text-center p-4">
                                    <div className={`w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center ${isDraggingResume || resumeText ? 'bg-green-100' : 'bg-gray-100'}`}>
                                        <UploadCloud className={`${isDraggingResume || resumeText ? 'text-green-600' : 'text-gray-400'}`} size={24} />
                                    </div>
                                    <span className={`block font-bold text-sm mb-1 ${isDraggingResume || resumeText ? 'text-green-700' : 'text-gray-600'}`}>
                                        {isDraggingResume ? '放開上傳' : resumeText ? '已解析履歷 (點擊更換)' : '拖曳或點擊上傳'}
                                    </span>
                                    <span className="text-xs text-gray-400">PDF, Word, Excel, Text</span>
                                </div>
                            )}
                            <input 
                                type="file" 
                                className="hidden" 
                                accept=".pdf,.docx,.txt,.xlsx,.xls"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if(file) handleResumeFileProcess(file);
                                }}
                                disabled={isParsingResume}
                            />
                        </label>
                    </div>

                    <textarea 
                        className="w-full h-40 border border-gray-300 rounded-xl p-4 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 resize-none text-sm bg-white placeholder:text-slate-400"
                        placeholder="或直接在此貼上履歷文字..."
                        value={resumeText}
                        onChange={(e) => setResumeText(e.target.value)}
                    />
                </div>
            </div>

            <div className="mt-8 grid md:grid-cols-2 gap-4">
                <button
                    onClick={handleAnalyzeMatch}
                    disabled={isLoading || !jdText || !resumeText}
                    className={`w-full font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98]
                        ${(!jdText || !resumeText) 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                            : 'bg-green-600 text-white hover:bg-green-700 shadow-green-600/20'
                        }`}
                >
                    {isLoading && activeTab === 'analysis' ? <Loader2 className="animate-spin" /> : <TrendingUp size={20} />}
                    分析履歷契合度 (需有履歷)
                </button>
                <button
                    onClick={handleGenerateQuestions}
                    disabled={isLoading || !jdText}
                    className="w-full bg-white hover:bg-blue-50 text-slate-700 border border-slate-300 font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all hover:border-blue-400 hover:text-blue-600 active:scale-[0.98]"
                >
                    {isLoading && activeTab === 'questions' ? <Loader2 className="animate-spin" /> : <ClipboardList size={20} />}
                    {resumeText ? '生成客製化面試題' : '生成通用面試題 (僅 JD)'}
                </button>
            </div>
        </div>
      </div>
      )}

      {/* STEP 2: RESULT */}
      {step === 'result' && (
      <div className="animate-enter pb-10">
         <div className="flex items-center justify-between mb-6">
            <button 
                onClick={handleBackToEdit}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold transition-colors bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm hover:shadow-md"
            >
                <ArrowLeft size={18} /> 返回編輯
            </button>
            <div className="flex gap-2">
                <button 
                    onClick={handleExportExcel}
                    className="flex items-center gap-2 bg-white border border-green-200 text-green-700 px-4 py-2 rounded-lg hover:bg-green-50 transition-colors font-bold shadow-sm"
                >
                    <Download size={18} /> XLS
                </button>
                <button 
                    onClick={handleExportPDF}
                    className="flex items-center gap-2 bg-white border border-red-200 text-red-700 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors font-bold shadow-sm"
                >
                    <Download size={18} /> PDF
                </button>
            </div>
         </div>

         <div id="interview-result" className="bg-white rounded-2xl shadow-xl border border-gray-200 flex flex-col min-h-[600px] overflow-hidden max-w-7xl mx-auto w-full">
            {/* Hero Header */}
            <div className="bg-slate-900 p-8 text-white relative overflow-hidden flex-shrink-0">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Users size={160} />
                </div>
                <div className="relative z-10">
                     <div className="flex items-center gap-2 mb-2 text-green-300 font-bold text-sm tracking-widest uppercase">
                        <TrendingUp size={14} /> Interview Analysis
                     </div>
                     <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
                         {analysisResult ? "Candidate Fit Analysis" : "Interview Guide"}
                     </h2>
                     {analysisResult && (
                         <div className="flex items-center gap-4 mt-2">
                             <span className={`px-3 py-1 rounded-full text-sm font-bold border ${
                                 analysisResult.score >= 80 ? 'bg-green-500/20 border-green-400 text-green-300' :
                                 'bg-yellow-500/20 border-yellow-400 text-yellow-300'
                             }`}>
                                Score: {analysisResult.score}
                             </span>
                             <span className="text-slate-300 text-sm flex items-center gap-1">
                                {analysisResult.recommendation}
                             </span>
                         </div>
                     )}
                </div>
            </div>

             {/* Tabs */}
            <div className="flex border-b border-gray-200 bg-slate-50">
                <button 
                    onClick={() => setActiveTab('analysis')}
                    className={`flex-1 py-4 text-base font-bold flex items-center justify-center gap-2 transition-colors relative
                        ${activeTab === 'analysis' ? 'text-green-700 bg-white' : 'text-slate-500 hover:bg-gray-100'}
                    `}
                >
                    <Search size={20} /> 契合度分析
                    {activeTab === 'analysis' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-green-600"></div>}
                </button>
                <button 
                    onClick={() => setActiveTab('questions')}
                    className={`flex-1 py-4 text-base font-bold flex items-center justify-center gap-2 transition-colors relative
                        ${activeTab === 'questions' ? 'text-blue-700 bg-white' : 'text-slate-500 hover:bg-gray-100'}
                    `}
                >
                    <ClipboardList size={20} /> 面試題庫
                    {activeTab === 'questions' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></div>}
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto bg-slate-50 p-8">
                {/* Analysis Grid Layout */}
                {activeTab === 'analysis' && analysisResult && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-10 max-w-6xl mx-auto">
                        {/* Card 1: Score */}
                        <ResultCard 
                            title="整體評分 (Overall Score)" 
                            icon={BarChart3} 
                            colorClass="bg-blue-100 text-blue-800"
                            onCopy={() => copyText(`Score: ${analysisResult.score}/100\n${analysisResult.summary}`)}
                        >
                            <div className="flex items-center gap-6">
                                <div className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl font-black border-8 
                                    ${analysisResult.score >= 80 ? 'border-green-500 text-green-600 bg-green-50' : 
                                    analysisResult.score >= 60 ? 'border-yellow-500 text-yellow-600 bg-yellow-50' : 
                                    'border-red-500 text-red-600 bg-red-50'}`}
                                >
                                    {analysisResult.score}
                                </div>
                                <div className="flex-1">
                                    <p className="text-base text-slate-600 font-medium leading-relaxed">{analysisResult.summary}</p>
                                </div>
                            </div>
                        </ResultCard>

                        {/* Card 2: Recommendation */}
                        <ResultCard 
                            title="錄取建議 (Recommendation)" 
                            icon={AlertCircle} 
                            colorClass={
                                analysisResult.recommendation === 'Strong Hire' || analysisResult.recommendation === 'Hire'
                                ? "bg-green-100 text-green-800"
                                : analysisResult.recommendation === 'Hold' ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"
                            }
                            onCopy={() => copyText(`Recommendation: ${analysisResult.recommendation}\nReason: ${analysisResult.reasoning}`)}
                        >
                            <div className="space-y-4">
                                <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-base font-bold border
                                    ${analysisResult.recommendation === 'Strong Hire' || analysisResult.recommendation === 'Hire'
                                        ? "bg-green-50 border-green-200 text-green-700"
                                        : analysisResult.recommendation === 'Hold' ? "bg-yellow-50 border-yellow-200 text-yellow-700" : "bg-red-50 border-red-200 text-red-700"
                                    }
                                `}>
                                    {analysisResult.recommendation === 'Strong Hire' || analysisResult.recommendation === 'Hire' ? <ThumbsUp size={18}/> : 
                                    analysisResult.recommendation === 'Reject' ? <ThumbsDown size={18}/> : <MinusCircle size={18}/>}
                                    {analysisResult.recommendation}
                                </div>
                                <p className="text-sm text-slate-700 leading-relaxed font-medium">{analysisResult.reasoning}</p>
                            </div>
                        </ResultCard>

                        {/* Card 3: Detailed Analysis */}
                        <div className="md:col-span-2">
                            <ResultCard 
                                title="詳細分析 (Detailed Analysis)" 
                                icon={Search} 
                                colorClass="bg-purple-100 text-purple-800"
                                onCopy={() => copyText(`Strengths:\n${analysisResult.strengths.join('\n')}\n\nWeaknesses:\n${analysisResult.weaknesses.join('\n')}`)}
                            >
                                <div className="grid md:grid-cols-2 gap-8">
                                    <div>
                                        <h5 className="font-bold text-green-700 mb-3 flex items-center gap-1.5 text-sm uppercase tracking-wide"><CheckCircle2 size={16}/> 優勢 (Strengths)</h5>
                                        <ul className="space-y-3">
                                            {analysisResult.strengths.map((s, i) => (
                                                <li key={i} className="text-sm text-slate-700 flex items-start gap-3 bg-green-50/50 p-2 rounded-lg">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0"></span>
                                                    {s}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div>
                                        <h5 className="font-bold text-red-700 mb-3 flex items-center gap-1.5 text-sm uppercase tracking-wide"><AlertCircle size={16}/> 風險/劣勢 (Risks)</h5>
                                        <ul className="space-y-3">
                                            {analysisResult.weaknesses.map((w, i) => (
                                                <li key={i} className="text-sm text-slate-700 flex items-start gap-3 bg-red-50/50 p-2 rounded-lg">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 flex-shrink-0"></span>
                                                    {w}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </ResultCard>
                        </div>

                        {/* Card 4: Suggested Questions (Analysis Tab Only) */}
                        <div className="md:col-span-2">
                            <ResultCard 
                                title="建議面試提問 (Suggested Questions)" 
                                icon={MessageCircleQuestion} 
                                colorClass="bg-orange-100 text-orange-800"
                                onCopy={() => copyText(analysisResult.interviewQuestions.join('\n'))}
                            >
                                <ul className="space-y-4">
                                    {analysisResult.interviewQuestions.map((q, i) => (
                                        <li key={i} className="flex gap-4 items-start p-4 bg-orange-50/30 rounded-xl border border-orange-100 hover:bg-orange-50 transition-colors">
                                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-200 text-orange-700 flex items-center justify-center text-xs font-bold mt-0.5 shadow-sm">
                                                {i + 1}
                                            </span>
                                            <span className="text-base text-slate-800 font-medium">{q}</span>
                                        </li>
                                    ))}
                                </ul>
                            </ResultCard>
                        </div>
                    </div>
                )}

                {/* Questions Tab (Structured Cards) */}
                {activeTab === 'questions' && questionsResult && (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 pb-10 max-w-7xl mx-auto">
                        {/* 1. Resume Deep Dive */}
                        <ResultCard 
                            title="Resume Deep Dive (履歷深入探討)" 
                            icon={FileText} 
                            colorClass="bg-sky-100 text-sky-800"
                            onCopy={() => copyText(questionsResult.resumeDeepDive.join('\n'))}
                        >
                            <ul className="space-y-4">
                                {questionsResult.resumeDeepDive.map((q, i) => (
                                    <li key={i} className="flex gap-3 items-start text-sm text-slate-700 bg-sky-50 p-3 rounded-lg border border-sky-100">
                                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-sky-200 text-sky-700 flex items-center justify-center text-xs font-bold mt-0.5">
                                            {i + 1}
                                        </span>
                                        <span className="leading-relaxed">{q}</span>
                                    </li>
                                ))}
                            </ul>
                        </ResultCard>

                        {/* 2. Gap Analysis */}
                        <ResultCard 
                            title="Gap Analysis (技能差距分析)" 
                            icon={AlertTriangle} 
                            colorClass="bg-amber-100 text-amber-800"
                            onCopy={() => copyText(questionsResult.gapAnalysis.join('\n'))}
                        >
                             <ul className="space-y-4">
                                {questionsResult.gapAnalysis.map((q, i) => (
                                    <li key={i} className="flex gap-3 items-start text-sm text-slate-700 bg-amber-50 p-3 rounded-lg border border-amber-100">
                                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-200 text-amber-700 flex items-center justify-center text-xs font-bold mt-0.5">
                                            {i + 1}
                                        </span>
                                        <span className="leading-relaxed">{q}</span>
                                    </li>
                                ))}
                            </ul>
                        </ResultCard>

                        {/* 3. Behavioral Questions */}
                        <ResultCard 
                            title="Behavioral Questions (行為面試)" 
                            icon={BrainCircuit} 
                            colorClass="bg-purple-100 text-purple-800"
                            onCopy={() => copyText(questionsResult.behavioralQuestions.join('\n'))}
                        >
                             <ul className="space-y-4">
                                {questionsResult.behavioralQuestions.map((q, i) => (
                                    <li key={i} className="flex gap-3 items-start text-sm text-slate-700 bg-purple-50 p-3 rounded-lg border border-purple-100">
                                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-200 text-purple-700 flex items-center justify-center text-xs font-bold mt-0.5">
                                            {i + 1}
                                        </span>
                                        <span className="leading-relaxed">{q}</span>
                                    </li>
                                ))}
                            </ul>
                        </ResultCard>
                    </div>
                )}
                
                {(!questionsResult && !analysisResult) && (
                     <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                         <p>請先進行分析或生成。</p>
                     </div>
                )}
            </div>
         </div>
      </div>
      )}
    </div>
  );
};

export default InterviewCopilot;
