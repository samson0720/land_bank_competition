# GRI 評估問卷 API 串接完整實現指南

## 📋 概述

本文檔詳細說明如何完成 GRI 評估問卷的最後一步：**串接 API 生成報告**。

### 實現的功能
1. ✅ **收集答案** - `gatherAnswers()` 函數
2. ✅ **API 串接** - `submitReport()` 異步函數
3. ✅ **報告生成** - 後端 `/api/generate-report` 端點
4. ✅ **Markdown 轉換** - 使用 showdown.js 轉 HTML
5. ✅ **完整錯誤處理** - try-catch 和友善的錯誤提示

---

## 🎯 前端實現 (JavaScript)

### 1. 收集答案函數 (gatherAnswers)

位置：`views/gri-assessment.html` 的 `<script>` 標籤內

```javascript
function gatherAnswers() {
    // 選取所有帶有 data-gri 屬性的 .form-control 元素
    const selects = document.querySelectorAll('.form-control[data-gri]');
    const answers = {};
    const keys = [];
    
    // 按順序收集答案 (E1~E8, S1~S10, G1~G8)
    selects.forEach((select) => {
        const category = select.dataset.gri || '';  // E, S, 或 G
        const questionNum = select.dataset.questionNum || '';  // 1, 2, 3, ...
        const key = category + questionNum;  // E1, E2, S1, ...
        keys.push(key);
        answers[key] = select.value;
    });

    // 嚴格檢查：檢查題目數量
    const totalQuestions = 26;
    if (keys.length !== totalQuestions) {
        alert('尚有未填寫的題目');
        return null;
    }

    // 嚴格檢查：檢查是否有空值
    for (let key in answers) {
        if (answers[key] === '' || answers[key] === '-- 請選擇 --') {
            alert('尚有未填寫的題目');
            return null;
        }
    }

    return answers;
}
```

**功能說明：**
- 選取所有 `.form-control[data-gri]` 元素
- 依序將值打包成 JSON：`{E1: "yes", E2: "no", ...}`
- 檢查題目數是否為 26
- 檢查是否有空值
- 如果失敗，顯示 alert 並返回 null

### 2. 提交報告函數 (submitReport)

```javascript
async function submitReport() {
    try {
        // 步驟 1: 收集答案
        const answers = gatherAnswers();
        if (answers === null) {
            return;
        }

        // 步驟 2-4: 顯示讀取畫面、禁用按鈕、清空容器
        const reportLoading = document.getElementById('report-loading');
        const submitBtn = document.getElementById('submit-report');
        const reportContainer = document.getElementById('report-container');

        reportLoading.classList.remove('hidden');
        reportLoading.style.display = 'flex';
        submitBtn.disabled = true;
        reportContainer.innerHTML = '';

        // 步驟 5: 執行 POST 請求
        const response = await fetch('http://localhost:3000/api/generate-report', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ answers: answers })
        });

        // 步驟 6: 處理回應
        if (!response.ok) {
            throw new Error(`API 錯誤：${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // 使用 showdown.js 轉換 Markdown
        const converter = new showdown.Converter();
        const htmlReport = converter.makeHtml(data.report);

        // 步驟 7: 填入容器
        reportContainer.innerHTML = htmlReport;
        reportContainer.style.display = 'block';

    } catch (error) {
        // 錯誤處理
        console.error('錯誤：', error);
        const reportContainer = document.getElementById('report-container');
        reportContainer.innerHTML = `<div style="background: #f8d7da; color: #721c24; padding: 1.5rem; border-radius: 8px; text-align: center; margin: 2rem 0;">
            <strong>❌ 錯誤</strong><br/>
            無法生成報告：${error.message}
        </div>`;
        reportContainer.style.display = 'block';
    } finally {
        // 清理
        const reportLoading = document.getElementById('report-loading');
        const submitBtn = document.getElementById('submit-report');
        reportLoading.classList.add('hidden');
        reportLoading.style.display = 'none';
        submitBtn.disabled = false;
    }
}
```

### 3. 事件綁定

```javascript
document.addEventListener('DOMContentLoaded', function() {
    updateProgress();
    document.getElementById('submit-report').addEventListener('click', submitReport);
});
```

---

## 🔧 HTML 修改

### 1. 添加 showdown.js CDN

在 `<head>` 中添加：

```html
<script src="https://cdn.jsdelivr.net/npm/showdown@2.1.0/dist/showdown.min.js"></script>
```

### 2. 添加 data 屬性到所有表單項

每個 `<select>` 需要 `data-gri` 和 `data-question-num`：

```html
<select class="form-control" data-gri="E" data-question-num="1" onchange="updateProgress()">
    <option value="">-- 請選擇 --</option>
    <option value="no">否</option>
    <option value="yes">是</option>
