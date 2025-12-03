
import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, ShieldCheck, Key, Save, AlertTriangle, Trash2, CheckCircle2 } from 'lucide-react';

const Settings: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [envKeyExists, setEnvKeyExists] = useState(false);

  useEffect(() => {
    // Check localStorage for user key
    const localKey = localStorage.getItem('user_gemini_api_key');
    if (localKey) {
        setSavedKey(localKey);
    }

    // Check if process.env.API_KEY exists (mock check, in real app we assume it exists if configured)
    if (process.env.API_KEY) {
        setEnvKeyExists(true);
    }
  }, []);

  const handleSave = () => {
    if (!apiKey.trim()) return;
    localStorage.setItem('user_gemini_api_key', apiKey.trim());
    setSavedKey(apiKey.trim());
    setApiKey('');
    alert("API Key 已儲存！將優先使用您的 Key。");
  };

  const handleRemove = () => {
    localStorage.removeItem('user_gemini_api_key');
    setSavedKey(null);
    alert("已移除自訂 Key，系統將回退使用預設配置。");
  };

  return (
    <div className="max-w-2xl mx-auto animate-enter">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
            <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                <SettingsIcon size={24} />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-slate-900">系統設定</h2>
                <p className="text-slate-500 text-sm">API Key 與系統配置</p>
            </div>
        </div>

        <div className="space-y-8">
            {/* Status Section */}
            <div>
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <ShieldCheck size={18} /> 當前狀態
                </h3>
                {savedKey ? (
                     <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 flex items-start gap-3">
                        <CheckCircle2 className="text-purple-600 mt-1" size={20} />
                        <div>
                            <p className="font-bold text-purple-800">使用自訂 API Key (BYOK)</p>
                            <p className="text-sm text-purple-700">系統正在使用您手動設定的 Key。</p>
                        </div>
                     </div>
                ) : envKeyExists ? (
                    <div className="bg-green-50 border border-green-100 rounded-lg p-4 flex items-start gap-3">
                        <CheckCircle2 className="text-green-600 mt-1" size={20} />
                        <div>
                            <p className="font-bold text-green-800">使用系統預設 API Key</p>
                            <p className="text-sm text-green-700">API Key 已透過環境變數 (Environment Variables) 配置。</p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-red-50 border border-red-100 rounded-lg p-4 flex items-start gap-3">
                        <AlertTriangle className="text-red-600 mt-1" size={20} />
                        <div>
                            <p className="font-bold text-red-800">未偵測到 API Key</p>
                            <p className="text-sm text-red-700">請在下方輸入您的 Google Gemini API Key 以使用系統。</p>
                        </div>
                    </div>
                )}
            </div>

            {/* BYOK Input Section */}
            <div>
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <Key size={18} /> Bring Your Own Key (BYOK)
                </h3>
                <p className="text-sm text-slate-500 mb-4 leading-relaxed">
                    如果您需要使用 <strong>Google Search Grounding (人才搜尋)</strong> 功能，或希望使用自己的付費額度，請在此輸入您的 Gemini API Key。
                    <br/><span className="text-xs text-orange-500">注意：Key 將儲存在您的瀏覽器本地端 (LocalStorage)，不會上傳至我們的主機。</span>
                </p>

                {savedKey ? (
                    <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className="flex-1 font-mono text-slate-500 text-sm">
                            {savedKey.substring(0, 8)}*************************
                        </div>
                        <button 
                            onClick={handleRemove}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors text-sm"
                        >
                            <Trash2 size={16} /> 移除 Key
                        </button>
                    </div>
                ) : (
                    <div className="flex gap-2">
                        <input 
                            type="password"
                            placeholder="輸入您的 Gemini API Key (AIza...)"
                            className="flex-1 border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                        />
                        <button 
                            onClick={handleSave}
                            disabled={!apiKey.trim()}
                            className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-indigo-700 disabled:bg-indigo-300 transition-colors flex items-center gap-2"
                        >
                            <Save size={18} /> 儲存
                        </button>
                    </div>
                )}
            </div>

             <div className="pt-6 border-t border-gray-100">
                <h4 className="text-sm font-bold text-slate-700 mb-2">如何獲取 API Key？</h4>
                <ol className="list-decimal list-inside text-sm text-slate-500 space-y-1">
                    <li>前往 <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-indigo-600 underline">Google AI Studio</a>。</li>
                    <li>點擊 "Create API Key"。</li>
                    <li>若要使用搜尋功能，請確保該專案已連結 Google Cloud Billing (計費帳戶)。</li>
                </ol>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
