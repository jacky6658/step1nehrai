import React from 'react';
import { RecruitmentTool } from '../types';
import { ArrowRight, Sparkles, MessageSquare, FileCheck, Search, Rocket, Zap, ExternalLink, Globe2, AlertTriangle, UserCircle2, Users } from 'lucide-react';

interface DashboardProps {
  onNavigate: (tool: RecruitmentTool) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const features = [
    {
      id: RecruitmentTool.JD_GENERATOR,
      title: "1. 智能 JD 生成",
      desc: "輸入關鍵字，AI 瞬間生成專業職缺描述。",
      icon: FileCheck,
      color: "bg-blue-100 text-blue-600",
    },
    {
      id: RecruitmentTool.PERSONA_GENERATOR,
      title: "2. 人才畫像生成",
      desc: "上傳 JD，AI 協助您具象化人才特質與動機。",
      icon: UserCircle2,
      color: "bg-orange-100 text-orange-600",
    },
    {
      id: RecruitmentTool.TALENT_SEARCH,
      title: "3. 人才搜尋與策略",
      desc: "AI 搜尋市場情報，列出挖角目標公司名單。",
      icon: Globe2,
      color: "bg-sky-100 text-sky-600",
    },
    {
      id: RecruitmentTool.INTERVIEW_COPILOT,
      title: "4. 面試提問助手",
      desc: "AI 分析履歷契合度，並生成客製化面試題庫。",
      icon: Users,
      color: "bg-green-100 text-green-600",
    },
  ];

  return (
    <div className="space-y-10 animate-enter pb-10">
      {/* Welcome Section with Video Banner */}
      <div className="relative w-full h-72 rounded-2xl overflow-hidden shadow-lg border border-gray-100 group bg-slate-900">
        <video 
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80"
            autoPlay 
            loop 
            muted 
            playsInline
            poster="https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop"
        >
            {/* 優先嘗試載入外部演示影片，若您已上傳 step1ne.mp4 請將其移至第一順位或確保路徑正確 */}
            <source src="https://cdn.coverr.co/videos/coverr-working-in-an-office-open-space-4726/1080p.mp4" type="video/mp4" />
            <source src="step1ne.mp4" type="video/mp4" />
        </video>
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-transparent z-10"></div>
        
        <div className="relative z-20 h-full flex flex-col justify-center px-8 lg:px-12">
            <h2 className="text-4xl font-bold text-white mb-3 tracking-tight">歡迎回來，招募顧問</h2>
            <p className="text-slate-200 text-lg max-w-xl leading-relaxed">
                Step1ne 智能招募系統協助您提升效率。
                <br />讓 AI 成為你的最強助手，從 JD 到面試一氣呵成。
            </p>
        </div>
      </div>

      {/* Workflow Steps */}
      <div>
        <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <Zap size={20} className="text-yellow-500"/> 快速上手流程
        </h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
            <div 
                key={feature.id}
                onClick={() => onNavigate(feature.id)}
                className="group bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer flex flex-col h-full relative overflow-hidden"
            >
                <div className={`w-12 h-12 rounded-lg ${feature.color} flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
                <feature.icon size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-slate-500 mb-6 flex-1 text-sm">{feature.desc}</p>
                <div className="flex items-center text-indigo-600 font-medium group-hover:translate-x-1 transition-transform text-sm">
                前往使用 <ArrowRight size={16} className="ml-2" />
                </div>
            </div>
            ))}
        </div>
      </div>

      {/* Additional Tools Section */}
      <div className="grid md:grid-cols-2 gap-6">
         {/* Agent Chat Promo */}
         <div 
            onClick={() => onNavigate(RecruitmentTool.AGENT_CHAT)}
            className="bg-indigo-900 rounded-2xl p-8 text-white relative overflow-hidden cursor-pointer hover:shadow-xl transition-shadow"
         >
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                        <MessageSquare size={24} className="text-white" />
                    </div>
                    <h3 className="text-2xl font-bold">招募 AI 顧問</h3>
                </div>
                <p className="text-indigo-200 mb-6">不確定如何進行薪資談判？或是需要 Boolean Search String？隨時詢問 AI 顧問。</p>
                <button className="bg-white text-indigo-900 px-5 py-2.5 rounded-lg font-bold hover:bg-indigo-50 transition-colors">
                    開始對話
                </button>
            </div>
            <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-10 translate-y-10">
                <Sparkles size={180} />
            </div>
         </div>

         {/* External Tools Link */}
         <a 
            href="https://aitools.aijob.com.tw/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="group bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-8 text-white relative overflow-hidden hover:shadow-xl transition-shadow"
         >
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                     <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                        <Search size={24} className="text-white" />
                    </div>
                    <h3 className="text-2xl font-bold">探索更多 AI 工具</h3>
                </div>
                <p className="text-emerald-100 mb-6">前往 AI Tools 庫，發現更多提升招募效率的神器。</p>
                <div className="flex items-center bg-white/20 w-fit px-4 py-2 rounded-lg backdrop-blur-md group-hover:bg-white/30 transition-colors">
                    <span className="font-bold mr-2">前往查看</span> <ExternalLink size={18} />
                </div>
            </div>
            <div className="absolute -right-6 -bottom-6 opacity-20 transform rotate-12 group-hover:rotate-6 transition-transform duration-500">
                <Rocket size={180} />
            </div>
         </a>
      </div>

      {/* Important Reminder Section */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-amber-800 flex items-center gap-2 mb-3">
             <AlertTriangle size={24} className="text-amber-600" /> 重要提醒：
        </h3>
        <div className="text-amber-900/80 space-y-2 leading-relaxed font-medium">
            <p>資料使用本地儲存（localStorage），關閉視窗或重新整理後資料會消失。</p>
            <p>目前暫時不使用登入機制，如需長期保存，請自行備份結果。</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;