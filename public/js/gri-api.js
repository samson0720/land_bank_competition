/**
 * GRI 評估問卷 API 串接
 * 此文件包含完整的 JavaScript 實現，用於：
 * 1. 收集用戶答案 (gatherAnswers)
 * 2. 提交到後端 API 並生成報告 (submitReport)
 * 3. 處理錯誤和加載狀態
 */

// ============================================
// 1. 收集答案函數
// ============================================

/**
 * gatherAnswers() - 收集頁面上所有表單答案
 * 
 * 功能：
 * - 選取頁面上所有的 .form-control[data-gri] 元素
 * - 依序將它們的值打包成一個 JSON 物件
 * - Key 的命名規則為 E1~E8, S1~S10, G1~G8 (共 26 題)
 * 
 * 嚴格檢查：
 * - 檢查 totalQuestions (26) 與 keys.length 是否相符
 * - 檢查是否有任何一題的 value 為空字串 ""
 * - 如果檢查失敗，alert 提示並 return null
 * 
 * @returns {Object|null} 答案物件 {E1: "yes", E2: "no", ...} 或 null
 */
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

// ============================================
// 2. 提交報告函數 (API 串接)
// ============================================

/**
 * submitReport() - 異步函數，提交答案到 API 並生成報告
 * 
 * 流程：
 * 1. 收集答案 (gatherAnswers)
 * 2. 顯示讀取畫面
 * 3. 禁用提交按鈕
 * 4. 清空報告容器
 * 5. 執行 POST 請求到 /api/generate-report
 * 6. 處理回應並使用 showdown.js 轉換 Markdown
 * 7. 填入報告容器
 * 8. 錯誤處理和 finally 清理
 */
async function submitReport() {
    try {
        // 步驟 1: 收集答案
        const answers = gatherAnswers();
        if (answers === null) {
            return;  // gatherAnswers 已經顯示 alert，直接返回
        }

        // 步驟 2-4: 顯示讀取畫面、禁用按鈕、清空容器
        const reportLoading = document.getElementById('report-loading');
        const submitBtn = document.getElementById('submit-report');
        const reportContainer = document.getElementById('report-container');

        reportLoading.classList.remove('hidden');
        reportLoading.style.display = 'flex';
        submitBtn.disabled = true;
        reportContainer.innerHTML = '';

        // 步驟 5: 執行 fetch 請求
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

        // 使用 showdown.js 轉換 Markdown 為 HTML
        const converter = new showdown.Converter();
        const htmlReport = converter.makeHtml(data.report);

        // 步驟 7: 將報告填入容器
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
        // 清理：隱藏讀取畫面、解除按鈕禁用
        const reportLoading = document.getElementById('report-loading');
        const submitBtn = document.getElementById('submit-report');
        reportLoading.classList.add('hidden');
        reportLoading.style.display = 'none';
        submitBtn.disabled = false;
    }
}

// ============================================
// 3. 事件綁定
// ============================================

/**
 * 在 DOMContentLoaded 時綁定事件監聽器
 * 確保 DOM 已加載後再綁定
 */
document.addEventListener('DOMContentLoaded', function() {
    // 綁定 submit-report 按鈕的 click 事件
    document.getElementById('submit-report').addEventListener('click', submitReport);
});

// ============================================
// 必需的 HTML 元素結構
// ============================================

/*
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

<!-- 提交按鈕 -->
<button id="submit-report" class="gri-submit-btn" disabled>
    📊 完成評估並產出報告
</button>

<!-- 所有表單項目都應包含 data-gri 和 data-question-num -->
<select class="form-control" data-gri="E" data-question-num="1" onchange="updateProgress()">
    <option value="">-- 請選擇 --</option>
    <option value="no">否</option>
    <option value="yes">是</option>
</select>
*/

// ============================================
// CDN 依賴項
// ============================================

/*
<script src="https://cdn.jsdelivr.net/npm/showdown@2.1.0/dist/showdown.min.js"></script>
*/

// ============================================
// 後端 API 端點需求
// ============================================

/*
POST /api/generate-report

請求格式：
{
    "answers": {
        "E1": "yes",
        "E2": "no",
        ...
        "G8": "basic"
    }
}

回應格式：
{
    "status": "success",
    "message": "報告生成成功",
    "report": "# 📊 GRI 永續評估報告\n\n...",  // Markdown 格式
    "scores": {
        "E": 20,
        "S": 25,
        "G": 18,
        "total": 63,
        "totalMax": 78,
        "percentage": 81,
        "level": "B",
        "levelName": "平均級 (B)",
        "summary": "..."
    }
}
*/
