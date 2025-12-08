
# RecruitAI - 智能招募顧問系統 (Step1ne AI招募)

RecruitAI 是一款專為 HR 招募人員與獵頭顧問設計的 AI 智能體應用程式。透過 Google Gemini 2.5 Flash 模型強大的分析與生成能力，將繁瑣的招募流程自動化。

本專案採用 **React (Frontend) + Express (Backend)** 的全端架構，以支援安全的 LinkedIn OAuth 登入與自動發文功能。

## 🚀 核心功能 (Core Features)

### 1. 👤 人才畫像生成器 (Persona Generator)
*   **功能**：上傳 JD 或輸入職缺內容，AI 自動分析並具象化候選人的七大維度。
*   **特色**：生成精美的視覺化報告，並支援資料連動至其他功能模組。

### 2. 🌏 人才搜尋與策略 (Talent Search)
*   **功能**：結合 **Google Search Grounding**，即時搜尋市場情報。
*   **產出**：招募管道策略、公司獵捕清單、Boolean Search String。

### 3. 📝 JD 職缺生成器 (JD Generator)
*   **功能**：輸入關鍵字或上傳主管筆記，瞬間生成專業 JD。
*   **特色**：支援 **一鍵發布至 LinkedIn** (需綁定帳號)。

### 4. 📨 開發信撰寫助手 (Outreach Writer)
*   **功能**：上傳「候選人履歷」與「職缺 JD」，AI 深度比對兩者關聯性，生成高轉換率開發信。

### 5. 👥 面試提問助手 (Interview Copilot)
*   **功能**：上傳履歷與 JD，AI 進行適配度分析並生成結構化面試題庫。

### 6. 🤖 招募 AI 顧問 (Agent Chat)
*   **功能**：全能型對話助手，支援檔案拖放上傳、CSV/Excel 表格解析與匯出。

## 🛠 技術堆疊 (Tech Stack)

*   **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
*   **Backend**: Node.js, Express
*   **AI Model**: Google Gemini 2.5 Flash (`@google/genai`)
*   **Integrations**: LinkedIn OAuth 2.0 API

## 📦 本機開發 (Local Development)

1.  **安裝依賴**：
    ```bash
    npm install
    ```

2.  **設定環境變數**：
    在根目錄建立 `.env` 檔案：
    ```env
    API_KEY=您的_Gemini_API_Key
    LINKEDIN_CLIENT_ID=您的_LinkedIn_Client_ID
    LINKEDIN_CLIENT_SECRET=您的_LinkedIn_Client_Secret
    LINKEDIN_REDIRECT_URI=http://localhost:3000/api/linkedin/callback
    ```

3.  **啟動服務** (同時啟動後端 Server 與前端 Build)：
    ```bash
    npm run build
    npm start
    ```
    *存取：`http://localhost:3000`*

## ☁️ 部署至 Zeabur (Deployment Guide)

由於專案包含後端 `server.js`，請部署為 **Node.js Service**。

### 1. 前置準備：LinkedIn App
1.  前往 [LinkedIn Developers](https://www.linkedin.com/developers/) 建立 App。
2.  在 **Products** 申請 "Share on LinkedIn" 與 "Sign In with LinkedIn using OpenID Connect"。
3.  記下 `Client ID` 與 `Client Secret`。

### 2. Zeabur 部署步驟
1.  將程式碼推送到 GitHub。
2.  在 Zeabur 新增服務 (Git)，選擇此 Repository。
3.  **設定網域 (Networking)**：先產生一個 Zeabur 網域 (例如 `your-app.zeabur.app`)。

### 3. 設定環境變數 (Environment Variables)
在 Zeabur 服務設定中新增：

| Key | Value |
| :--- | :--- |
| `API_KEY` | 您的 Google Gemini API Key |
| `LINKEDIN_CLIENT_ID` | (從 LinkedIn 取得) |
| `LINKEDIN_CLIENT_SECRET` | (從 LinkedIn 取得) |
| `LINKEDIN_REDIRECT_URI` | `https://<您的Zeabur網域>/api/linkedin/callback` |

### 4. 完成 LinkedIn Redirect 設定
回到 LinkedIn Developers -> Auth -> **Authorized redirect URLs**，新增：
`https://<您的Zeabur網域>/api/linkedin/callback`

### 5. 重新部署
環境變數設定完成後，點擊 Zeabur 的 **Redeploy** 按鈕以套用設定。

---

## ⚠️ 重要說明
1.  **Google Search Grounding 費用**：人才搜尋功能需要 Gemini API Key 綁定 Google Cloud Billing (Pay-as-you-go)。
2.  **資料隱私**：所有上傳的 PDF/Word 檔案僅在伺服器記憶體中短暫處理，不會儲存至硬碟。
