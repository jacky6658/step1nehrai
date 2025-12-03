
# RecruitAI - 智能招募顧問系統 (Step1ne AI招募)

RecruitAI 是一款專為 HR 招募人員與獵頭顧問設計的 AI 智能體應用程式。透過 Google Gemini 2.5 Flash 模型強大的分析與生成能力，將繁瑣的招募流程自動化，從職位定義、人才搜尋、開發信撰寫到面試評估，提供一站式的智慧輔助。

## 🚀 核心功能 (Core Features)

本系統採用 **兩階段式介面 (Two-Stage Interface)** 設計，確保輸入與結果檢視的專注度。

### 1. 👤 人才畫像生成器 (Persona Generator)
*   **功能**：上傳 JD 或輸入職缺內容，AI 自動分析並具象化候選人的七大維度（工作類型、特質、技能、價值觀、背景、來源、關鍵字）。
*   **特色**：生成精美的視覺化報告，並支援資料連動至其他功能模組。

### 2. 🌏 人才搜尋與策略 (Talent Search)
*   **功能**：結合 **Google Search Grounding**，即時搜尋市場情報。
*   **產出**：
    *   **招募管道策略**：建議最佳曝光平台。
    *   **公司獵捕清單**：列出潛在挖角目標公司與原因。
    *   **Boolean Search String**：自動生成 LinkedIn 布林搜尋字串，支援一鍵搜尋。

### 3. 📝 JD 職缺生成器 (JD Generator)
*   **功能**：輸入關鍵字或上傳主管筆記，瞬間生成專業 JD。
*   **雙版本輸出**：
    *   **招募平台版**：結構嚴謹，適合 104/LinkedIn。
    *   **社群行銷版**：活潑吸睛，適合 Facebook/Instagram/Threads。

### 4. 📨 開發信撰寫助手 (Outreach Writer)
*   **功能**：上傳「候選人履歷」與「職缺 JD」，AI 深度比對兩者關聯性。
*   **產出**：生成三種不同風格的開發信（精簡有力、價值導向、提問式切入），大幅提高回信率。

### 5. 👥 面試提問助手 (Interview Copilot)
*   **功能**：上傳履歷與 JD，AI 進行適配度分析。
*   **產出**：
    *   **契合度分析報告**：評分、錄取建議、優劣勢分析。
    *   **結構化面試題庫**：包含 Resume Deep Dive（履歷深挖）、Gap Analysis（技能落差分析）、Behavioral Questions（行為面試題）。

### 6. 🤖 招募 AI 顧問 (Agent Chat)
*   **功能**：全能型對話助手，支援檔案拖放上傳。
*   **特色**：可解析 CSV/Excel 並輸出 Markdown 表格，支援數據匯出。

### 7. ⚙️ 系統整合
*   **檔案支援**：全面支援 PDF, Word (.docx), Excel (.xlsx), CSV, 純文字檔解析。
*   **匯出功能**：支援將分析結果匯出為 PDF (視覺化截圖) 與 Excel 報表。
*   **多語系**：支援 繁體中文、English、日本語、한국어。
*   **BYOK 機制**：支援使用者自帶 Key (Bring Your Own Key)，可使用個人付費額度。

## 🛠 技術堆疊 (Tech Stack)

*   **Frontend Framework**: React 18, TypeScript
*   **Styling**: Tailwind CSS
*   **AI Model**: Google Gemini 2.5 Flash (`@google/genai`)
*   **Document Parsing**:
    *   `pdfjs-dist`: PDF 解析 (含 CJK 中文支援)
    *   `mammoth`: Word (.docx) 解析
    *   `xlsx`: Excel/CSV 解析
*   **Export Tools**:
    *   `html2canvas` + `jspdf`: 視覺化 PDF 輸出
    *   `xlsx`: Excel 數據匯出
*   **Icons**: Lucide React

## 📦 安裝與本機執行 (Setup)

本專案為純前端架構 (Client-side only)，無需後端伺服器，但需要一組 Google Gemini API Key。

### 1. 環境變數
專案依賴 `process.env.API_KEY` 來呼叫 Google Gemini API。
在開發環境中，請確保您的環境變數已正確設定。

### 2. 啟動開發伺服器
```bash
npm install
npm start
```

## ☁️ 部署至 Zeabur (Deployment)

本專案非常適合部署至 Zeabur 等靜態網站託管服務。

### 部署步驟：

1.  **建立服務**：
    *   在 Zeabur Dashboard 選擇您的 Git Repository。
    *   Zeabur 通常會自動識別為 React 專案並選擇適當的 Build Command (如 `npm run build`) 與 Output Directory (如 `dist` 或 `build`)。

2.  **設定環境變數 (Environment Variables)**：
    *   進入該服務的 **Settings (設定)** -> **Environment Variables (環境變數)**。
    *   新增變數：
        *   **Key**: `API_KEY`
        *   **Value**: 您的 Google Gemini API Key。
    *   *注意：設定完變數後，請務必重新部署 (Redeploy) 才會生效，因為變數是在建置階段注入的。*

3.  **安全性設定 (API Key Restrictions)**：
    *   由於這是純前端應用，API Key 會暴露在瀏覽器端。
    *   **強烈建議**前往 [Google Cloud Console](https://console.cloud.google.com/apis/credentials) 限制您的 API Key：
        *   **Application restrictions**: 選擇 **HTTP referrers (Web sites)**，並填入您的 Zeabur 網域 (例如 `https://your-app.zeabur.app/*`)。
        *   **API restrictions**: 選擇 **Restrict key**，並只勾選 **Generative Language API**。

4.  **Google Search Grounding 費用 (重要)**：
    *   本系統的 **「人才搜尋與策略」** 功能使用了 Google Search Grounding。
    *   **注意**：此功能通常不包含在 Gemini API 的免費額度內。若您使用免費版 API Key，該功能可能會報錯 (Error 400/403)。
    *   建議確保您的 Google Cloud 專案已連結 **計費帳戶 (Billing Account)** 以使用 Pay-as-you-go 方案，避免功能受限。

## 🔑 BYOK (Bring Your Own Key) 設定

如果您希望使用自己的 API Key（例如為了使用付費的搜尋功能）：

1.  在應用程式側邊欄點擊 **「設定 (Settings)」**。
2.  在 **Bring Your Own Key** 欄位輸入您的 Gemini API Key。
3.  點擊儲存。
4.  系統將優先使用您輸入的 Key，而非環境變數中的預設 Key。

## ⚠️ 重要說明

1.  **資料隱私**：本系統為純前端應用，所有上傳的檔案與生成的資料僅在瀏覽器端處理與暫存 (LocalStorage)，**不會**上傳至任何第三方伺服器（除了發送給 Google Gemini API 進行推論）。
2.  **資料保存**：關閉瀏覽器或重新整理頁面後，暫存資料將會消失。請善用「匯出 PDF/Excel」功能保存結果。
3.  **PDF 解析**：系統已針對中文字型 (CJK) 進行優化，若遇到掃描式 PDF (純圖片) 將無法解析，請使用文字版 PDF。

## 🔗 相關連結
*   **Step1ne 官網**: [https://step1ne.com/](https://step1ne.com/)
*   **AI 工具庫**: [https://aitools.aijob.com.tw/](https://aitools.aijob.com.tw/)
