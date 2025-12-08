
import React, { useState, useRef, useEffect } from 'react';
import { generateJobDescription } from '../services/geminiService';
import { exportElementToPDF, exportToExcel } from '../services/exportService';
import { Loader2, Copy, Check, RefreshCw, Sparkles, FileCheck, Globe, Download, UploadCloud, FileText, Share2, LayoutTemplate, Type, Trash2, Briefcase, Code, PenTool, Eraser, ArrowLeft, Building2, Linkedin, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Language, LANGUAGE_OPTIONS, SharedData } from '../types';
import * as pdfjsLib from 'pdfjs-dist';
import * as XLSX from "xlsx";
import mammoth from 'mammoth';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs`;

interface JDGeneratorProps {
    initialData?: SharedData;
}

const JDGenerator: React.FC<JDGeneratorProps> = ({ initialData }) => {
  const [step, setStep] = useState<'input' | 'result'>('input');
  
  const [formData, setFormData] = useState({
    title: '',
    seniority: 'Mid-Level',
    skills: '',
    culture: ''
  });
  
  // Input Mode State: 'upload' or 'text'
  const [inputMode, setInputMode] = useState<'upload' | 'text'>('upload');
  
  const [fileContent, setFileContent] = useState('');
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [fileName, setFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const [language, setLanguage] = useState<Language>('zh-TW');
  
  // Results for both tabs
  const [resultPlatform, setResultPlatform] = useState('');
  const [resultSocial, setResultSocial] = useState('');
  const [activeTab, setActiveTab] = useState<'platform' | 'social'>('platform');
  const [isEditing, setIsEditing] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Social Integration State
  const [isLinkedInConnected, setIsLinkedInConnected] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Check LinkedIn connection
  useEffect(() => {
      // Check for token instead of simple boolean
      const token = localStorage.getItem('linkedin_access_token');
      setIsLinkedInConnected(!!token);
  }, []);

  // Pre-fill data
  useEffect(() => {
      if(initialData) {
          setFormData(prev => ({
              ...prev,
              title: initialData.jobTitle || prev.title,
              skills: initialData.skills || prev.skills,
              culture: initialData.cultureValues || prev.culture
          }));
          if (initialData.jobDescriptionContext) {
              setInputMode('text');
              setFileContent(initialData.jobDescriptionContext);
          }
      }
  }, [initialData]);

  // Helper to detect CJK characters
  const isCJK = (str: string) => /[\u4e00-\u9fa5]/.test(str);

  // Core file processing logic
  const processFile = async (file: File) => {
    if (!file) return;

    setIsParsingFile(true);
    setFileName(file.name);
    try {
        let text = '';
        const fileNameLower = file.name.toLowerCase();
        
        if (file.type === 'application/pdf' || fileNameLower.endsWith('.pdf')) {
            try {
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
                    
                    // Improved text extraction for CJK
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
                    
                    fullText += `--- Page ${i} ---\n${pageText}\n\n`;
                }
                text = fullText;
            } catch (pdfError) {
                console.error("PDF Parsing detailed error:", pdfError);
                throw new Error("PDF 解析失敗。請確認檔案未加密且未損壞。");
            }
        } else if (fileNameLower.endsWith('.xlsx') || fileNameLower.endsWith('.xls')) {
            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            text = XLSX.utils.sheet_to_txt(worksheet);
        } else if (fileNameLower.endsWith('.docx')) {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            text = result.value;
        } else if (file.type.startsWith('text/') || fileNameLower.endsWith('.txt') || fileNameLower.endsWith('.md')) {
            text = await file.text();
        } else {
            alert('不支援的檔案格式。請上傳 PDF, Word (.docx), Excel 或純文字檔。');
            setFileName('');
            setIsParsingFile(false);
            return;
        }

        if (!text.trim()) {
            throw new Error("無法從檔案中提取文字，請確認檔案內容不為空或是純圖片掃描檔。");
        }

        setFileContent(text);
        setInputMode('text');
    } catch (error: any) {
        console.error('File parsing error:', error);
        alert(error.message || '檔案解析失敗，請確認檔案格式正確。');
        setFileName('');
        setFileContent('');
    } finally {
        setIsParsingFile(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleClear = () => {
      setFormData({
        title: '',
        seniority: 'Mid-Level',
        skills: '',
        culture: ''
      });
      setFileContent('');
      setFileName('');
      setResultPlatform('');
      setResultSocial('');
  };

  const handleGenerate = async () => {
    if (!formData.title && !fileContent) {
        alert("請輸入職位名稱或上傳參考文件");
        return;
    }

    setIsLoading(true);
    setResultPlatform('');
    setResultSocial('');
    setActiveTab('platform');

    const response = await generateJobDescription(
        language,
        formData.title || "未指定職稱 (請參考文件)", 
        formData.skills, 
        formData.seniority, 
        formData.culture,
        fileContent
    );
    
    setResultPlatform(response.platform);
    setResultSocial(response.social);
    setIsLoading(false);
    setStep('result');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentResult = activeTab === 'platform' ? resultPlatform : resultSocial;

  const handleContentUpdate = (newContent: string) => {
      if (activeTab === 'platform') {
          setResultPlatform(newContent);
      } else {
          setResultSocial(newContent);
      }
  };

  const copyToClipboard = () => {
    if (!currentResult) return;
    navigator.clipboard.writeText(currentResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportPDF = () => {
    if (!currentResult) return;
    const title = activeTab === 'platform' ? `${formData.title}_JD_104` : `${formData.title}_JD_Social`;
    exportElementToPDF(title, 'jd-result');
  };

  const handleExportExcel = () => {
    if (!currentResult) return;
    const data = [
        { Section: 'Basic Info', Content: `Title: ${formData.title}, Seniority: ${formData.seniority}` },
        { Section: 'JD Content', Content: currentResult }
    ];
    exportToExcel(`${formData.title}_JD_${activeTab}`, data);
  };

  const handlePublishToLinkedIn = async () => {
      if (!isLinkedInConnected) {
          alert("請先至 [設定] 頁面綁定 LinkedIn 帳號");
          return;
      }
      
      if (!currentResult) return;
      
      setIsPublishing(true);
      try {
          const accessToken = localStorage.getItem('linkedin_access_token');
          
          const response = await fetch('/api/linkedin/share', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                  text: currentResult,
                  accessToken: accessToken
              })
          });

          if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Publishing failed');
          }

          const result = await response.json();
          alert("發布成功！JD 已同步至您的 LinkedIn 動態。");
          
          // Optionally link to the post if ID is returned
          if(result.postId) {
             console.log("Published Post ID:", result.postId);
          }

      } catch (error: any) {
          console.error("LinkedIn Publish Error:", error);
          alert(`發布失敗: ${error.message}`);
      } finally {
          setIsPublishing(false);
      }
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl lg:text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <span className="p-2 bg-blue-100 text-blue-600 rounded-lg"><RefreshCw size={24}/></span>
                    JD 職缺生成器
                </h2>
                
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleClear}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="清空表單"
                    >
                        <Eraser size={18} />
                    </button>
                    <div className="h-4 w-px bg-gray-200"></div>
                    <Globe size={16} className="text-slate-400" />
                    <select 
                        value={language}
                        onChange={(e) => setLanguage(e.target.value as Language)}
                        className="text-sm border border-gray-300 rounded-md p-1.5 outline-none focus:ring-1 focus:ring-blue-500 bg-white text-slate-700 font-medium"
                    >
                        {LANGUAGE_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
            </div>
            
            <div className="space-y-8">
                {/* Main Title Input */}
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                        <Briefcase size={16} className="text-blue-500"/> 職位名稱 (Job Title) <span className="text-red-500">*</span>
                    </label>
                    <input 
                    type="text"
                    className="w-full border border-gray-300 rounded-lg p-3.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-lg font-medium placeholder:font-normal"
                    placeholder="例如：Frontend Engineer, Product Manager..."
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    />
                </div>

                {/* Reference Import Section */}
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                        <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                            <FileText size={16} /> 匯入參考資訊 (可選)
                        </label>
                        
                        {/* Segmented Toggle */}
                        <div className="flex bg-white rounded-lg p-1 border border-gray-200 shadow-sm">
                            <button 
                                onClick={() => setInputMode('upload')}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${inputMode === 'upload' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-gray-100'}`}
                            >
                                <UploadCloud size={14} /> 檔案
                            </button>
                            <button 
                                onClick={() => setInputMode('text')}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${inputMode === 'text' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-gray-100'}`}
                            >
                                <Type size={14} /> 文字
                            </button>
                        </div>
                    </div>

                    {inputMode === 'upload' ? (
                        <div className="relative">
                            <label 
                                className={`flex flex-col items-center justify-center w-full h-auto py-10 px-4 transition border-2 border-dashed rounded-xl cursor-pointer group
                                    ${isDragging 
                                        ? 'border-blue-500 bg-blue-50 scale-[1.01] shadow-inner' 
                                        : fileName ? 'border-blue-500 bg-blue-50/50' : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-white'
                                    }
                                `}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                            >
                                {isParsingFile ? (
                                    <Loader2 className="animate-spin text-blue-500 mb-2" size={28} />
                                ) : (
                                    <div className={`p-3 rounded-full mb-3 transition-colors ${isDragging || fileName ? 'bg-blue-100' : 'bg-gray-100 group-hover:bg-blue-50'}`}>
                                        <UploadCloud className={`${isDragging || fileName ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-500'}`} size={28} />
                                    </div>
                                )}
                                
                                <span className={`font-medium text-sm text-center mb-1 ${isDragging || fileName ? 'text-blue-700' : 'text-slate-600'}`}>
                                    {isParsingFile ? '正在解析文件內容...' : isDragging ? '放開以開始上傳' : fileName || '點擊或拖曳檔案 (PDF / Word / Excel)'}
                                </span>
                                
                                {!isParsingFile && !fileName && (
                                    <span className="text-xs text-slate-400">支援 .pdf, .docx, .xlsx, .txt</span>
                                )}

                                <input 
                                    type="file" 
                                    className="hidden" 
                                    accept=".pdf,.txt,.xlsx,.xls,.doc,.docx"
                                    onChange={handleFileUpload}
                                    disabled={isParsingFile}
                                />
                            </label>
                        </div>
                    ) : (
                        <div className="relative group">
                            <textarea
                                value={fileContent}
                                onChange={(e) => setFileContent(e.target.value)}
                                className="w-full h-40 p-4 text-base border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white transition-all"
                                placeholder="請在此貼上主管的 Email、會議記錄或原始需求..."
                            />
                            {fileContent && (
                                <button 
                                    onClick={() => { setFileContent(''); setFileName(''); }}
                                    className="absolute top-2 right-2 p-1.5 bg-white border border-gray-200 rounded-md hover:bg-red-50 hover:border-red-200 text-gray-400 hover:text-red-500 transition-colors shadow-sm"
                                    title="清空內容"
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}
                            <p className="text-xs text-slate-400 mt-2 flex justify-between px-1">
                                <span>直接貼上，AI 自動整理。</span>
                                {fileContent && <span className="text-emerald-600 font-medium flex items-center gap-1"><Check size={12}/> 已輸入 {fileContent.length} 字</span>}
                            </p>
                        </div>
                    )}
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">資深程度 (Seniority)</label>
                        <div className="relative">
                            <select 
                                className="w-full appearance-none border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-base text-slate-700"
                                value={formData.seniority}
                                onChange={(e) => setFormData({...formData, seniority: e.target.value})}
                            >
                                <option value="Entry-Level">初階 (Entry-Level)</option>
                                <option value="Mid-Level">中階 (Mid-Level)</option>
                                <option value="Senior">資深 (Senior)</option>
                                <option value="Lead / Staff">領導 / Staff (Lead)</option>
                                <option value="Manager">管理職 (Manager)</option>
                                <option value="Director+">高階主管 (Director+)</option>
                            </select>
                            <div className="absolute right-3 top-3.5 pointer-events-none text-slate-500">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">公司文化 (Culture)</label>
                        <input 
                            type="text"
                            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none text-base"
                            placeholder="Ex: 新創、扁平化..."
                            value={formData.culture}
                            onChange={(e) => setFormData({...formData, culture: e.target.value})}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                        <Code size={16} className="text-slate-400"/> 必備技能 / 技術堆疊 (Skills)
                    </label>
                    <textarea 
                        className="w-full border border-gray-300 rounded-lg p-3 h-24 focus:ring-2 focus:ring-blue-500 outline-none resize-none text-base placeholder:text-slate-400"
                        placeholder="Ex: React, TypeScript, Node.js, AWS..."
                        value={formData.skills}
                        onChange={(e) => setFormData({...formData, skills: e.target.value})}
                    />
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={isLoading || (!formData.title && !fileContent)}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg transform active:scale-[0.98]"
                >
                    {isLoading ? <Loader2 className="animate-spin" /> : <Sparkles size={20} className="text-yellow-300" />}
                    {isLoading ? 'AI 正在撰寫 JD...' : `生成多版本 JD`}
                </button>
            </div>
        </div>
      </div>
      )}

      {/* STEP 2: RESULT */}
      {step === 'result' && (
      <div className="animate-enter pb-10">
        <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
            <button 
                onClick={handleBackToEdit}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold transition-colors bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm hover:shadow-md self-start md:self-auto"
            >
                <ArrowLeft size={18} /> 返回編輯
            </button>
            
            {currentResult && (
                <div className="flex gap-2 self-end md:self-auto">
                    {/* LinkedIn Publish Button */}
                    {isLinkedInConnected ? (
                        <button 
                            onClick={handlePublishToLinkedIn}
                            disabled={isPublishing}
                            className="flex items-center gap-2 bg-[#0077b5] hover:bg-[#006097] text-white px-4 py-2 rounded-lg transition-colors font-bold shadow-sm disabled:opacity-70"
                            title="一鍵發布至 LinkedIn"
                        >
                            {isPublishing ? <Loader2 size={18} className="animate-spin" /> : <Linkedin size={18} />}
                            {isPublishing ? '發布中...' : '發布'}
                        </button>
                    ) : (
                        <button 
                            onClick={() => alert("請先至 [設定] 頁面綁定 LinkedIn 帳號")}
                            className="flex items-center gap-2 bg-gray-100 text-gray-400 px-4 py-2 rounded-lg font-bold shadow-sm cursor-not-allowed"
                            title="請先至設定頁面綁定"
                        >
                            <Linkedin size={18} /> 發布
                        </button>
                    )}

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
            )}
        </div>

        <div id="jd-result" className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden min-h-[600px] flex flex-col max-w-5xl mx-auto w-full">
             {/* Header */}
             <div className="bg-slate-900 p-8 text-white relative overflow-hidden flex-shrink-0">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <FileCheck size={160} />
                </div>
                <div className="relative z-10">
                     <div className="flex items-center gap-2 mb-2 text-blue-300 font-bold text-sm tracking-widest uppercase">
                        <FileText size={14} /> Job Description Generated
                     </div>
                     <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">{formData.title || "Job Description"}</h2>
                     <div className="flex gap-4 text-slate-300 text-sm">
                        <span className="flex items-center gap-1"><Building2 size={14}/> {formData.culture || "General"}</span>
                        <span className="flex items-center gap-1"><Briefcase size={14}/> {formData.seniority}</span>
                     </div>
                </div>
            </div>

            {/* Output Header with Tabs */}
            <div className="border-b border-gray-200 bg-slate-50/50 flex justify-between items-center pr-4">
                <div className="flex flex-1">
                    <button 
                        onClick={() => { setActiveTab('platform'); setIsEditing(false); }}
                        className={`flex-1 py-4 text-base font-bold flex items-center justify-center gap-2 transition-colors relative
                            ${activeTab === 'platform' ? 'text-blue-700 bg-white' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}
                        `}
                    >
                        <LayoutTemplate size={20} /> 招募平台用
                        {activeTab === 'platform' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></div>}
                    </button>
                    <button 
                        onClick={() => { setActiveTab('social'); setIsEditing(false); }}
                        className={`flex-1 py-4 text-base font-bold flex items-center justify-center gap-2 transition-colors relative
                            ${activeTab === 'social' ? 'text-pink-600 bg-white' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}
                        `}
                    >
                        <Share2 size={20} /> 社群行銷用
                        {activeTab === 'social' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-pink-500"></div>}
                    </button>
                </div>
                
                {/* Editing Toggle */}
                {currentResult && (
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors
                            ${isEditing 
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200' 
                                : 'bg-white text-slate-600 border-gray-200 hover:bg-gray-50'
                            }`}
                    >
                        {isEditing ? <Check size={16}/> : <PenTool size={16}/>}
                        {isEditing ? '完成編輯' : '編輯內容'}
                    </button>
                )}
            </div>
            
            <div className="flex items-center justify-end p-3 bg-white border-b border-gray-100">
                <button 
                    onClick={copyToClipboard}
                    className="text-sm flex items-center gap-1.5 bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors font-medium shadow-sm"
                >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    {copied ? '已複製' : '複製內容'}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-white p-8">
                {currentResult ? (
                    <>
                        {isEditing ? (
                            <textarea
                                value={currentResult}
                                onChange={(e) => handleContentUpdate(e.target.value)}
                                className="w-full h-[500px] p-4 font-mono text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            />
                        ) : (
                            <div className="prose prose-indigo prose-lg max-w-none">
                                <ReactMarkdown>{currentResult}</ReactMarkdown>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                        <p>生成錯誤，請重試。</p>
                    </div>
                )}
            </div>
        </div>
      </div>
      )}
    </div>
  );
};

export default JDGenerator;
