# 🤖 Gemini AI 集成指南 - GRI 評估詳細分析

## 📌 功能概述

已集成 **Google Gemini AI API**，將自動為每份 GRI 評估報告生成：

1. ✅ **整體評估** - 公司永續發展現狀分析
2. ✅ **各構面分析** - E、S、G 的優勢與不足
3. ✅ **優先改善項目** - 前 5 項改善方向（含具體步驟）
4. ✅ **Quick Wins** - 低成本、快速見效的 3 項行動
5. ✅ **長期策略** - 1-2 年的發展方向

---

## 🔧 技術實現

### 後端改變

#### 1. 新增 Gemini API 初始化

```javascript
const { GoogleGenerativeAI } = require('@google/generative-ai');

const GEMINI_API_KEY = 'AIzaSyBt0CZI4ArN2gwiDmE3PDvcmUz4x1IpzoE';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
```

#### 2. 新增 API 端點

**端點：** `POST /api/generate-report-with-ai`

```javascript
app.post('/api/generate-report-with-ai', async (req, res) => {
    // 1. 計算基本 GRI 得分
    const scores = calculateGRIScoreFromAnswers(answers);
    
    // 2. 生成 Gemini 提示詞
    const prompt = generateGeminiPrompt(answers, scores);
    
    // 3. 調用 Gemini API
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const aiRecommendations = await model.generateContent(prompt);
    
    // 4. 合併基本報告 + AI 詳細建議
    const enhancedReport = baseReport + aiDetailedRecommendations;
    
    // 5. 返回完整報告
    return { report, scores, aiRecommendations };
});
```

#### 3. 提示詞設計

系統會根據用戶的答案和得分，生成以下提示詞給 Gemini：

```
你是一位資深的 ESG 永續發展顧問。
根據公司的 GRI 評估結果和具體答案，提供：
1. 整體評估
2. 各構面分析
3. 優先改善項目（含商業價值、行動步驟、成本估算）
4. Quick Wins
5. 長期策略
```

---

## 📊 數據流

```
用戶填寫 GRI 問卷 (26 題)
    ↓
點擊提交
    ↓
gatherAnswers() 收集答案
    ↓
POST /api/generate-report-with-ai
    ↓
計算基本評分 (E/S/G)
    ↓
調用 Gemini API（傳遞答案和評分）
    ↓
Gemini 分析並生成詳細建議
    ↓
合併基本報告 + AI 詳細分析
    ↓
保存到 localStorage
    ↓
跳轉到報告頁面
    ↓
展示完整報告（包含 AI 分析）
```

---

## 🎯 報告結構

最終報告包含以下部分：

```markdown
# 📊 GRI 永續評估報告

## 📈 評估結果概覽
- 總分、各構面評分、完成度百分比
- 評級（A/B/C/D）

## 📋 詳細答案
- E1：題目文本
  ✓ 用戶答案

## 💡 改善建議
- 基本建議（根據評級）

## 🤖 AI 生成的詳細改善建議
### 整體評估
[Gemini 生成 - 2-3段分析]

### 各構面詳細分析
[Gemini 生成 - E/S/G 優劣勢]

### 優先改善項目
1. 項目名稱
   - 重要性說明
   - 行動步驟 1-5
   - 預期效果
   - 成本等級
2. ...（共5項）

### Quick Wins
- 行動 1（低成本、快速見效）
- 行動 2
- 行動 3

### 長期策略
[Gemini 生成 - 1-2年規劃]
```

---

## 🔒 API 安全性

### ⚠️ 注意事項

1. **API 金鑰管理**
   - 當前使用的是提供的公開 API 金鑰
   - 在生產環境建議使用環境變數
   - 設定環境變數：
     ```bash
     GEMINI_API_KEY=your_api_key_here
     ```

2. **修改代碼**
   ```javascript
   const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyBt0CZI4ArN2gwiDmE3PDvcmUz4x1IpzoE';
   ```

3. **API 額度管理**
   - Gemini 1.5 Flash 有免費配額
   - 每份報告調用一次
   - 監控使用情況避免超額

---

## 📦 依賴套件

已添加到 `package.json`：

```json
{
  "dependencies": {
    "@google/generative-ai": "^0.3.0"
  }
}
```

安裝：
```bash
npm install
```

---

## 🚀 使用流程

### 1. 啟動服務器
```bash
npm install
npm start
```

### 2. 訪問評估頁面
```
http://localhost:3000/gri-assessment
```

### 3. 填寫問卷
- 完成 26 道題目
- 進度條實時更新
- 所有題目完成後啟用提交按鈕

### 4. 提交評估
- 點擊「完成評估並產出報告」
- 系統調用 Gemini API（1-2 秒）
- 自動跳轉到報告頁面

### 5. 查看報告
- 基本評分和等級
- 詳細答案審視
- **AI 生成的詳細分析和建議** ⭐

---

## 💡 生成內容示例

### Gemini 可能生成的內容

#### 整體評估
> 根據評估結果，貴公司在永續發展方面處於「平均級 (B)」水準，表示已建立良好的永續基礎。特別是在社會責任構面表現出色（87%），但環境管理和治理結構仍有改善空間。建議集中資源在環境政策制定和治理透明度提升...

#### 優先改善項目
1. **碳排放管理體系建立**
   - 重要性：符合國際趨勢，降低融資成本
   - 步驟：
     1. 進行碳足跡盤查
     2. 設定減排目標
     3. 導入能源管理系統
   - 預期效果：降低成本 10-15%
   - 成本級別：中

#### Quick Wins
- 建立簡易碳盤查記錄（低成本，立即開始）
- 制定員工綠色出差政策（零成本，快速見效）
- 開展一次供應商永續評估（低成本，增進關係）

---

## 📈 後續優化建議

1. **緩存機制** - 避免重複調用 API
2. **錯誤回退** - Gemini 失敗時使用預設建議
3. **報告導出** - PDF/Word 格式下載
4. **追蹤進度** - 定期重新評估，對比改善成果
5. **進階分析** - 與行業標竿比較

---

## 🔗 參考資源

- [Google Generative AI 官方文檔](https://ai.google.dev/tutorials/python_quickstart)
- [Gemini API 文檔](https://ai.google.dev/docs)
- [GRI 標準](https://www.globalreporting.initiative.org/)

---

## ✅ 測試檢查清單

- [x] Gemini API 密鑰正確配置
- [x] `/api/generate-report-with-ai` 端點可調用
- [x] 前端正確傳遞答案數據
- [x] AI 生成的內容正確保存
- [x] 報告頁面正確顯示 AI 內容
- [x] 錯誤處理完整
- [x] 無 linter 錯誤

---

**完成日期**: 2025年11月2日  
**版本**: 2.0 (已集成 Gemini AI)  
**狀態**: ✅ 已完成並測試