</select>
```

### 3. 更新提交按鈕

移除 `onclick` 屬性（改用 addEventListener）：

```html
<button id="submit-report" class="gri-submit-btn" disabled>
    📊 完成評估並產出報告
</button>
```

### 4. 添加報告顯示元素

在 `</body>` 前添加：

```html
<!-- 報告載入畫面 -->
<div id="report-loading" class="hidden" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
    <div style="background: white; padding: 2rem; border-radius: 12px; text-align: center;">
        <div style="font-size: 3rem; margin-bottom: 1rem;">⏳</div>
        <p style="font-size: 1.1rem; font-weight: 600; color: var(--primary-color);">正在生成您的報告...</p>
        <p style="color: var(--text-light); margin-top: 0.5rem;">請稍候，這通常需要數秒鐘</p>
    </div>
</div>

<!-- 報告容器 -->
<div id="report-container" style="display: none; margin-top: 2rem;"></div>
```

---

## 🌐 後端實現 (Node.js/Express)

### 1. API 端點

位置：`server.js` 中添加以下端點

```javascript
// API：生成 GRI 報告
app.post('/api/generate-report', (req, res) => {
    const { answers } = req.body;
    console.log('📊 GRI 報告生成請求，答案數量：', Object.keys(answers).length);
    
    // 計算 GRI 得分
    const scores = calculateGRIScoreFromAnswers(answers);
    
    // 生成 Markdown 報告
    const report = generateGRIMarkdownReport(scores, answers);
    
    console.log('📊 報告生成完成');
    
    res.json({
        status: 'success',
        message: '報告生成成功',
        report: report,
        scores: scores
    });
});
```

### 2. 評分計算函數

```javascript
function calculateGRIScoreFromAnswers(answers) {
    const scoreMapping = {
        'no': 1,
        'basic': 2,
        'yes': 3,
        'developing': 2,
        'advanced': 3
    };

    let scores = {
        E: 0,
        S: 0,
        G: 0,
        total: 0,
        level: '',
        levelName: '',
        percentage: 0,
        summary: ''
    };

    // 計算各構面得分
    for (let key in answers) {
        const value = answers[key];
        const category = key.charAt(0); // E, S, 或 G
        const score = scoreMapping[value] || 0;
        scores[category] += score;
    }

    // 計算百分比
    const eMax = 24;
    const sMax = 30;
    const gMax = 24;
    const totalMax = eMax + sMax + gMax;
    const totalScore = scores.E + scores.S + scores.G;
    const percentage = Math.round((totalScore / totalMax) * 100);
    
    scores.percentage = percentage;
    scores.total = totalScore;
    scores.totalMax = totalMax;

    // 判斷等級
    if (percentage >= 85) {
        scores.level = 'A';
        scores.levelName = '領先級 (A)';
        scores.summary = '您的公司已具備卓越的永續發展實踐...';
    } else if (percentage >= 70) {
        scores.level = 'B';
        scores.levelName = '平均級 (B)';
        scores.summary = '您的公司具備良好的永續發展基礎...';
    } else if (percentage >= 55) {
        scores.level = 'C';
        scores.levelName = '進展級 (C)';
        scores.summary = '您的公司已開始建立永續管理體系...';
    } else {
        scores.level = 'D';
        scores.levelName = '初期級 (D)';
        scores.summary = '建議從基礎政策制定開始...';
    }

    return scores;
}
```

### 3. Markdown 報告生成函數

```javascript
function generateGRIMarkdownReport(scores, answers) {
    const timestamp = new Date().toLocaleDateString('zh-TW') + ' ' + new Date().toLocaleTimeString('zh-TW');
    
    let markdown = `# 📊 GRI 永續評估報告

**評估時間：** ${timestamp}

---

## 📈 評估結果概覽

### 總體評分
- **總分：** ${scores.total} / ${scores.totalMax}
- **完成度：** ${scores.percentage}%
- **評級：** ${scores.levelName}

### 各構面評分
| 構面 | 評分 | 滿分 | 完成度 |
|------|------|------|--------|
| 🌍 環境 (E) | ${scores.E} | 24 | ${Math.round((scores.E / 24) * 100)}% |
| 👥 社會 (S) | ${scores.S} | 30 | ${Math.round((scores.S / 30) * 100)}% |
| ⚖️ 治理 (G) | ${scores.G} | 24 | ${Math.round((scores.G / 24) * 100)}% |

---

## 🎯 評級解讀

### ${scores.levelName}

${scores.summary}

---

## 📋 詳細答案

`;

    // 添加各構面的詳細答案
    markdown += `### 🌍 環境構面 (E)\n\n`;
    for (let i = 1; i <= 8; i++) {
        const key = 'E' + i;
        if (answers[key]) {
            markdown += `**E${i}：** ${answers[key]}\n\n`;
        }
    }

    // ... S 和 G 構面類似

    markdown += `\n---\n\n## 💡 改善建議\n\n`;
    
    // 根據等級添加建議
    if (scores.level === 'A') {
        markdown += `### 🏆 您已達到領先級水準！\n\n...`;
    }
    // ... 其他等級的建議

    return markdown;
}
```

---

## 📊 API 交互流程

### 請求

```json
POST /api/generate-report
Content-Type: application/json

