# 綠易通 Green E Pass

> **2025 土地銀行永續金融競賽金獎作品**
>
> 綠易通是一套以 AI 驅動的中小企業 ESG 輔導平台，結合大型語言模型（LLM）、TESES 評分機制、GRI 報告生成與 PDF 匯出，協助企業快速完成永續評估、獲得改善建議，並連結土地銀行優惠貸款利率。

---

## 目錄

- [專案目的](#專案目的)
- [核心功能](#核心功能)
- [系統架構](#系統架構)
- [技術棧](#技術棧)
- [外部 API 整合](#外部-api-整合)
- [專案結構](#專案結構)
- [安裝與執行](#安裝與執行)
- [API 端點說明](#api-端點說明)
- [TESES 評分機制](#teses-評分機制)
- [環境變數設定](#環境變數設定)

---

## 專案目的

台灣中小企業普遍缺乏永續揭露能力，卻又面臨供應鏈 ESG 要求與主管機關政策壓力。綠易通的目標是以「5 分鐘完成自評、AI 即時給建議、銀行直接給優惠」的流程，讓中小企業無須 ESG 顧問即可踏上永續轉型之路。

平台核心採用自創的 **TESES 評分機制**（Transparent ESG Score for SMEs），將 ESG 三維度拆解為 100 分制，並對應四個等級的貸款利率優惠，讓永續表現直接轉化為財務誘因。

---

## 核心功能

### 1. TESES 雙階段 ESG 評估
- 第一階段：5 題風險篩選，快速識別高風險企業。
- 第二階段：完整 E／S／G／T 四維度問卷，自動計算 TESES 分數。
- 評分完成後即時顯示等級（A/B/C/D）、各維度雷達圖與弱項分析。
- 一鍵生成 PDF 評估報告（含企業填答資料與評分結果）。

### 2. AI 改善建議引擎
- 依據企業填答結果，呼叫 Groq LLaMA 3.3-70B 生成針對性改善建議。
- 建議依 E／S／G 維度分類，附帶可執行的具體行動方案。
- 支援碳排放計算器，輸入能源消耗數據即可試算溫室氣體排放量。

### 3. GRI 永續報告生成
- 提供 GRI 標準問卷（含 GRI 2 通用揭露與 GRI 300 環境主題）。
- 填寫後呼叫 Google Gemini API 自動生成完整 GRI 永續報告草稿。
- 報告可在頁面預覽並下載為 PDF，支援中文字體嵌入。

### 4. AI 客服助理
- 全站浮動聊天視窗，依當前頁面自動切換系統提示（ESG 評估 / GRI 填表 / 一般詢問）。
- 快捷回覆按鈕依情境動態產生（題目說明、填寫範例、評分預測等）。
- 對話歷史本地持久化（localStorage），重整頁面不遺失。
- 支援對話記錄匯出下載。

### 5. 進度追蹤與成就系統
- 企業 ESG 行動記錄時間軸，可新增已完成的改善措施。
- 成就徽章系統（碳減量達標、完成評估等），提供視覺化激勵。
- 歷史分數趨勢折線圖，呈現 ESG 進步軌跡。

### 6. 優惠利率試算
- 依 TESES 等級即時試算貸款利率折扣（A 級 -0.15%、B 級 -0.075%）。
- 可輸入貸款金額與期數，試算每月還款差額。
- 整合模擬的區塊鏈驗證，展示評估結果上鏈概念。

---

## 系統架構

```
┌──────────────────────────────────────────────────────────────────┐
│                     瀏覽器前端（Vanilla JS）                      │
│                                                                  │
│  首頁 (index)                                                    │
│  ├── ESG 評估 (esg-assessment)    ← TESES 問卷 + 即時計分        │
│  ├── ESG 結果 (esg-result)        ← 雷達圖 + AI 建議 + PDF 匯出  │
│  ├── GRI 評估 (gri-assessment)    ← GRI 標準問卷                 │
│  ├── GRI 報告 (gri-report)        ← Gemini 生成報告預覽          │
│  ├── 進度追蹤 (esg-tracker)       ← 時間軸 + 成就 + 趨勢圖       │
│  ├── 輔導平台 (platform)          ← 模組化學習資源               │
│  └── 永續平台 (sustainability)    ← 永續倡議展示                 │
│                                                                  │
│  共用元件                                                        │
│  ├── chat-assistant.js            ← 全站 AI 客服浮動視窗          │
│  ├── esg-data.js                  ← TESES 題目與評分規則定義      │
│  └── progress-tracker.js          ← 追蹤與成就邏輯               │
└─────────────────────────┬────────────────────────────────────────┘
                          │  HTTP REST  (:3000)
┌─────────────────────────▼────────────────────────────────────────┐
│                   Express.js 後端 (server.js)                    │
│                                                                  │
│  路由層（14 個 API 端點）                                         │
│  ├── ESG 評分與建議：TESES 計算 + Groq 改善建議生成              │
│  ├── GRI 報告：Gemini API Prompt Engineering → 報告草稿          │
│  ├── PDF 生成：pdf-lib + fontkit 嵌入中文字體 + 欄位座標填入      │
│  ├── AI 客服：Groq LLaMA 3.3-70B + 情境系統提示                 │
│  └── 碳計算 / 利率試算 / 區塊鏈驗證（模擬）                      │
└──────┬──────────────────────────────────┬────────────────────────┘
       │                                  │
┌──────▼──────────────┐        ┌──────────▼──────────────────────┐
│   Groq Cloud        │        │   Google Cloud AI               │
├─────────────────────┤        ├─────────────────────────────────┤
│ LLaMA 3.3-70B       │        │ Gemini 1.5 Flash                │
│ • AI 客服對話        │        │ • GRI 永續報告生成               │
│ • ESG 改善建議       │        │ • ESG 活動評估                  │
│ • GHG 圖片分析       │        │                                 │
│   (demo 模式)        │        │                                 │
└─────────────────────┘        └─────────────────────────────────┘
```

### 資料流範例：TESES 評估 → AI 建議 → PDF 報告

```
使用者填寫問卷
    │
    ▼
esg-data.js 本地計算 TESES 分數
    │  POST /api/calculate-score
    ▼
server.js 驗證分數 + 判定等級（A/B/C/D）
    │  POST /api/improvement-suggestions
    ▼
Groq LLaMA 3.3-70B ──► 依弱項維度生成改善建議 JSON
    │
    ▼
esg-result.html 渲染雷達圖 + 建議列表
    │  POST /api/generate-esg-pdf
    ▼
pdf-lib 讀取 PDF 範本 + fontkit 嵌入字體
    │  依 pdf-coordinates-config.js 填入欄位座標
    ▼
回傳填好的 PDF Binary → 瀏覽器下載
```

---

## 技術棧

### 後端（Node.js / Express）

| 套件 | 版本 | 用途 |
|------|------|------|
| `express` | ^4.18.2 | Web API 框架 |
| `groq-sdk` | ^0.37.0 | Groq LLaMA 3.3-70B API |
| `@google/generative-ai` | ^0.3.0 | Google Gemini API |
| `pdf-lib` | ^1.17.1 | PDF 生成與表單填寫 |
| `@pdf-lib/fontkit` | ^1.1.1 | PDF 中文字體嵌入 |
| `multer` | ^1.4.5 | 圖片上傳處理（10MB 上限） |
| `body-parser` | ^1.20.2 | JSON 請求解析 |
| `dotenv` | ^16.0.3 | 環境變數管理 |
| `nodemon` | ^3.0.1 | 開發模式自動重啟 |

### 前端

| 技術 | 說明 |
|------|------|
| HTML5 + CSS3 | 響應式版面，CSS 變數主題系統 |
| Vanilla JavaScript | 無框架依賴，直接瀏覽器執行 |
| localStorage | 問卷草稿、對話歷史、ESG 行動記錄本地持久化 |

---

## 外部 API 整合

### Groq

| 模型 | 功能 |
|------|------|
| `llama-3.3-70b-versatile` | AI 客服對話、ESG 改善建議生成、ESG 活動評估 |

### Google AI

| 模型 | 功能 |
|------|------|
| `gemini-1.5-flash` | GRI 永續報告草稿生成、ESG 活動評估 |

---

## 專案結構

```
land_bank_competition/
├── server.js                          # Express 主程式（所有 API 路由）
├── pdf-generator.js                   # PDF 生成引擎
├── pdf-coordinates-config.js          # PDF 表單欄位座標對應
├── package.json                       # Node.js 依賴聲明
├── .env                               # 環境變數（不提交版本控制）
│
├── views/                             # HTML 頁面
│   ├── index.html                     # 首頁（功能導覽）
│   ├── esg-assessment.html            # TESES ESG 評估表單
│   ├── esg-result.html                # 評分結果與 AI 建議
│   ├── esg-tracker.html               # 進度追蹤儀表板
│   ├── platform.html                  # 輔導平台
│   ├── sustainability.html            # 永續倡議平台
│   ├── gri-assessment.html            # GRI 評估表單
│   └── gri-report.html                # GRI 報告生成與預覽
│
└── public/
    ├── css/
    │   ├── style.css                  # 主樣式表
    │   ├── chat-assistant.css         # AI 客服視窗樣式
    │   └── progress-tracker.css       # 儀表板元件樣式
    ├── js/
    │   ├── esg-data.js                # TESES 題目定義與評分規則
    │   ├── assessment.js              # ESG 表單互動邏輯
    │   ├── chat-assistant.js          # AI 客服浮動視窗
    │   ├── progress-tracker.js        # 進度追蹤與成就邏輯
    │   ├── gri-api.js                 # GRI API 串接
    │   ├── pdf-filler.js              # PDF 欄位互動
    │   ├── platform.js                # 輔導平台功能
    │   └── main.js                    # 共用工具函式
    └── images/
        ├── land-bank-logo.svg
        └── plant-sprout-icon.svg
```

---

## 安裝與執行

### 前置需求

- Node.js ≥ 18
- Groq API 金鑰（[console.groq.com](https://console.groq.com)）
- Google Gemini API 金鑰（[aistudio.google.com](https://aistudio.google.com)）

### 啟動步驟

```bash
# 1. 安裝依賴
npm install

# 2. 設定環境變數（參見下方章節）
cp .env.example .env

# 3. 啟動伺服器
npm start
# 或開發模式（自動重啟）
npm run dev

# 4. 開啟瀏覽器
# http://localhost:3000
```

---

## API 端點說明

所有端點 Base URL 預設為 `http://localhost:3000`。

| 端點 | 方法 | 功能 |
|------|------|------|
| `/api/calculate-score` | POST | TESES 分數計算與等級判定 |
| `/api/improvement-suggestions` | POST | Groq 生成 ESG 改善建議 |
| `/api/gri-assessment` | POST | GRI 評估資料處理 |
| `/api/generate-report` | POST | Gemini 生成 GRI 永續報告草稿 |
| `/api/esg-evaluation` | POST | ESG 活動評估 |
| `/api/carbon-calculator` | POST | 溫室氣體排放量計算 |
| `/api/chat` | POST | AI 客服多輪對話（Groq） |
| `/api/analyze-ghg-image` | POST | 圖片 GHG 資料辨識（demo 模式） |
| `/api/generate-esg-pdf` | POST | 生成填妥的 ESG 評估 PDF |
| `/api/rate/simulate` | POST | 貸款優惠利率試算 |
| `/api/blockchain/verify` | POST | ESG 結果區塊鏈驗證（模擬） |
| `/api/esg-history` | GET/POST | ESG 行動記錄讀寫 |
| `/api/achievements` | GET | 成就徽章狀態查詢 |
| `/api/export-report` | POST | 報告匯出 |

### `/api/chat` 請求範例

```json
{
  "message": "我的環境分數偏低，最快的改善方法是什麼？",
  "history": [
    { "role": "user", "content": "你好" },
    { "role": "assistant", "content": "您好！我是綠易通 AI 顧問，請問有什麼可以協助您？" }
  ],
  "context": "esg-result"
}
```

回應格式：

```json
{
  "response": "建議優先從能源管理著手：1. 申請台電節電方案... 2. 建立每月用電記錄... 這兩項通常可在 3 個月內完成，且對 E 分數提升效果最顯著。"
}
```

---

## TESES 評分機制

TESES（Transparent ESG Score for SMEs）是本平台自創的中小企業簡易 ESG 評分機制，採 100 分制。

### 維度配分

| 維度 | 滿分 | 主要評估項目 |
|------|------|------------|
| E 環境 | 35 | 碳盤查、能源效率、廢棄物管理、用水管理 |
| S 社會 | 30 | 員工培訓、勞工福利、供應鏈管理、社區參與 |
| G 治理 | 25 | 永續組織、法規遵循、誠信文化 |
| T 轉型透明度 | 10 | 平台使用一致性、公開揭露目標 |

### 等級與利率優惠

| 等級 | 分數區間 | 說明 | 貸款利率調整 |
|------|---------|------|------------|
| A | ≥ 80 | 永續領航企業 | **-0.15%** |
| B | 60–79 | 永續進行企業 | **-0.075%** |
| C | 30–59 | 永續潛力企業 | 0% |
| D | < 30 | 永續風險企業 | +0.05% |

---

## 環境變數設定

在專案根目錄建立 `.env` 檔案：

```env
# Groq API 金鑰
GROQ_API_KEY=your_groq_api_key_here

# Google Gemini API 金鑰
GEMINI_API_KEY=your_gemini_api_key_here

# 伺服器 Port（預設 3000）
PORT=3000

# 執行環境
NODE_ENV=production
```

> **注意**：`.env` 已列入 `.gitignore`，請勿將 API 金鑰提交至版本控制。

---

## 授權

本專案為 **2025 土地銀行永續金融競賽**參賽作品，榮獲**金獎**。
