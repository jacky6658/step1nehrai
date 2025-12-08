
import React, { useState, useRef, useEffect } from 'react';
import { createAgentChat } from '../services/geminiService';
import { Chat, GenerateContentResponse } from "@google/genai";
import { Send, Bot, User, Loader2, Globe, Trash2, Paperclip, X, FileText, FileSpreadsheet, File, UploadCloud, Download, Table } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message, Language, LANGUAGE_OPTIONS } from '../types';
import * as pdfjsLib from 'pdfjs-dist';
import * as XLSX from "xlsx";
import mammoth from 'mammoth';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs`;

interface Attachment {
  name: string;
  type: 'pdf' | 'word' | 'excel' | 'csv' | 'text';
  content: string;
}

const AgentChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
        role: 'model',
        text: '你好！我是 RecruitAI，你的智能招聘助手。今天有什麼可以幫你的嗎？\n\n你可以 **拖曳上傳** PDF 履歷、Word 職缺描述或 Excel/CSV 報表，我會針對文件內容回答你的問題。',
        timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [language, setLanguage] = useState<Language>('zh-TW');
  const [isLoading, setIsLoading] = useState(false);
  
  // File Upload States
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const chatRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Helper to detect CJK characters
  const isCJK = (str: string) => /[\u4e00-\u9fa5]/.test(str);

  // Re-create chat session when language changes to update System Instructions
  useEffect(() => {
    chatRef.current = createAgentChat(language);
  }, [language]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const parseFile = async (file: File): Promise<string> => {
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
    } else if (fileNameLower.endsWith('.xlsx') || fileNameLower.endsWith('.xls')) {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        text = XLSX.utils.sheet_to_txt(worksheet);
    } else if (fileNameLower.endsWith('.csv')) {
        // Parse CSV and convert to Markdown Table for better AI context
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert sheet to JSON array (array of arrays)
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];
        
        if (jsonData && jsonData.length > 0) {
            // Build Markdown Table
            const headers = jsonData[0];
            const body = jsonData.slice(1);
            
            // Ensure we handle empty cells or non-string values gracefully
            const safeJoin = (row: any[]) => row.map(cell => String(cell || '').trim()).join(' | ');

            const mdHeader = `| ${safeJoin(headers)} |`;
            const mdSeparator = `| ${headers.map(() => '---').join(' | ')} |`;
            const mdBody = body.map(row => `| ${safeJoin(row)} |`).join('\n');
            
            text = `${mdHeader}\n${mdSeparator}\n${mdBody}`;
        } else {
            // Fallback if empty or parse fail
            text = await file.text();
        }
    } else if (fileNameLower.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result.value;
    } else if (file.type.startsWith('text/') || fileNameLower.endsWith('.txt')) {
        text = await file.text();
    } else {
        throw new Error('不支援的檔案格式');
    }
    return text;
  };

  const processUploadedFile = async (file: File) => {
      setIsParsing(true);
      try {
          const content = await parseFile(file);
          if (!content.trim()) throw new Error("無法提取文字，請確認檔案內容不為空，且不是「純圖片」掃描檔 (Scanned Document)。若問題持續，請嘗試直接貼上文字。");

          let type: Attachment['type'] = 'text';
          if (file.name.endsWith('.pdf')) type = 'pdf';
          else if (file.name.endsWith('.docx')) type = 'word';
          else if (file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) type = 'excel';
          else if (file.name.endsWith('.csv')) type = 'csv';
  
          setAttachment({
              name: file.name,
              type,
              content
          });
      } catch (error: any) {
          console.error("File parsing error", error);
          alert(error.message || "檔案解析失敗，請確認格式是否正確。");
      } finally {
          setIsParsing(false);
          // Reset input value to allow selecting the same file again if needed
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processUploadedFile(file);
  };

  // Drag and Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // Check if we are really leaving the container or just hitting a child
      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
      setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) processUploadedFile(file);
  };

  const removeAttachment = () => {
    setAttachment(null);
  };

  const handleSend = async () => {
    if ((!input.trim() && !attachment) || !chatRef.current) return;

    // Construct the message with attachment content if exists
    let displayMessage = input;
    let messageToSend = input;

    if (attachment) {
        displayMessage = `${input ? input + '\n\n' : ''}📎 [已上傳文件: ${attachment.name}]`;
        messageToSend = `
