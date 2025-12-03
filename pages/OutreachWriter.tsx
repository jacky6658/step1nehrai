import React, { useState, useEffect } from 'react';
import { generateOutreachMessage } from '../services/geminiService';
import { exportElementToPDF, exportToExcel } from '../services/exportService';
import { Loader2, Send, Globe, Download, Copy, Check, Mail, Zap, MessageCircle, FileText, UploadCloud, FileType, File, ArrowLeft, User, Briefcase } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Language, LANGUAGE_OPTIONS, OutreachOption, SharedData } from '../types';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs`;

interface OutreachWriterProps {
    initialData?: SharedData;
}

const OutreachWriter: React.FC<OutreachWriterProps> = ({ initialData }) => {
  const [step, setStep] = useState<'input' | 'result'>('input');
  
  const [formData, setFormData] = useState({
    candidateName: '',
    position: '',
    company: '',
    tone: 'professional',
    points: ''
  });
  const [language, setLanguage] = useState<Language>('zh-TW');
  
  // File Context States
  const [resumeText, setResumeText] = useState('');
  const [jdText, setJdText] = useState('');
  const [isParsingResume, setIsParsingResume] = useState(false);
  const [isParsingJD, setIsParsingJD] = useState(false);
  
  // UI Drag States
  const [isDraggingResume, setIsDraggingResume] = useState(false);
  const [isDraggingJD, setIsDraggingJD] = useState(false);

  const [outreachOptions, setOutreachOptions] = useState<OutreachOption[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  
  const [isLoading, setIsLoading] = useState(false);
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);

  // Pre-fill data
  useEffect(() => {
      if(initialData) {
          setFormData(prev => ({
              ...prev,
              position: initialData.jobTitle || prev.position,
              points: initialData.sellingPoints || prev.points
          }));
          if (initialData.jobDescriptionContext) {
              setJdText(initialData.jobDescriptionContext);
          }
      }
  }, [initialData]);

  // Helper to detect CJK characters
  const isCJK = (str: string) => /[\u4e00-\u9fa5]/.test(str);

  const parseDocument = async (file: File): Promise<string> => {
    const fileNameLower = file.name.toLowerCase();
    let text = '';

    if (file.type === 'application/pdf' || fileNameLower.endsWith('.pdf')) {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({
            data: new Uint8Array(arrayBuffer),
            cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/cmaps/',
            cMapPacked: true,
            standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/standard_fonts/'
        });
        const pdf = await loadingTask.promise;
        
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            
            let lastItemStr = '';
            const pageText = textContent.items.map((item: any) => {
                const str = item.str;
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
    } else if (file.type.startsWith('text/') || fileNameLower.endsWith('.txt')) {
        text = await file.text();
    } else {
        throw new Error('不支援的檔案格式。請上傳 PDF, Word (.docx) 或純文字檔。');
    }
    return text;
  };

  const handleFileProcess = async (file: File, type: 'resume' | 'jd') => {
      if (!file) return;
      
      if (type === 'resume') setIsParsingResume(true);
      else setIsParsingJD(true);

      try {
          const text = await parseDocument(file);
          if (!text.trim()) throw new Error("無法提取文字，請確認檔案內容。");
          
          if (type === 'resume') setResumeText(text);
          else setJdText(text);

      } catch (error: any) {
          console.error(`${type} Parsing Error:`, error);
          alert(error.message || '檔案解析失敗');
      } finally {
          if (type === 'resume') setIsParsingResume(false);
          else setIsParsingJD(false);
      }
  };

  const createDragHandlers = (setIsDragging: (v: boolean) => void, type: 'resume' | 'jd') => ({
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); },
    onDragLeave: (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); },
    onDrop: (e: React.DragEvent) => { 
        e.preventDefault(); e.stopPropagation(); setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if(file) handleFileProcess(file, type);
    }
  });

  const handleGenerate = async () => {
    // If files are provided, candidate name might be optional, but better to enforce at least name
    if (!formData.candidateName && !resumeText) {
        alert("請輸入候選人姓名或上傳履歷");
        return;
    }

    setIsLoading(true);
    setOutreachOptions([]);
    setActiveTab(0);
    
    const options = await generateOutreachMessage(
        language,
        formData.candidateName || "Candidate", 
        formData.position, 
        formData.company, 
        formData.tone, 
        formData.points,
        resumeText,
        jdText
    );
    
    if (options.length > 0) {
        setOutreachOptions(options);
        setStep('result');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setIsLoading(false);
  };

  const copySubject = () => {
    if (!outreachOptions[activeTab]) return;
    navigator.clipboard.writeText(outreachOptions[activeTab].subject);
    setCopiedSubject(true);
    setTimeout(() => setCopiedSubject(false), 2000);
  };

  const copyBody = () => {
    if (!outreachOptions[activeTab]) return;
    navigator.clipboard.writeText(outreachOptions[activeTab].content);
    setCopiedBody(true);
    setTimeout(() => setCopiedBody(false), 2000);
  };

  const handleExportPDF = () => {
    if (outreachOptions.length === 0) return;
    const current = outreachOptions[activeTab];
    const filename = `Outreach_${current.type}`;
    exportElementToPDF(filename, 'outreach-result');
  };

  const handleExportExcel = () => {
    if (outreachOptions.length === 0) return;
    const current = outreachOptions[activeTab];
    const data = [
        { Section: 'Candidate', Content: formData.candidateName },
        { Section: 'Role', Content: formData.position },
        { Section: 'Strategy', Content: current.type },
        { Section: 'Subject', Content: current.subject },
        { Section: 'Body', Content: current.content }
    ];
    exportToExcel(`Outreach_${formData.candidateName}`, data);
  };
  
  const handleBackToEdit = () => {
      setStep('input');
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Helper for Tab Icons
  const getTabIcon = (idx: number) => {
      switch(idx) {
          case 0: return <Zap size={16} />;
          case 1: return <FileText size={16} />;
          case 2: return <MessageCircle size={16} />;
          default: return <Mail size={16} />;
      }
  };

  return (
    <div className="w-full h-full">
      {/* STEP 1: INPUT */}
      {step === 'input' && (
      <div className="max-w-4xl mx-auto animate-enter pb-10">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <span className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Send size={24}/></span>
                    開發信撰寫助手
                </h2>
                <div className="flex items-center gap-2">
                    <Globe size={18} className="text-slate-400" />
                    <select 
                        value={language}
                        onChange={(e) => setLanguage(e.target.value as Language)}
                        className="text-sm border border-gray-300 rounded-lg p-2 outline-none focus:ring-1 focus:ring-purple-500 bg-white text-slate-700"
                    >
                        {LANGUAGE_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
            </div>
            
            <div className="space-y-8">
            {/* File Uploads Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Resume Upload */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                        <FileType size={14} className="text-green-600"/> 候選人履歷 (Resume)
                    </label>
                    <label 
                        className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-all
                            ${isDraggingResume 
                                ? 'border-green-500 bg-green-50 shadow-inner' 
                                : resumeText ? 'border-green-500 bg-green-50/30' : 'border-gray-200 bg-gray-50 hover:bg-green-50/50 hover:border-green-400'
                            }
                        `}
                        {...createDragHandlers(setIsDraggingResume, 'resume')}
                    >
                        {isParsingResume ? (
                            <Loader2 className="animate-spin text-green-600" size={28} />
                        ) : (
                            <div className={`p-3 rounded-full mb-2 ${resumeText ? 'bg-green-100' : 'bg-gray-200'}`}>
                                <UploadCloud className={resumeText ? 'text-green-600' : 'text-gray-500'} size={24} />
                            </div>
                        )}
                        <span className="text-sm text-center font-bold text-slate-600 px-2">
                            {isParsingResume ? '解析中...' : resumeText ? '已匯入履歷 (可更換)' : '上傳履歷 PDF/Word'}
                        </span>
                        <input 
                            type="file" className="hidden" accept=".pdf,.docx,.txt"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if(file) handleFileProcess(file, 'resume');
                            }}
                        />
                    </label>
                </div>

                {/* JD Upload */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                        <File size={14} className="text-blue-600"/> 職缺描述 (JD)
                    </label>
                    <label 
                        className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-all
                            ${isDraggingJD 
                                ? 'border-blue-500 bg-blue-50 shadow-inner' 
                                : jdText ? 'border-blue-500 bg-blue-50/30' : 'border-gray-200 bg-gray-50 hover:bg-blue-50/50 hover:border-blue-400'
                            }
                        `}
                        {...createDragHandlers(setIsDraggingJD, 'jd')}
                    >
                        {isParsingJD ? (
                            <Loader2 className="animate-spin text-blue-600" size={28} />
                        ) : (
                            <div className={`p-3 rounded-full mb-2 ${jdText ? 'bg-blue-100' : 'bg-gray-200'}`}>
                                <UploadCloud className={jdText ? 'text-blue-600' : 'text-gray-500'} size={24} />
                            </div>
                        )}
                        <span className="text-sm text-center font-bold text-slate-600 px-2">
                            {isParsingJD ? '解析中...' : jdText ? '已匯入 JD (可更換)' : '上傳 JD PDF/Word'}
                        </span>
                        <input 
                            type="file" className="hidden" accept=".pdf,.docx,.txt"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if(file) handleFileProcess(file, 'jd');
                            }}
                        />
                    </label>
                </div>
            </div>

            <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                    <span className="px-3 bg-white text-gray-400 font-medium">基本資訊 (若有文件，AI 會自動參考)</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">候選人姓名</label>
                    <input 
                    type="text"
                    className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="例如：John Doe"
                    value={formData.candidateName}
                    onChange={(e) => setFormData({...formData, candidateName: e.target.value})}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">目標職位</label>
                    <input 
                    type="text"
                    className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="例如：CTO"
                    value={formData.position}
                    onChange={(e) => setFormData({...formData, position: e.target.value})}
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">客戶 / 公司名稱</label>
                <input 
                type="text"
                className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="例如：知名 AI 新創"
                value={formData.company}
                onChange={(e) => setFormData({...formData, company: e.target.value})}
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">訊息語氣</label>
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { id: 'professional', label: '專業' },
                        { id: 'casual', label: '親切/輕鬆' },
                        { id: 'persuasive', label: '說服力強' }
                    ].map((t) => (
                        <button 
                            key={t.id}
                            onClick={() => setFormData({...formData, tone: t.id})}
                            className={`py-3 px-3 rounded-lg text-sm font-medium border ${formData.tone === t.id ? 'bg-purple-50 border-purple-500 text-purple-700' : 'bg-white border-gray-200 text-slate-600 hover:bg-gray-50'}`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">職位賣點 (或額外備註)</label>
                <textarea 
                className="w-full border border-gray-300 rounded-lg p-3 h-24 outline-none focus:ring-2 focus:ring-purple-500 resize-none text-sm"
                placeholder={jdText ? "已上傳 JD，可在此補充額外亮點 (如：剛拿到 B 輪融資)..." : "請輸入職缺亮點..."}
                value={formData.points}
                onChange={(e) => setFormData({...formData, points: e.target.value})}
                />
            </div>

            <button
                onClick={handleGenerate}
                disabled={isLoading || (!formData.candidateName && !resumeText)}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg transform active:scale-[0.99]"
            >
                {isLoading ? <Loader2 className="animate-spin" /> : <Send size={20} />}
                {isLoading ? 'AI 正在撰寫...' : `生成開發信 (${LANGUAGE_OPTIONS.find(l => l.value === language)?.label})`}
            </button>
            </div>
        </div>
      </div>
      )}

      {/* STEP 2: RESULT */}
      {step === 'result' && outreachOptions.length > 0 && (
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

         <div id="outreach-result" className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden min-h-[600px] flex flex-col max-w-5xl mx-auto w-full">
             {/* Header */}
             <div className="bg-slate-900 p-8 text-white relative overflow-hidden flex-shrink-0">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Send size={160} />
                </div>
                <div className="relative z-10">
                     <div className="flex items-center gap-2 mb-2 text-purple-300 font-bold text-sm tracking-widest uppercase">
                        <Mail size={14} /> Outreach Generated
                     </div>
                     <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
                         To: {formData.candidateName || "Candidate"}
                     </h2>
                     <div className="flex gap-4 text-slate-300 text-sm">
                        <span className="flex items-center gap-1"><Briefcase size={14}/> {formData.position || "Target Role"}</span>
                     </div>
                </div>
            </div>

             {/* Tabs */}
            <div className="flex border-b border-gray-200 bg-slate-50">
                {outreachOptions.map((opt, idx) => (
                    <button
                        key={idx}
                        onClick={() => setActiveTab(idx)}
                        className={`flex-1 py-4 text-sm md:text-base font-bold flex items-center justify-center gap-2 transition-all relative
                            ${activeTab === idx ? 'text-purple-700 bg-white' : 'text-slate-500 hover:text-slate-700 hover:bg-gray-100'}
                        `}
                    >
                        {getTabIcon(idx)}
                        <span className="truncate max-w-[120px] md:max-w-none">{opt.type}</span>
                        {activeTab === idx && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-600"></div>}
                    </button>
                ))}
            </div>

            {/* Email Editor UI */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-white">
                
                {/* Subject Line */}
                <div className="bg-slate-50 p-6 rounded-xl border border-gray-200">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-3 ml-1">
                        主旨 (Subject Line)
                    </label>
                    <div className="flex items-center gap-3">
                        <div className="flex-grow relative">
                            <input 
                                readOnly
                                value={outreachOptions[activeTab].subject}
                                className="w-full border border-gray-300 rounded-lg py-3 px-4 bg-white text-slate-800 font-bold text-lg focus:outline-none"
                            />
                        </div>
                        <button 
                            onClick={copySubject}
                            className="p-3 bg-white border border-gray-300 rounded-lg text-slate-500 hover:text-purple-600 hover:border-purple-300 transition-colors shadow-sm"
                            title="複製主旨"
                        >
                            {copiedSubject ? <Check size={20} /> : <Copy size={20} />}
                        </button>
                    </div>
                </div>

                {/* Email Body */}
                <div className="flex-1 flex flex-col">
                        <div className="flex items-center justify-between mb-3 ml-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                            內文 (Email Body)
                        </label>
                        <button 
                            onClick={copyBody}
                            className="text-sm flex items-center gap-1.5 text-purple-600 hover:text-purple-800 font-bold bg-purple-50 px-3 py-1.5 rounded-lg transition-colors"
                        >
                            {copiedBody ? <Check size={16} /> : <Copy size={16} />}
                            {copiedBody ? '已複製內容' : '複製內容'}
                        </button>
                        </div>
                        <div className="bg-white border border-gray-300 rounded-xl p-8 shadow-sm min-h-[300px] prose prose-lg max-w-none prose-purple">
                        <ReactMarkdown>{outreachOptions[activeTab].content}</ReactMarkdown>
                        </div>
                </div>
            </div>
         </div>
      </div>
      )}
    </div>
  );
};

export default OutreachWriter;