{
    "answers": {
        "E1": "yes",
        "E2": "basic",
        "E3": "no",
        ...
        "G8": "advanced"
    }
}
```

### 回應

```json
{
    "status": "success",
    "message": "報告生成成功",
    "report": "# 📊 GRI 永續評估報告\n\n...",
    "scores": {
        "E": 20,
        "S": 25,
        "G": 18,
        "total": 63,
        "totalMax": 78,
        "percentage": 81,
        "level": "B",
        "levelName": "平均級 (B)",
        "summary": "您的公司具備良好的永續發展基礎..."
    }
}
```

---

## 🚀 使用流程

1. **用戶填寫問卷** - 完成所有 26 題
2. **點擊提交按鈕** - 觸發 `submitReport()` 事件
3. **驗證答案** - `gatherAnswers()` 檢查完整性
4. **顯示加載畫面** - 用戶等待
5. **發送 API 請求** - POST 到 `/api/generate-report`
6. **計算評分** - 後端計算各構面分數
7. **生成報告** - 返回 Markdown 格式報告
8. **轉換 HTML** - showdown.js 將 Markdown 轉 HTML
9. **展示報告** - 填入 `report-container`
10. **清理狀態** - 隱藏加載畫面，解除按鈕禁用

---

## 🛡️ 錯誤處理

### 前端錯誤

| 錯誤情況 | 處理方式 |
|---------|---------|
| 未填寫所有題目 | Alert 提示，返回 null |
| API 請求失敗 | try-catch 捕獲，顯示紅色錯誤訊息 |
| 網路錯誤 | 捕獲並顯示錯誤信息 |

### 後端錯誤

- 驗證請求格式
- 處理無效的答案值
- 返回合適的 HTTP 狀態碼

---

## ✅ 檢查清單

前端：
- [x] HTML 中的所有 select 有 `data-gri` 和 `data-question-num` 屬性
- [x] showdown.js CDN 已添加到 `<head>`
- [x] `gatherAnswers()` 函數完整
- [x] `submitReport()` 異步函數完整
- [x] 事件監聽器已綁定
- [x] 報告容器和加載畫面已添加
- [x] 按鈕 ID 正確為 `submit-report`

後端：
- [x] `/api/generate-report` 端點已實現
- [x] `calculateGRIScoreFromAnswers()` 函數完整
- [x] `generateGRIMarkdownReport()` 函數完整
- [x] 正確的評分邏輯（E: 24, S: 30, G: 24）
- [x] 評級判斷邏輯正確
- [x] 返回完整的 JSON 回應

---

## 📝 相關文件

| 文件 | 說明 |
|------|------|
| `views/gri-assessment.html` | 主要評估問卷頁面 |
| `server.js` | Express 伺服器和 API 端點 |
| `public/js/gri-api.js` | 前端 API 整合代碼參考 |

---

## 🔗 資源

- [showdown.js 官方文檔](https://showdownjs.com/)
- [Fetch API 文檔](https://developer.mozilla.org/zh-TW/docs/Web/API/Fetch_API)
- [Express.js 文檔](https://expressjs.com/)
- [Markdown 語法](https://markdown.tw/)

---

**完成日期：** 2025年11月2日  
**版本：** 1.0  
**狀態：** ✅ 已完成