[系統提示：使用者上傳了一份參考文件，請根據文件內容與使用者提問進行回答]

文件名稱：${attachment.name}
文件類型：${attachment.type} (若是 CSV/Excel，已轉換為 Markdown 表格格式以便閱讀)
文件內容：
"""
${attachment.content.substring(0, 25000)}
"""

使用者提問：
${input || "請分析這份文件。"}
`;
    }

    const userMsg: Message = { role: 'user', text: displayMessage, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setAttachment(null); // Clear attachment after sending
    setIsLoading(true);

    try {
        const result = await chatRef.current.sendMessageStream({ message: messageToSend });
        
        let fullResponse = '';
        // Add a placeholder message for the model
        setMessages(prev => [...prev, { role: 'model', text: '', timestamp: new Date() }]);

        for await (const chunk of result) {
            const c = chunk as GenerateContentResponse;
            const text = c.text;
            if (text) {
                fullResponse += text;
                setMessages(prev => {
                    const newArr = [...prev];
                    newArr[newArr.length - 1].text = fullResponse;
                    return newArr;
                });
            }
        }
    } catch (error) {
        console.error("Chat Error:", error);
        setMessages(prev => [...prev, { role: 'model', text: '抱歉，連線發生錯誤或文件內容過長。', timestamp: new Date() }]);
    } finally {
        setIsLoading(false);
    }
  };

  const handleClearChat = () => {
      setMessages([
        {
            role: 'model',
            text: `你好！已重置對話。當前輸出語言設定為：${LANGUAGE_OPTIONS.find(l => l.value === language)?.label}。`,
            timestamp: new Date()
        }
      ]);
      setAttachment(null);
      chatRef.current = createAgentChat(language);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
  };

  const getFileIcon = (type: Attachment['type']) => {
      switch(type) {
          case 'pdf': return <FileText size={16} className="text-red-500"/>;
          case 'excel': 
          case 'csv':
            return <FileSpreadsheet size={16} className="text-green-500"/>;
          case 'word': return <FileText size={16} className="text-blue-500"/>;
          default: return <File size={16} className="text-gray-500"/>;
      }
  };

  // --- Table Export Logic ---

  const detectTable = (text: string) => {
      // Simple Markdown table detection: looks for |---| pattern
      return /\|.*\|/.test(text) && /\|[\s-:]+\|/.test(text);
  };

  const handleDownloadCSV = (text: string) => {
      // Basic Markdown Table to CSV parser
      try {
          // Extract table lines
          const lines = text.split('\n');
          const tableLines = lines.filter(line => line.trim().startsWith('|') && line.trim().endsWith('|'));
          
          if (tableLines.length < 2) return;

          const csvRows = tableLines
              .filter(line => !line.includes('---')) // Remove separator line
              .map(line => {
                  return line
                      .split('|')
                      .slice(1, -1) // Remove first and last empty elements from split
                      .map(cell => `"${cell.trim().replace(/"/g, '""')}"`) // Trim and escape quotes
                      .join(',');
              });
          
          const csvContent = "\uFEFF" + csvRows.join('\n'); // Add BOM for Excel UTF-8
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `table_export_${new Date().getTime()}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
      } catch (e) {
          console.error("CSV Export Error", e);
          alert("匯出 CSV 失敗");
      }
  };

  const handleDownloadMD = (text: string) => {
      // Extract just the table part (optional) or download full text. 
      // Downloading full text for context is usually better.
      const blob = new Blob([text], { type: 'text/markdown;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `content_export_${new Date().getTime()}.md`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  return (
    <div 
        className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-enter relative"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
    >
      {/* Drag & Drop Overlay */}
      {isDragging && (
          <div className="absolute inset-0 bg-indigo-600/10 backdrop-blur-sm z-50 flex flex-col items-center justify-center border-4 border-indigo-500 border-dashed rounded-xl m-2">
              <div className="bg-white p-6 rounded-full shadow-xl mb-4 animate-bounce">
                  <UploadCloud size={48} className="text-indigo-600" />
              </div>
              <h3 className="text-2xl font-bold text-indigo-700">放開以開始上傳</h3>
              <p className="text-indigo-600 mt-2 font-medium">支援 PDF, Word, Excel, CSV</p>
          </div>
      )}

      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-full">
                <Bot size={20} className="text-indigo-600" />
            </div>
            <div>
                <h3 className="font-bold text-slate-900">招募 AI 顧問</h3>
                <p className="text-xs text-green-600 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span> 線上
                </p>
            </div>
        </div>
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
                <Globe size={16} className="text-slate-400" />
                <select 
                    value={language}
                    onChange={(e) => {
                        const newLang = e.target.value as Language;
                        setLanguage(newLang);
                    }}
                    className="text-xs border border-gray-300 rounded-md p-1 outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-slate-700"
                >
                    {LANGUAGE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            </div>
            <button 
                onClick={handleClearChat}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="清空對話"
            >
                <Trash2 size={18} />
            </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50 min-h-0">
        {messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            const hasTable = !isUser && detectTable(msg.text);

            return (
                <div key={idx} className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isUser ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-indigo-600'}`}>
                        {isUser ? <User size={16} /> : <Bot size={16} />}
                    </div>
                    <div className="flex flex-col gap-2 max-w-[85%] lg:max-w-[70%]">
                        <div className={`rounded-2xl p-4 shadow-sm ${isUser ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-100 text-slate-800'}`}>
                            <div className={`prose max-w-none text-sm ${isUser ? 'prose-invert' : 'prose-indigo'}`}>
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                            </div>
                            <span className={`text-[10px] block mt-2 opacity-70 ${isUser ? 'text-indigo-200' : 'text-slate-400'}`}>
                                {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                        </div>

                        {/* Table Export Actions */}
                        {hasTable && (
                            <div className="flex gap-2 animate-enter">
                                <button 
                                    onClick={() => handleDownloadCSV(msg.text)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-green-200 text-green-700 rounded-lg text-xs font-bold hover:bg-green-50 transition-colors shadow-sm"
                                >
                                    <FileSpreadsheet size={14} /> 匯出 CSV (表格)
                                </button>
                                <button 
                                    onClick={() => handleDownloadMD(msg.text)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors shadow-sm"
                                >
                                    <Table size={14} /> 匯出 Markdown
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-200 flex-shrink-0 z-10">
        {/* Attachment Preview */}
        {attachment && (
            <div className="flex items-center gap-2 mb-2 p-2 bg-indigo-50 border border-indigo-100 rounded-lg w-fit animate-enter">
                {getFileIcon(attachment.type)}
                <span className="text-xs font-medium text-indigo-900 max-w-[200px] truncate">{attachment.name}</span>
                <button 
                    onClick={removeAttachment}
                    className="ml-2 p-0.5 hover:bg-indigo-200 rounded text-indigo-600 transition-colors"
                >
                    <X size={12} />
                </button>
            </div>
        )}
        
        {/* Is Parsing Indicator */}
        {isParsing && (
            <div className="flex items-center gap-2 mb-2 text-xs text-indigo-600">
                <Loader2 size={12} className="animate-spin" /> 正在讀取檔案內容...
            </div>
        )}

        <div className="relative flex items-end gap-2">
            <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden" 
                accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt"
            />
            <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isParsing || !!attachment}
                className={`p-3 mb-1 rounded-xl transition-colors flex-shrink-0 border
                    ${!!attachment 
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
                        : 'bg-gray-50 text-slate-500 border-gray-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200'
                    }`}
                title="上傳文件 (PDF/Word/Excel/CSV) - 支援拖放"
            >
                <Paperclip size={20} />
            </button>

            <div className="relative flex-grow">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`詢問問題... ${attachment ? '(已附加文件)' : '(可拖放檔案)'}`}
                    className="w-full pr-12 pl-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-14 scrollbar-hide flex items-center pt-3 text-sm"
                />
                <button 
                    onClick={handleSend}
                    disabled={isLoading || (!input.trim() && !attachment)}
                    className="absolute right-2 top-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300 transition-colors"
                >
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AgentChat;
