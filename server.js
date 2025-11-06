const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();
const ESGPDFGenerator = require('./pdf-generator');

const app = express();
const PORT = process.env.PORT || 3000;

// Gemini API 初始化
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
let genAI = null;

// 只有在有API金鑰時才初始化
if (GEMINI_API_KEY) {
    try {
        genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        console.log('✅ Gemini API 初始化成功');
    } catch (error) {
        console.error('❌ Gemini API 初始化失敗：', error.message);
    }
} else {
    console.warn('⚠️ 未設定 GEMINI_API_KEY，AI 客服功能將不可用');
}

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ========== API 路由（必須在靜態文件之前） ==========
// 先定義所有API路由，確保不會被靜態文件服務器攔截

// API：評分計算
app.post('/api/calculate-score', (req, res) => {
    const data = req.body;
    console.log('📊 收到評分請求，數據：', data);
    const score = calculateESGScore(data);
    console.log('📊 計算結果：', score);
    res.json(score);
});

// API：改善建議資源
app.post('/api/improvement-suggestions', (req, res) => {
    const { improvements } = req.body;
    const suggestionMap = getImprovementSuggestions();
    const result = {};
    improvements.forEach(item => {
        if (suggestionMap[item]) {
            result[item] = suggestionMap[item];
        }
    });
    res.json(result);
});

// API：GRI 評估
app.post('/api/gri-assessment', (req, res) => {
    const { responses, timestamp } = req.body;
    console.log('📊 GRI 評估提交，時間戳：', timestamp);
    
    const griScore = calculateGRIScore(responses);
    
    console.log('📊 GRI 計算結果：', griScore);
    
    res.json({
        status: 'success',
        message: '感謝您完成 GRI 評估！',
        score: griScore,
        timestamp: timestamp
    });
});

// API：生成 GRI 報告
app.post('/api/generate-report', async (req, res) => {
    try {
        const { answers } = req.body;
        console.log('📊 GRI 報告生成請求，答案數量：', Object.keys(answers).length);
        
        const scores = calculateGRIScoreFromAnswers(answers);
        const baseReport = generateGRIMarkdownReport(scores, answers);
        
        let aiRecommendations = null;
        try {
            console.log('🤖 呼叫 Gemini API 生成詳細建議...');
            const prompt = generateDetailedGeminiPrompt(answers, scores);
            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            aiRecommendations = response.text();
            console.log('✅ Gemini 建議生成成功');
        } catch (aiError) {
            console.warn('⚠️ Gemini API 調用失敗，使用基本建議：', aiError.message);
        }
        
        console.log('📊 報告生成完成');
        
        res.json({
            status: 'success',
            message: '報告生成成功',
            report: baseReport,
            scores: scores,
            aiRecommendations: aiRecommendations
        });
    } catch (error) {
        console.error('❌ 報告生成錯誤：', error);
        res.status(500).json({
            status: 'error',
            message: '生成報告失敗',
            error: error.message
        });
    }
});

// API：計算ESG評等
app.post('/api/esg-evaluation', async (req, res) => {
    try {
        const { activities } = req.body;
        console.log('📊 收到ESG評等請求，活動數量：', activities.length);
        
        const results = activities.map(activity => {
            return calculateActivityRating(activity);
        });
        
        const commentary = generateESGCommentary(results, req.body);
        
        res.json({
            status: 'success',
            results: results,
            commentary: commentary,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ ESG評等錯誤：', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// API：碳盤查計算
app.post('/api/carbon-calculator', (req, res) => {
    const data = req.body;
    const result = calculateCarbonFootprint(data);
    res.json(result);
});

// API：獲取ESG歷史數據
app.get('/api/esg-history/:companyId?', (req, res) => {
    try {
        // 目前使用localStorage，未來可以從數據庫獲取
        // 這裡返回一個示例結構，實際數據由前端從localStorage獲取
        res.json({
            status: 'success',
            message: '歷史數據應從前端localStorage獲取',
            note: '前端會自動從localStorage讀取esgHistory數據'
        });
    } catch (error) {
        console.error('獲取歷史數據錯誤：', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// API：保存ESG評估到歷史記錄
app.post('/api/esg-history', (req, res) => {
    try {
        const { companyId, assessment } = req.body;
        
        // 目前使用localStorage，未來可以保存到數據庫
        // 這裡只返回成功，實際保存由前端完成
        res.json({
            status: 'success',
            message: '評估數據已保存（前端localStorage）',
            assessmentId: assessment.id || `assessment_${Date.now()}`
        });
    } catch (error) {
        console.error('保存歷史數據錯誤：', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// API：獲取成就列表
app.get('/api/achievements/:companyId?', (req, res) => {
    try {
        // 成就數據由前端從localStorage獲取
        res.json({
            status: 'success',
            message: '成就數據應從前端localStorage獲取',
            note: '前端會自動從esgHistory.achievements獲取'
        });
    } catch (error) {
        console.error('獲取成就錯誤：', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// API：導出報告
app.post('/api/export-report', async (req, res) => {
    try {
        const { companyId, reportType, timeRange } = req.body;
        
        // 目前返回提示，未來可以生成PDF或Excel
        res.json({
            status: 'success',
            message: '報告導出功能開發中',
            note: '將生成包含趨勢圖和詳細分析的PDF報告'
        });
    } catch (error) {
        console.error('導出報告錯誤：', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// API：提交完整評估並生成結果

// API：生成已填寫的ESG評估PDF問卷
app.post('/api/generate-esg-pdf', async (req, res) => {
    try {
        const assessmentData = req.body;
        console.log('📄 收到PDF生成請求');
        
        const pdfGenerator = new ESGPDFGenerator();
        const pdfBuffer = await pdfGenerator.generateFilledPDF(assessmentData);
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Length', pdfBuffer.length);
        const disposition = req.query.download === 'true' 
            ? `attachment; filename="ESG_Assessment_${new Date().getTime()}.pdf"`
            : `inline; filename="ESG_Assessment_${new Date().getTime()}.pdf"`;
        res.setHeader('Content-Disposition', disposition);
        
        res.send(Buffer.from(pdfBuffer));
        
        console.log('✅ PDF已生成並發送，大小:', pdfBuffer.byteLength, '字節');
    } catch (error) {
        console.error('❌ PDF生成API錯誤：', error);
        res.status(500).json({
            status: 'error',
            message: 'PDF生成失敗',
            error: error.message
        });
    }
});

// API：AI 客服聊天
app.post('/api/chat', async (req, res) => {
    try {
        const { message, context, userData, conversationHistory } = req.body;
        console.log('💬 收到聊天請求，上下文：', context?.page || 'unknown');

        if (!message || !context) {
            return res.status(400).json({
                status: 'error',
                message: '請求參數不完整，請重新發送'
            });
        }

        if (!GEMINI_API_KEY || !genAI) {
            return res.status(500).json({
                status: 'error',
                message: 'AI服務未正確配置。請確認 .env 檔案中已設定 GEMINI_API_KEY，並重新啟動服務器。'
            });
        }

        const systemPrompt = buildChatSystemPrompt(context, userData);
        const fullPrompt = buildChatPrompt(message, systemPrompt, conversationHistory, context, userData);

        console.log('🤖 調用 Gemini API，提示詞長度：', fullPrompt.length);

        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Gemini API 超時（超過30秒）')), 30000)
        );

        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await Promise.race([
            model.generateContent(fullPrompt),
            timeoutPromise
        ]);
        
        const response = await result.response;
        const aiResponse = response.text();

        console.log('✅ Gemini API 回應成功，長度：', aiResponse.length);

        const processedResponse = await processSpecialCommands(message, aiResponse, context, userData);

        res.json({
            status: 'success',
            response: processedResponse,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ 聊天API錯誤：', error);
        
        let errorMessage = 'AI服務暫時不可用，請稍後再試';
        let statusCode = 500;
        
        if (error.message.includes('超時')) {
            errorMessage = 'AI回應超時，請稍後再試或簡化您的問題';
        } else if (error.message.includes('API_KEY') || error.message.includes('401')) {
            errorMessage = 'AI服務配置錯誤，請聯繫技術支援';
        } else if (error.message.includes('429') || error.message.includes('Too Many Requests') || error.message.includes('Resource exhausted')) {
            errorMessage = 'AI服務目前請求過於頻繁，請稍候幾秒後再試';
            statusCode = 429;
        } else if (error.message.includes('quota') || error.message.includes('limit')) {
            errorMessage = 'AI服務使用量已達上限，請稍後再試';
        } else if (error.message.includes('404') || error.message.includes('not found')) {
            errorMessage = 'AI模型暫時不可用，請稍後再試';
        }
        
        res.status(statusCode).json({
            status: 'error',
            message: errorMessage,
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// API：利率模擬
app.post('/api/rate/simulate', (req, res) => {
    try {
        const { currentRating, targetRating, improvement } = req.body;
        
        const currentDiscount = calculateLoanDiscountByRating(currentRating);
        const targetDiscount = calculateLoanDiscountByRating(targetRating);
        
        const result = {
            current: {
                rating: currentRating,
                discount: currentDiscount.discount,
                discountRange: currentDiscount.discountRange
            },
            target: {
                rating: targetRating,
                discount: targetDiscount.discount,
                discountRange: targetDiscount.discountRange
            },
            improvement: improvement || '未指定',
            estimatedChange: targetDiscount.discount - currentDiscount.discount
        };

        res.json({
            status: 'success',
            simulation: result
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// API：區塊鏈查證
app.post('/api/blockchain/verify', (req, res) => {
    try {
        const { companyId, assessmentId } = req.body;
        
        const mockData = {
            onChain: true,
            transactionHash: '0x39A' + Math.random().toString(16).substr(2, 10) + '8FE',
            timestamp: new Date().toISOString(),
            rating: 'A',
            verified: true
        };

        res.json({
            status: 'success',
            verification: mockData
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// ========== 靜態文件和頁面路由 ==========
app.use(express.static('public'));

// 路由：首頁
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// 路由：永續經濟活動評分系統（新版ESG評估）
app.get('/assessment', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'esg-assessment.html'));
});

// 路由：輔導平台
app.get('/platform', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'platform.html'));
});

// 路由：GRI 評估系統
app.get('/gri-assessment', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'gri-assessment.html'));
});

// 路由：GRI 評估報告
app.get('/gri-report', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'gri-report.html'));
});

// 路由：GRI 報告測試（用於開發調試）
app.get('/test-report', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'test-report.html'));
});

// 路由：ESG評等結果
app.get('/esg-result', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'esg-result.html'));
});

// 路由：永續平台
app.get('/sustainability', (req, res) => {
    console.log('📄 訪問永續平台頁面');
    const filePath = path.join(__dirname, 'views', 'sustainability.html');
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('❌ 發送文件錯誤：', err);
            res.status(500).send('頁面載入失敗');
        }
    });
});

// 路由：ESG改善追蹤儀表板
app.get('/esg-tracker', (req, res) => {
    console.log('📊 訪問ESG改善追蹤儀表板');
    res.sendFile(path.join(__dirname, 'views', 'esg-tracker.html'));
});

// ========== 以下函數定義（非路由） ==========
// 生成給 Gemini 的提示詞
function generateGeminiPrompt(answers, scores) {
    const answerSummary = Object.entries(answers)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
    
    const scoreSummary = `
環境(E): ${scores.E}/24
社會(S): ${scores.S}/30
治理(G): ${scores.G}/24
總分: ${scores.total}/78 (${scores.percentage}%)
評級: ${scores.levelName}
`;

    return `
你是一位資深的 ESG 永續發展顧問。我有一家公司完成了 GRI 永續評估問卷。請根據他們的答案，提供詳細且具體的改善建議。

【公司的評估結果】
${scoreSummary}

【公司的具體答案】
${answerSummary}

請提供以下內容：

1. **整體評估**：針對這家公司的永續發展現狀進行評估（2-3段）

2. **各構面詳細分析**：
   - 針對環境(E)、社會(S)、治理(G)分別分析優勢和不足
   
3. **優先改善項目**：根據答案，列出前 5 項最應該優先改善的項目，每項需包含：
   - 改善項目名稱
   - 為什麼重要（商業價值 + 永續價值）
   - 具體行動步驟（3-5步）
   - 預期效果
   - 預計成本等級（低/中/高）
   
4. **快速勝利**（Quick Wins）：列出可以立即實施、低成本但能帶來改善的 3 項行動

5. **長期策略**：建議 1-2 年內的永續發展策略方向

請用繁體中文回答，並使用 Markdown 格式。建議要具體、可行且量化。
`;
}

// 生成給 Gemini 的詳細提示詞（生成改善建議和正向反饋）
function generateDetailedGeminiPrompt(answers, scores) {
    const answerSummary = Object.entries(answers)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
    
    const scoreSummary = `
環境(E): ${scores.E}/24 (${Math.round((scores.E / 24) * 100)}%)
社會(S): ${scores.S}/30 (${Math.round((scores.S / 30) * 100)}%)
治理(G): ${scores.G}/24 (${Math.round((scores.G / 24) * 100)}%)
總分: ${scores.total}/78 (${scores.percentage}%)
評級: ${scores.levelName}
`;

    return `
你是一位資深的 ESG 永續發展顧問和企業教練。

【重要提醒】
- 這份反饋是直接呈現給客戶（貴公司）的
- 請使用「貴公司」來指代客戶公司
- 語氣應該專業、鼓勵且建設性
- 避免使用占位符如 [公司名稱] 等
- 這是客戶工具平台自動生成的專業報告

【貴公司的評估結果】
${scoreSummary}

【貴公司的具體答案】
${answerSummary}

請根據貴公司的具體情況，直接提供以下內容（以「貴公司」稱呼）：

1. **🎯 整體評估與肯定**（2-3段）
   - 肯定貴公司已做得好的地方
   - 指出貴公司當前的優勢和成就
   - 表達積極和鼓勵的態度

2. **💪 優勢亮點**
   - 列出貴公司前 3-5 項表現最好的領域
   - 解釋為什麼這些是貴公司的重要競爭優勢

3. **🚀 改善機會（而非缺陷）**
   - 以正面的「機會」角度呈現貴公司的改善空間
   - 針對貴公司的前 5 項優先改善項目，每項包含：
     * 項目名稱
     * 為什麼這是貴公司的未來機會（商業價值 + 永續價值）
     * 具體的行動步驟（3-5步，適合貴公司規模實施）
     * 預期的正面成果
     * 實施難度等級（易/中/難）

4. **⚡ 快速勝利**（Quick Wins）
   - 3-5 項貴公司可以立即實施、見效快、能提升信心的行動
   - 每項包含：實施時間（天/週）、預期效果、所需資源

5. **🎁 針對貴公司的特別建議**
   - 根據貴公司的具體答案和現況，提出 1-2 項獨特且創新的永續發展方向
   - 這些應該是差異化的、能為貴公司帶來競爭優勢的

6. **💝 激勵話語**
   - 用鼓勵的話語，表達對貴公司承諾永續發展的期待和信心

**重要指引：**
- 全程使用正面、建設性的語氣
- 避免批評或負面措辭，用「機會」替代「問題」
- 提供具體、可執行的建議
- 考慮貴公司的實際資源限制和發展階段
- 強調永續發展帶來的商業機會和競爭優勢，不只是責任
- 直接稱呼「貴公司」，不使用任何占位符

用繁體中文回答，使用 Markdown 格式，字數約 2000-3000 字。
`;
}

// TESES (土地銀行中小企業簡易ESG評分機制) V1.1 評分計算函數
function calculateESGScore(data) {
    let scores = {
        details: {},
        E: 0,
        S: 0,
        G: 0,
        T: 0,
        total: 0,
        level: '',
        levelName: '',
        improvements: []
    };

    // ===================== E 構面（環境保護與氣候行動）- 35分 =====================
    // 支持兩種格式：詳細格式（e1_carbonManagement）和簡單格式（e1: yes/no）
    
    // E1: 節能採購（6分）
    let e1Score = 0;
    if (data.e1_carbonManagement === 'completed-scope1-2') {
        e1Score = 12; // 舊格式：完成盤查 + 目標（調整為新格式）
    } else if (data.e1_carbonManagement === 'platform-tool') {
        e1Score = 6; // 舊格式：盤查完成但無明確目標
    } else if (data.e1_carbonManagement === 'committed-next-year') {
        e1Score = 3; // 舊格式
    } else if (data.e1 === 'yes') {
        e1Score = 6; // 新格式：節能採購
    } else {
        e1Score = 0;
    }
    scores.E += e1Score;
    scores.details.e1 = e1Score;
    if (e1Score < 6) scores.improvements.push('E1');

    // E2: 節能控管與量化指標（7分）
    let e2Score = 0;
    if (data.e2_energyEfficiency === 'updated-equipment-past2y') {
        e2Score = 10; // 舊格式（調整為新格式）
    } else if (data.e2_energyEfficiency === 'led-full-replacement') {
        e2Score = 7; // 舊格式
    } else if (data.e2_energyEfficiency === 'basic-measures') {
        e2Score = 4; // 舊格式
    } else if (data.e2 === 'yes') {
        e2Score = 7; // 新格式：節能控管與量化指標
    } else {
        e2Score = 0;
    }
    scores.E += e2Score;
    scores.details.e2 = e2Score;
    if (e2Score < 7) scores.improvements.push('E2');

    // E3: 碳排減量計畫（7分）
    let e3Score = 0;
    if (data.e3_waste === 'yes') e3Score += 3; // 舊格式：廢棄物減量目標
    if (data.e3_water === 'yes') e3Score += 3; // 舊格式：資源化管理
    if (data.e3 === 'yes') {
        e3Score = 7; // 新格式：碳排減量計畫（覆蓋舊格式）
    }
    scores.E += e3Score;
    scores.details.e3 = e3Score;
    if (e3Score === 0) scores.improvements.push('E3');

    // E4: 無環境污染裁罰（6分）
    let e4Score = data.e4 === 'yes' ? 6 : 0;
    scores.E += e4Score;
    scores.details.e4 = e4Score;
    if (e4Score === 0) scores.improvements.push('E4');

    // E5: 綠能建置投資（5分）
    let e5Score = data.e5 === 'yes' ? 5 : 0;
    scores.E += e5Score;
    scores.details.e5 = e5Score;
    if (e5Score === 0) scores.improvements.push('E5');

    // E6: 廢棄物資源循環利用（4分）
    let e6Score = data.e6 === 'yes' ? 4 : 0;
    scores.E += e6Score;
    scores.details.e6 = e6Score;
    if (e6Score === 0) scores.improvements.push('E6');

    // ===================== S 構面（社會責任與人力資本）- 35分 =====================
    // 支持兩種格式：詳細格式和簡單格式（s1-s5: yes/no）
    
    // S1: 無鄰居檢舉事件（7分）
    let s1Score = 0;
    if (data.s1_training === 'yes-15hours') {
        s1Score = 10; // 舊格式（調整為新格式）
    } else if (data.s1_training === 'basic-training') {
        s1Score = 4; // 舊格式
    } else if (data.s1 === 'yes') {
        s1Score = 7; // 新格式：無鄰居檢舉事件
    } else {
        s1Score = 0;
    }
    scores.S += s1Score;
    scores.details.s1 = s1Score;
    if (s1Score === 0) scores.improvements.push('S1');

    // S2: 無勞工裁罰事項（8分）
    let s2Score = 0;
    if (data.s2_welfare === 'exceeds-law') {
        s2Score = 10; // 舊格式（調整為新格式）
    } else if (data.s2_welfare === 'basic-insurance') {
        s2Score = 5; // 舊格式
    } else if (data.s2 === 'yes') {
        s2Score = 8; // 新格式：無勞工裁罰事項
    } else {
        s2Score = 0;
    }
    scores.S += s2Score;
    scores.details.s2 = s2Score;
    if (s2Score === 0) scores.improvements.push('S2');

    // S3: 公益或相關採購（7分）
    let s3Score = 0;
    if (data.s3_supplychain === 'yes') {
        s3Score = 5; // 舊格式（調整為新格式）
    } else if (data.s3 === 'yes') {
        s3Score = 7; // 新格式：公益或相關採購
    } else {
        s3Score = 0;
    }
    scores.S += s3Score;
    scores.details.s3 = s3Score;
    if (s3Score === 0) scores.improvements.push('S3');

    // S4: 聘用弱勢族群或實習計畫（8分）
    let s4Score = 0;
    if (data.s4_community === 'yes') {
        s4Score = 5; // 舊格式（調整為新格式）
    } else if (data.s4 === 'yes') {
        s4Score = 8; // 新格式：聘用弱勢族群或實習計畫
    } else {
        s4Score = 0;
    }
    scores.S += s4Score;
    scores.details.s4 = s4Score;
    if (s4Score === 0) scores.improvements.push('S4');

    // S5: 投資ESG綠色金融商品（5分）
    let s5Score = data.s5 === 'yes' ? 5 : 0;
    scores.S += s5Score;
    scores.details.s5 = s5Score;
    if (s5Score === 0) scores.improvements.push('S5');

    // ===================== G 構面（公司治理與誠信經營）- 30分 =====================
    // 支持兩種格式：詳細格式和簡單格式（g1-g7: yes/no）
    
    // G1: 依照規定繳稅（5分）
    let g1Score = 0;
    if (data.g1_sustainability === 'executive-with-team') {
        g1Score = 10; // 舊格式（調整為新格式）
    } else if (data.g1_sustainability === 'dedicated-staff') {
        g1Score = 5; // 舊格式
    } else if (data.g1 === 'yes') {
        g1Score = 5; // 新格式：依照規定繳稅
    } else {
        g1Score = 0;
    }
    scores.G += g1Score;
    scores.details.g1 = g1Score;
    if (g1Score === 0) scores.improvements.push('G1');

    // G2: 無漏開發票等故意事項（5分）
    let g2Score = 0;
    if (data.g2_compliance === 'no-major-violations') {
        g2Score = 10; // 舊格式（調整為新格式）
    } else if (data.g2_compliance === 'minor-violations-resolved') {
        g2Score = 5; // 舊格式
    } else if (data.g2 === 'yes') {
        g2Score = 5; // 新格式：無漏開發票等故意事項
    } else {
        g2Score = 0;
    }
    scores.G += g2Score;
    scores.details.g2 = g2Score;
    if (g2Score === 0) scores.improvements.push('G2');

    // G3: 無逃漏裁罰事項（4分）
    let g3Score = 0;
    if (data.g3_integrity === 'yes') {
        g3Score = 5; // 舊格式（調整為新格式）
    } else if (data.g3 === 'yes') {
        g3Score = 4; // 新格式：無逃漏裁罰事項
    } else {
        g3Score = 0;
    }
    scores.G += g3Score;
    scores.details.g3 = g3Score;
    if (g3Score === 0) scores.improvements.push('G3');

    // G4: 近三年皆有盈餘（4分）
    let g4Score = data.g4 === 'yes' ? 4 : 0;
    scores.G += g4Score;
    scores.details.g4 = g4Score;
    if (g4Score === 0) scores.improvements.push('G4');

    // G5: 定期召開董事會說明財務（4分）
    let g5Score = data.g5 === 'yes' ? 4 : 0;
    scores.G += g5Score;
    scores.details.g5 = g5Score;
    if (g5Score === 0) scores.improvements.push('G5');

    // G6: 定期與股東說明營運狀況（4分）
    let g6Score = data.g6 === 'yes' ? 4 : 0;
    scores.G += g6Score;
    scores.details.g6 = g6Score;
    if (g6Score === 0) scores.improvements.push('G6');

    // G7: 編製永續報告書（4分）
    let g7Score = data.g7 === 'yes' ? 4 : 0;
    scores.G += g7Score;
    scores.details.g7 = g7Score;
    if (g7Score === 0) scores.improvements.push('G7');

    // 計算總分（E35 + S35 + G30 = 100，不再包含T構面）
    scores.total = Math.round((scores.E + scores.S + scores.G) * 10) / 10;

    // 評分等級與金融優惠 - 精修版本
    if (scores.total >= 80) {
        scores.level = 'A';
        scores.levelName = '領先級 (A)';
        scores.rateDiscount = 0.15;
        scores.rateDiscountRange = '0.15% ~ 0.2%';
        scores.products = ['永續績效連結貸款(SLL)', '綠色融資', '永續夥伴年度表揚'];
        scores.specialBenefits = ['優先承作 SLL 資格', '最高減碼幅度'];
    } else if (scores.total >= 60) {
        scores.level = 'B';
        scores.levelName = '平均級 (B)';
        scores.rateDiscount = 0.075;
        scores.rateDiscountRange = '0.05% ~ 0.1%';
        scores.products = ['一般永續授信', '永續主題貸款'];
        scores.specialBenefits = ['綠色融資快速審核通道', 'ESG輔導平台進階功能免費使用'];
    } else if (scores.total >= 30) {
        scores.level = 'C';
        scores.levelName = '潛力級 (C)';
        scores.rateDiscount = 0;
        scores.rateDiscountRange = '無利率優惠';
        scores.products = ['一般授信(須持續改善)'];
        scores.specialBenefits = ['需簽訂12個月轉型意向書', '達到B級後續貸享優惠'];
        scores.warning = '需與銀行簽訂「永續轉型意向書」，12個月內達到B級';
    } else {
        scores.level = 'D';
        scores.levelName = '風險級 (D)';
        scores.rateDiscount = -0.05;
        scores.rateDiscountRange = '基準利率加碼0.05%';
        scores.products = ['一般授信(需加嚴審核)'];
        scores.specialBenefits = ['限制下一年度授信額度'];
        scores.warning = '需提交「風險改善計畫」並定期追蹤';
    }

    return scores;
}

// 改善建議映射
function getImprovementSuggestions() {
    return {
        'E1': {
            title: '碳管理意識與盤查',
            actions: [
                '使用輔導平台的「簡易碳盤查工具」，5分鐘完成基本計算',
                '下載免費的「中小企業碳盤查指南」，了解範疇一、二的定義',
                '聯絡我行永續金融顧問，預約免費諮詢服務'
            ]
        },
        'E2': {
            title: '能源效率與節約行動',
            actions: [
                '申請政府補助：「中小企業節能補助計畫」最高補助50%',
                '下載「能源效率改善標準作業流程」範本',
                '聯絡合作廠商進行免費能耗診斷'
            ]
        },
        'E3': {
            title: '廢棄物與水資源管理',
            actions: [
                '建立廢棄物分類管理制度，參考「廢棄物減量推動指南」',
                '評估導入雨水回收或廢水再利用的可行性',
                '定期進行廢棄物稽核，記錄減量成果'
            ]
        },
        'S1': {
            title: '員工培訓與職涯發展',
            actions: [
                '制定年度人才培訓計畫，目標：每名員工至少15小時',
                '利用「輔導平台」的免費培訓課程資源庫',
                '參與政府補助的專業人才培訓課程'
            ]
        },
        'S2': {
            title: '員工福利與友善職場',
            actions: [
                '檢視現有福利政策，對標業界最佳實踐',
                '考慮提供優於法規的福利：彈性工時、育嬰假延長等',
                '建立員工健康檢查制度，每年至少一次'
            ]
        },
        'S3': {
            title: '供應鏈管理（初階）',
            actions: [
                '下載「供應商人權與永續承諾書」範本',
                '與主要供應商簽署合作協議，納入ESG條款',
                '定期進行供應商評估，鼓勵改善'
            ]
        },
        'S4': {
            title: '當地社會參與',
            actions: [
                '制定年度社區回饋計畫，如志工服務或在地採購',
                '參與當地商業公會或社區活動',
                '與NGO合作，支持弱勢族群或環保項目'
            ]
        },
        'G1': {
            title: '永續專責組織與承諾',
            actions: [
                '指派高階主管（或董事）為ESG負責人',
                '成立跨部門的永續委員會，明確訂定職責',
                '定期召開會議，追蹤ESG目標進度'
            ]
        },
        'G2': {
            title: '法規遵循紀錄',
            actions: [
                '定期自行檢查是否符合環保、勞工等相關法規',
                '建立合規監測制度，及時排除隱患',
                '若有過去違規，請完整記錄改善過程，提交改善證明'
            ]
        },
        'G3': {
            title: '誠信經營與風險管理',
            actions: [
                '將誠信經營政策納入公司規章或員工守則',
                '建立舉報機制，保護檢舉者隱私',
                '定期舉辦誠信經營教育訓練'
            ]
        },
        'T1': {
            title: '平台使用與透明揭露',
            actions: [
                '註冊並使用土地銀行「企業ESG輔導平台」',
                '每年至少更新一次TESES評分數據',
                '利用平台功能，自動保存並管理證明文件'
            ]
        },
        'T2': {
            title: '永續目標設定',
            actions: [
                '在平台上設定具體、可量化的永續目標',
                '例如：「2024年碳排強度較2023年下降5%」或「2025年達成淨零廢棄物」',
                '定期檢視進度，並更新目標實現情況'
            ]
        }
    };
}

// 碳盤查計算函數
function calculateCarbonFootprint(data) {
    const emissionFactors = {
        electricity: 0.509, // kg CO2/kWh (台電平均排放係數)
        naturalGas: 2.02,   // kg CO2/m³
        gasoline: 2.31,     // kg CO2/L
        diesel: 2.68,       // kg CO2/L
        lpg: 1.51          // kg CO2/L
    };

    let scope1 = 0; // 直接排放
    let scope2 = 0; // 間接排放（電力）

    // 範疇一：直接排放
    if (data.naturalGas) scope1 += data.naturalGas * emissionFactors.naturalGas;
    if (data.gasoline) scope1 += data.gasoline * emissionFactors.gasoline;
    if (data.diesel) scope1 += data.diesel * emissionFactors.diesel;
    if (data.lpg) scope1 += data.lpg * emissionFactors.lpg;

    // 範疇二：間接排放（電力）
    if (data.electricity) scope2 += data.electricity * emissionFactors.electricity;

    const total = scope1 + scope2;

    return {
        scope1: Math.round(scope1 * 100) / 100,
        scope2: Math.round(scope2 * 100) / 100,
        total: Math.round(total * 100) / 100,
        unit: 'kg CO2e'
    };
}

// GRI 評分計算函數 (Level 2)
function calculateGRIScore(responses) {
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
        details: {},
        level: '',
        recommendations: []
    };

    // 計算各構面得分
    ['E', 'S', 'G'].forEach(category => {
        if (responses[category]) {
            responses[category].forEach(item => {
                const score = scoreMapping[item.value] || 0;
                scores[category] += score;
                
                // 如果回答不完美，加入改善建議
                if (item.value !== 'advanced' && item.value !== 'yes') {
                    scores.recommendations.push(`${category}構面可進一步改善：${item.label}`);
                }
            });
        }
    });

    // 計算總分（加權平均）
    // E和S各佔35%，G佔30%
    const totalWeighted = (scores.E * 0.35 + scores.S * 0.35 + scores.G * 0.30);
    scores.total = Math.round(totalWeighted * 10) / 10;

    // 判斷等級
    if (scores.total >= 8.5) {
        scores.level = 'A (領先級)';
        scores.summary = '您的公司已具備卓越的 GRI 揭露基礎，建議進一步尋求第三方驗證';
    } else if (scores.total >= 7.0) {
        scores.level = 'B (中上級)';
        scores.summary = '您的公司具備良好的永續發展實踐，建議重點補強評分較低的構面';
    } else if (scores.total >= 5.5) {
        scores.level = 'C (進展級)';
        scores.summary = '您的公司已開始建立永續管理體系，建議優先改善環境與治理構面';
    } else {
        scores.level = 'D (初期級)';
        scores.summary = '建議從基礎政策制定與員工意識提升開始著手';
    }

    scores.details = {
        E: scores.E,
        S: scores.S,
        G: scores.G
    };

    return scores;
}

// GRI 評分計算函數（從前端答案計算）
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

    // 計算百分比（E: 8題 × 3 = 24, S: 10題 × 3 = 30, G: 8題 × 3 = 24）
    const eMax = 24;
    const sMax = 30;
    const gMax = 24;
    const totalMax = eMax + sMax + gMax; // 78
    const totalScore = scores.E + scores.S + scores.G;
    const percentage = Math.round((totalScore / totalMax) * 100);
    
    scores.percentage = percentage;
    scores.total = totalScore;
    scores.totalMax = totalMax;

    // 判斷等級
    if (percentage >= 85) {
        scores.level = 'A';
        scores.levelName = '領先級 (A)';
        scores.summary = '您的公司已具備卓越的永續發展實踐（85-100%），建議進一步尋求第三方驗證或認證。';
    } else if (percentage >= 70) {
        scores.level = 'B';
        scores.levelName = '平均級 (B)';
        scores.summary = '您的公司具備良好的永續發展基礎（70-84%），建議重點補強評分較低的構面。';
    } else if (percentage >= 55) {
        scores.level = 'C';
        scores.levelName = '進展級 (C)';
        scores.summary = '您的公司已開始建立永續管理體系（55-69%），建議優先改善環境與治理構面。';
    } else {
        scores.level = 'D';
        scores.levelName = '初期級 (D)';
        scores.summary = '建議從基礎政策制定與員工意識提升開始著手（<55%），逐步建立永續發展文化。';
    }

    return scores;
}

// 生成 GRI Markdown 報告
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

    // E 構面詳細答案
    markdown += `### 🌍 環境構面 (E)\n\n`;
    for (let i = 1; i <= 8; i++) {
        const key = 'E' + i;
        if (answers[key]) {
            markdown += `**E${i}：** ${answers[key]}\n\n`;
        }
    }

    // S 構面詳細答案
    markdown += `### 👥 社會構面 (S)\n\n`;
    for (let i = 1; i <= 10; i++) {
        const key = 'S' + i;
        if (answers[key]) {
            markdown += `**S${i}：** ${answers[key]}\n\n`;
        }
    }

    // G 構面詳細答案
    markdown += `### ⚖️ 治理構面 (G)\n\n`;
    for (let i = 1; i <= 8; i++) {
        const key = 'G' + i;
        if (answers[key]) {
            markdown += `**G${i}：** ${answers[key]}\n\n`;
        }
    }

    // 改善建議
    markdown += `---

## 💡 改善建議

`;

    if (scores.level === 'A') {
        markdown += `### 🏆 您已達到領先級水準！

恭喜！您的企業已在 ESG 各個面向展現出色的表現。建議您：

- 考慮申請第三方 ESG 認證或驗證
- 成為業界永續發展標竿企業
- 深化員工和供應鏈的永續意識培訓
- 進一步擴大您的永續發展報告範圍
`;
    } else if (scores.level === 'B') {
        markdown += `### 📈 穩步前進的平均級企業

您的企業已建立良好的永續基礎。建議您：

- 針對得分較低的構面進行深入改善
- 建立量化的永續發展目標
- 定期進行 ESG 績效評估和更新
- 與供應商分享永續發展理念
`;
    } else if (scores.level === 'C') {
        markdown += `### 🌱 成長中的企業 - 加油！

您的企業已開始重視永續發展。建議您：

- 優先完善環境和治理政策
- 指派專責人員推動 ESG 工作
- 制定明確的改善時程表
- 尋求外部協助和資源支持
`;
    } else {
        markdown += `### 🚀 起步階段 - 開啟永續之旅

您的企業正在永續發展的起步階段。建議您：

- 從制定基本永續政策開始
- 建立公司層級的 ESG 治理結構
- 進行員工永續意識培訓
- 利用本平台的輔導工具進行改善
`;
    }

    markdown += `

---

## 📞 下一步行動

1. **詳閱本報告** - 了解您企業的優勢與不足
2. **制定改善計畫** - 針對較弱的構面優先改進
3. **聯絡顧問** - 尋求土地銀行的永續金融支持
4. **定期評估** - 每半年至一年重新進行評估追蹤進度

---

*感謝您使用土地銀行綠易通 (Green 'E' Pass) 平台！*
`;

    return markdown;
}

// 計算單個活動的評等邏輯 (Y/T/N/X)
function calculateActivityRating(activity) {
    // activity結構：
    // {
    //   sequenceNum: "01",
    //   type: "operating" 或 "project",
    //   category: "一般經濟活動" 或 "支持型經濟活動" 或 "不適用",
    //   condition1: boolean (是否有實質貢獻),
    //   condition2: boolean (是否未造成重大環境危害),
    //   condition3: boolean (是否未造成重大社會危害),
    //   transitionPlan: "是" 或 "否" 或 "不適用"
    // }
    
    let rating = '';
    let definition = '';
    
    // 規則1：X (不適用)
    if (activity.category === '不適用') {
        rating = 'X';
        definition = '該經濟活動目前未納入本指引之經濟活動範圍。';
    }
    // 規則2：Y (符合)
    else if (activity.condition1 && activity.condition2 && activity.condition3) {
        rating = 'Y';
        definition = '該經濟活動已符合本指引之三項條件。';
    }
    // 規則3：T (轉型中)
    else if ((!activity.condition1 || !activity.condition2 || !activity.condition3) && activity.transitionPlan === '是') {
        rating = 'T';
        definition = '該經濟活動目前不符合本指引之任一條件，但企業已訂有轉型計畫，以達到「符合」的程度。';
    }
    // 規則4：N (不符合)
    else if ((!activity.condition1 || !activity.condition2 || !activity.condition3) && activity.transitionPlan === '否') {
        rating = 'N';
        definition = '該經濟活動目前不符合本指引之任一條件，且企業尚無具體計畫或時程進行轉型。';
    }
    
    return {
        sequenceNum: activity.sequenceNum,
        type: activity.type,
        activityCode: activity.activityCode,
        activityName: activity.activityName,
        rating: rating,
        definition: definition,
        conditions: {
            condition1: activity.condition1,
            condition2: activity.condition2,
            condition3: activity.condition3,
            transitionPlan: activity.transitionPlan
        }
    };
}

// 生成ESG評語
function generateESGCommentary(results, requestData) {
    const commentary = {
        overallSummary: '',
        recommendations: [],
        references: []
    };
    
    // 計算評等統計
    const ratingCounts = {
        Y: results.filter(r => r.rating === 'Y').length,
        T: results.filter(r => r.rating === 'T').length,
        N: results.filter(r => r.rating === 'N').length,
        X: results.filter(r => r.rating === 'X').length
    };
    
    // 總結評語
    const total = results.length;
    const compliantCount = ratingCounts.Y;
    const compliantPercent = total > 0 ? Math.round((compliantCount / total) * 100) : 0;
    
    commentary.overallSummary = `共評估 ${total} 項經濟活動。其中，符合(Y)${ratingCounts.Y}項、轉型中(T)${ratingCounts.T}項、不符合(N)${ratingCounts.N}項、不適用(X)${ratingCounts.X}項。符合度為 ${compliantPercent}%。`;
    
    // 建議清單
    if (ratingCounts.T > 0) {
        commentary.recommendations.push('貴公司有轉型中的經濟活動，建議加速實施轉型計畫以達到符合標準。');
    }
    if (ratingCounts.N > 0) {
        commentary.recommendations.push('建議針對不符合的經濟活動訂定具體的改善或轉型計畫。');
    }
    
    // 補充參考資源
    if (requestData.table1Data && !requestData.table1Data.thirdPartyVerification) {
        commentary.references.push({
            title: '環境部氣候變遷署 - 事業溫室氣體排放量資訊平台',
            url: 'https://ghgregistry.moenv.gov.tw/epa_ghg/VerificationMgt/InspectionAgency.aspx',
            reason: '建議取得第三方驗證機構的查證，以提升溫室氣體排放數據的可信度。'
        });
    }
    
    if (requestData.table1Data && !requestData.table1Data.sustainabilityReport) {
        commentary.references.push({
            title: '臺灣證券交易所 - 永續報告書確信機構',
            url: 'https://cgc.twse.com.tw/agency/chPage',
            reason: '建議編製永續報告書，提升企業透明度與永續治理水準。'
        });
    }
    
    return commentary;
}

// 計算 ESG 評等（A/B/C）- 根據新標準
function calculateESGRating(assessmentData) {
    const esgItems = assessmentData.esgAssessment || {};
    const activities = assessmentData.activities || [];
    
    // 統計 ESG 項目（E/S/G）
    let yesCount = 0;
    let noCount = 0;
    
    Object.values(esgItems).forEach(value => {
        if (value === 'yes') yesCount++;
        if (value === 'no') noCount++;
    });
    
    const totalESG = yesCount + noCount;
    const esgPercent = totalESG > 0 ? (yesCount / totalESG) * 100 : 0;
    const roundedPercent = Math.round(esgPercent);
    
    // 統計經濟活動評等（Y/T/N/X）
    const yCount = activities.filter(a => a.rating === 'Y').length;
    const tCount = activities.filter(a => a.rating === 'T').length;
    const nCount = activities.filter(a => a.rating === 'N').length;
    const compliantRatio = activities.length > 0 ? (yCount / activities.length) * 100 : 0;
    
    // ABC 評等標準（根據新表格）
    // A 級：ESG 符合度 >= 90%（優秀表現）
    // B 級：ESG 符合度 70%-89%（良好表現）
    // C 級：ESG 符合度 < 70%（基礎表現）
    
    console.log('📊 計算評級 - 原始esgPercent:', esgPercent, '四舍五入:', roundedPercent, 'yesCount:', yesCount, 'noCount:', noCount, 'totalESG:', totalESG);
    
    let rating = 'C';
    let ratingDescription = '';
    
    // 使用原始百分比（不四舍五入）来判断评级，确保94.44%能正确判断为A级
    if (esgPercent >= 90) {
        rating = 'A';
        ratingDescription = '優秀：完全符合ESG標準，穩定落實環境、社會及治理措施';
        console.log('✅ 評級結果: A級 (esgPercent >= 90, 原始值:', esgPercent, ')');
    } else if (esgPercent >= 70) {
        rating = 'B';
        ratingDescription = '良好：部分符合ESG標準，有努力改進但仍有提升空間';
        console.log('✅ 評級結果: B級 (70 <= esgPercent < 90, 原始值:', esgPercent, ')');
    } else {
        rating = 'C';
        ratingDescription = 'ESG措施基礎薄弱，風險但仍有諾貸款，須依風險調整';
        console.log('✅ 評級結果: C級 (esgPercent < 70, 原始值:', esgPercent, ')');
    }
    
    const result = {
        rating: rating,
        description: ratingDescription,
        esgPercent: roundedPercent,  // 返回时使用四舍五入的值用于显示
        compliantRatio: Math.round(compliantRatio),
        yesCount: yesCount,
        noCount: noCount,
        activityStats: {
            Y: yCount,
            T: tCount,
            N: nCount,
            X: activities.length - yCount - tCount - nCount
        }
    };
    
    console.log('📤 返回评级结果:', JSON.stringify(result, null, 2));
    console.log('⚠️ 重要: 评级判断使用原始百分比', esgPercent, '>= 90?', esgPercent >= 90, '→', rating);
    
    return result;
}

// 用 Gemini 生成個性化建議
async function generateGeminiRecommendation(assessmentData, ratingResult) {
    try {
        if (!GEMINI_API_KEY) {
            console.warn('⚠️ 未設定 GEMINI_API_KEY，使用預設建議');
            return generateFallbackRecommendation(ratingResult);
        }
        
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        
        // 準備詳細的評估數據
        const esgItems = assessmentData.esgAssessment || {};
        const table1Data = assessmentData.table1Data || {};
        const activities = assessmentData.activities || [];
        
        // 分析 ESG 項目
        const esgAnalysis = {
            yes: Object.entries(esgItems).filter(([k, v]) => v === 'yes').map(([k]) => k),
            no: Object.entries(esgItems).filter(([k, v]) => v === 'no').map(([k]) => k)
        };
        
        // 分析經濟活動
        const activityAnalysis = {
            compliant: activities.filter(a => a.rating === 'Y'),
            transitioning: activities.filter(a => a.rating === 'T'),
            nonCompliant: activities.filter(a => a.rating === 'N')
        };
        
        const prompt = `
你是一位資深的企業永續發展顧問，擁有 15 年以上的 ESG 轉型經驗。

【企業評估概況】
公司名稱：${table1Data.companyName || '評估企業'}
評估日期：${table1Data.assessmentDate || '未指定'}
ESG 總評級：${ratingResult.rating} 級（${ratingResult.description}）
ESG 表現得分：${ratingResult.esgPercent}%
永續經濟活動符合度：${ratingResult.compliantRatio}%

【ESG 項目詳細分析】
✅ 已符合項目（${esgAnalysis.yes.length} 項）：${esgAnalysis.yes.join('、') || '無'}
❌ 未符合項目（${esgAnalysis.no.length} 項）：${esgAnalysis.no.join('、') || '無'}

【經濟活動評估詳情】
完全符合 (Y)：${ratingResult.activityStats.Y} 項
  ${activityAnalysis.compliant.map(a => `• ${a.activityName}`).join('\n  ') || '無'}

轉型中 (T)：${ratingResult.activityStats.T} 項
  ${activityAnalysis.transitioning.map(a => `• ${a.activityName}`).join('\n  ') || '無'}

不符合 (N)：${ratingResult.activityStats.N} 項
  ${activityAnalysis.nonCompliant.map(a => `• ${a.activityName}`).join('\n  ') || '無'}

【公司基本信息】
評估年度：${table1Data.pastYear || '未指定'}
營業收入規模：${table1Data.revenue || '未提供'}
是否有第三方驗證：${table1Data.thirdPartyVerification ? '是' : '否'}
是否編製永續報告書：${esgItems.g7 === 'yes' ? '是' : '否'}

${esgItems.g7 === 'no' ? `
【特別提醒】
貴公司目前尚未編製永續報告書（G7項目）。編製永續報告書是企業永續發展的重要里程碑，建議：
- 可尋求四大會計師事務所（安永、德勤、普華永道、畢馬威）的專業協助
- 這些事務所擁有豐富的ESG報告編製經驗和國際標準認證能力
- 可協助企業建立完整的永續管理框架並符合GRI、TCFD等國際標準
` : ''}

請根據上述詳細評估數據，以專業且鼓勵的語氣，生成針對此企業的個性化建議與回饋。

回應內容應包含：

1. 【整體評估與肯定】（100-150字）
   - 肯定公司已做得好的地方
   - 指出當前評級的含義
   - 說明改進的機會和潛力

2. 【詳細的優勢分析】（150-200字）
   - 分析已符合的 ${esgAnalysis.yes.length} 項 ESG 指標的具體優勢
   - 列出符合的 ${ratingResult.activityStats.Y} 項經濟活動
   - 說明這些優勢如何為企業帶來商業價值

3. 【核心改善優先項】（200-300字）
   - 依據評等和活動符合度，列出 3-5 個最迫切的改善項目
   - 對於每個改善項目，說明：
     * 為什麼重要（商業價值 + 永續價值）
     * 具體的改善步驟（2-3 步）
     * 預期成果和時間線
   - 重點關注未符合的 ${esgAnalysis.no.length} 項 ESG 指標和 ${ratingResult.activityStats.N} 項不符合的經濟活動
   ${esgItems.g7 === 'no' ? `
   - **特別建議**：若貴公司尚未編製永續報告書（G7項目），強烈建議：
     * 可尋求四大會計師事務所（安永 EY、德勤 Deloitte、普華永道 PwC、畢馬威 KPMG）的專業協助
     * 這些事務所擁有豐富的ESG報告編製經驗和國際標準認證能力
     * 可協助企業建立完整的永續管理框架並符合GRI、TCFD等國際標準
     * 編製永續報告書有助於提升企業永續形象、吸引投資者關注、符合法規要求
   ` : ''}

4. 【轉型中活動的加速策略】（150-200字）（如果有轉型中的活動）
   - 對於轉型中的 ${ratingResult.activityStats.T} 項活動，提出加速進展的具體策略
   - 明確量化的轉型目標和時間表
   - 所需的資源投入和合作夥伴

5. 【貸款及融資機會】（100-150字）
   - 根據 ESG 評級，說明可獲得的銀行優惠
   - 推薦的融資產品和條件
   - 未來通過提升評級可獲得的更優融資條件

用繁體中文回應，結構清晰，用▌符號分隔各部分。
確保建議具體、可操作、符合企業規模和當前發展階段。
        `;
        
        // 添加超時保護（15秒）
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Gemini API 超時（超過15秒）')), 15000)
        );
        
        try {
            const result = await Promise.race([
                model.generateContent(prompt),
                timeoutPromise
            ]);
            const feedback = result.response.text();
            
            console.log('✅ Gemini API 生成建議成功');
            
            return {
                feedback: feedback,
                suggestions: [],
                source: 'gemini'
            };
        } catch (timeoutError) {
            console.warn('⚠️ Gemini API 超時或失敗，使用預設建議', timeoutError.message);
            return generateFallbackRecommendation(ratingResult);
        }
    } catch (error) {
        console.error('❌ Gemini API 錯誤：', error.message);
        return generateFallbackRecommendation(ratingResult);
    }
}

// 當 Gemini API 不可用時，生成預設建議
function generateFallbackRecommendation(ratingResult) {
    const recommendations = {
        'A': `恭喜您！貴公司在永續發展上表現卓越，達到了優秀評級。

▌整體評估
您的 ESG 表現達到 ${ratingResult.esgPercent}%，經濟活動符合度達到 ${ratingResult.compliantRatio}%，充分體現了貴公司對永續發展的重視和執行力。特別是在環保、社會責任和公司治理三大構面都有出色表現。這表示貴公司已建立完善的永續發展體系，不僅滿足法規要求，更領先業界標準。

▌優勢亮點
• 環境保護面向：在節能減碳、綠色採購、廢棄物管理等方面表現突出
• 社會責任面向：員工福利、社區參與、供應鏈管理等方面做得扎實
• 公司治理面向：透明的決策流程、完善的內部監督機制、誠信經營文化

▌維持與精進方向
1. 深化永續發展戰略
   - 從被動符合轉變為主動領先：制定更野心勃勃的減碳目標（如 2030 年碳中和）
   - 將永續發展融入企業核心業務策略，而非單純的 CSR 活動
   - 建立與主要利益相關者的永續夥伴關係

2. 提升透明度與溝通
   - 編製或更新符合國際標準（GRI、SASB、TCFD）的永續報告書
   - 每年對外揭露進展，接受外部審驗和認證
   - 建立與投資者、客戶、員工的永續發展溝通機制

3. 創新與前瞻
   - 投資循環經濟技術和綠色創新
   - 在產業中建立永續發展標竿地位
   - 分享最佳實踐，帶動產業升級

▌未來 12 個月行動計劃
□ Q1：取得第三方 ESG 認證（如 ISO 14001、B Corp 認證）
□ Q2：編製或更新永續報告書並取得獨立確信
□ Q3：建立更具野心的 2025-2030 永續發展目標
□ Q4：發佈永續發展成果，與產業同業分享經驗

▌貸款及融資優勢
• 優先享受永續績效連結貸款 (SLL) 優惠
• 符合 ESG 基金投資條件，吸引永續投資者
• 供應鏈金融服務優先資格
• 貸款利率優惠：約 2.8% ~ 3.2%（最低優惠），可節省可觀的融資成本

▌外部協助資源
建議尋求以下支持：
- 國際認證機構進行第三方驗證和確信
- 永續發展顧問協助設定 SDGs 對標目標
- 行業協會參與永續發展標準制定
- 政府綠色金融和創新補助計畫`,

        'B': `恭喜您！貴公司已建立良好的永續管理基礎，獲得良好評級。

▌整體評估
您的 ESG 表現達到 ${ratingResult.esgPercent}%，經濟活動符合度達到 ${ratingResult.compliantRatio}%。在多個構面已展現良好的永續發展實踐，說明貴公司具有明確的永續轉型意願和初步的執行能力。此評級表示您已踏上正確方向，但仍有明顯進步空間，若能加強重點領域，可快速升至優秀級別。

▌績效分析
優勢項目（符合 Y）：${ratingResult.activityStats.Y} 項
轉型中項目（轉型 T）：${ratingResult.activityStats.T} 項
亟需改善項目（不符 N）：${ratingResult.activityStats.N} 項

▌改善重點方向
1. 補強表現較弱的構面
   - 識別評分最低的 3-5 項構面，制定專項改善計畫
   - 針對尚未符合的經濟活動（共 ${ratingResult.activityStats.N} 項），制定具體的改善路線圖
   - 預留充足的資源和時間，避免倉促上陣

2. 加速轉型中活動的進度
   - 對於轉型中的 ${ratingResult.activityStats.T} 項活動，檢視現有轉型計畫的進度
   - 如進度落後，應增派人力或資源，設定明確的里程碑
   - 定期檢視，每季度至少回顧一次轉型進度

3. 制定量化的永續目標
   - 從定性目標（如「降低排放」）升級為定量目標（如「2024 年碳排強度降低 15%」）
   - 目標應設定在「有挑戰但可達成」的水準，通常為 3-5 年計畫
   - 建立 KPI 監控機制，每月追蹤進度

4. 建立管理制度化
   - 成立跨部門的永續發展委員會，明確各部門責任
   - 將永續績效納入員工績效評估
   - 建立簡易但有效的 ESG 數據收集和報告流程

▌未來 12-18 個月具體行動
□ 月份 1-2：成立永續發展專案小組，聘請顧問診斷現狀
□ 月份 3-4：制定詳細的改善計畫，包含預算和時程
□ 月份 5-8：執行優先級最高的 3 項改善項目
□ 月份 9-12：建立 ESG 監控機制，開始編製永續報告初稿
□ 月份 13-18：取得第三方驗證，發佈永續報告書

▌預期效益
按照上述計畫執行：
• 預期在 12-18 個月內達到 A 級評級
• 符合 ${ratingResult.activityStats.N} 項經濟活動的概率從目前的 0% 提升到 80%
• 經濟活動符合度從 ${ratingResult.compliantRatio}% 提升至 70% 以上
• 貸款利率優惠幅度可增加至 0.5%，額外節省利息支出

▌貸款及融資優勢
• 目前享受利率優惠：約 3.0% ~ 3.4%，可節省中等規模融資成本
• 完成改善後可升至 2.8% ~ 3.2% 的最低優惠
• 符合綠色融資快速審核通道資格
• 可申請永續發展相關的政府補助和低利貸款

▌立即可採取的行動（本月開始）
1. 組織內部診斷工作坊，識別瓶頸所在
2. 聯絡本行永續金融顧問，申請免費的 ESG 輔導
3. 制定 Q1 改善計畫，指派責任人和預算
4. 員工動員大會，說明永續發展的商業價值`,

        'C': `感謝您參與永續發展評估。貴公司目前在改善階段，有明顯的提升空間。

▌整體評估
您的 ESG 表現達到 ${ratingResult.esgPercent}%，經濟活動符合度達到 ${ratingResult.compliantRatio}%。這表示貴公司已開始重視永續發展，但還處於初級階段。好消息是，只要採取系統性的改善措施，貴公司在 6-12 個月內可顯著提升評級。此時期採取行動最為關鍵，將決定未來數年的永續發展軌跡。

▌績效分析
符合 (Y)：${ratingResult.activityStats.Y} 項 | 轉型 (T)：${ratingResult.activityStats.T} 項 | 不符 (N)：${ratingResult.activityStats.N} 項
這個分佈表明貴公司在大多數經濟活動上還未達到最低標準，需要優先加強基礎建設。

▌核心改善方向
1. 優先補強基礎政策和制度
   必須建立的基礎文件和制度：
   • 永續發展政策聲明：董事會通過，明確公司的 ESG 承諾
   • 環境保護政策：涵蓋能源管理、排放控制、廢棄物處理等
   • 員工福利政策：工作安全、薪酬公平、員工發展等
   • 供應鏈行為守則：要求供應商符合基本勞工和環保標準

2. 針對不符合的經濟活動（${ratingResult.activityStats.N} 項）
   對每項不符合的活動，按以下步驟改善：
   • 第一步：確認具體不符之處，是法規遵循還是標準達成問題
   • 第二步：制定 6-12 個月的改善計畫，分階段達成目標
   • 第三步：配置必要的預算和人力，通常需要投入營收的 2-5%
   • 第四步：建立月度檢視機制，追蹤進度

3. 建立永續發展的組織責任
   • 在高管層（董事或副總）指派專責人，而非由基層執行
   • 成立跨部門的永續發展工作小組，每月召開會議
   • 將永續績效與高管薪酬掛勾，強化承諾度
   • 為員工提供永續發展培訓，培養組織認知

4. 數據收集與管理基礎建設
   • 建立簡易的 ESG 數據收集模板和流程
   • 明確各部門的數據來源和責任人
   • 每季度彙整一次數據，進行內部審核
   • 預留 IT 系統改善預算，未來考慮導入專業 ESG 管理軟體

▌詳細的 6-12 個月改善路線圖
第一階段（1-3 個月）：基礎建設與診斷
□ 聘請顧問或利用政府免費輔導，進行現況診斷
□ 制定企業永續發展願景，獲得董事會認可
□ 編製基礎的 ESG 政策文件（環境、社會、治理各一份）
□ 建立永續發展工作小組，明確成員和責任

第二階段（4-6 個月）：改善計畫執行
□ 優先改善評分最低的 2-3 項經濟活動
□ 完成環境評估，制定能源和排放減量目標
□ 啟動員工培訓計畫，建立永續文化
□ 試點實施 1-2 項改善措施，累積經驗

第三階段（7-9 個月）：擴大規模
□ 在全公司推廣試點成功的改善措施
□ 完成剩餘經濟活動的改善計畫
□ 收集數據並產生第一份內部 ESG 報告
□ 準備外部利益相關者溝通和反饋

第四階段（10-12 個月）：鞏固與驗證
□ 邀請第三方驗證機構進行評估
□ 發佈正式的永續報告書（或 ESG 自評報告）
□ 制定下一個週期的更高目標
□ 評估貴公司在 A 級或 B 級的可達成性

▌投資規模與預期回報
• 投資規模：通常為年營收的 1-3%，用於人力、顧問、系統和改善項目
• 預期回報：
  - 12 個月內評級提升至 B 級或以上的概率：70%
  - 經營效率提升（如能耗降低）：每年省成本 2-5%
  - 品牌價值提升：客戶滿意度和員工士氣提高
  - 融資成本降低：利率優惠從 0% 提升至 0.3-0.5%

▌貸款及融資優勢（當前與改善後）
• 目前享受利率優惠：約 3.4% 起，或依風險調整
• 完成改善後預期優惠：約 3.0% ~ 3.4%
• 可申請永續轉型意向書支持計畫
• 符合政府綠色金融補助條件

▌立即行動清單（本週開始）
1. ☐ 召集董事和高管，進行永續發展啟動會議
2. ☐ 聯絡本行申請免費 ESG 輔導和診斷
3. ☐ 識別 1-2 位願意領導永續發展的高管或部門主管
4. ☐ 預留初期改善經費（預算規模：月營收的 1-2%）
5. ☐ 向員工宣佈永續發展計畫，建立組織認知

▌成功關鍵因素
• 領導力：董事或 C 級主管的明確支持和推動
• 資源投入：不要吝嗇於顧問費、培訓費和改善項目投資
• 員工參與：讓員工理解永續發展的商業價值，而非單純的合規要求
• 持續性：永續發展是長期承諾，不能朝令夕改`,

        'default': `感謝您完成 ESG 評估。

您的評估結果已記錄，評級為 ${ratingResult.rating} 級。

建議下一步行動：
1. 詳細檢視各項評分的詳細反饋
2. 優先處理評分較低的構面
3. 聯絡本行永續金融顧問，討論改善計畫和貸款優惠
4. 定期更新評估，追蹤改善進展

歡迎隨時使用本平台進行評估和諮詢。`
    };

    const feedback = recommendations[ratingResult.rating] || recommendations['default'];
    
    return {
        feedback: feedback,
        suggestions: [],
        source: 'fallback'
    };
}

// 根據 ESG 評級計算貸款利率優惠
function calculateLoanDiscountByRating(rating) {
    const discountMap = {
        'A': {
            discount: 0.5,
            discountRange: '約 2.8% ~ 3.2%（最低優惠）',
            description: '優秀企業 - 獲得最高利率優惠',
            benefits: ['優先承作資格', '簽訂永續績效連結貸款 (SLL)', '享受專屬客戶經理服務'],
            condition: '完全符合ESG標準，穩定落實環境、社會及治理措施'
        },
        'B': {
            discount: 0.3,
            discountRange: '約 3.0% ~ 3.4%',
            description: '良好企業 - 獲得中等利率優惠',
            benefits: ['綠色融資快速審核通道', '免費使用 ESG 輔導平台進階功能', '年度永續發展報告工作坊'],
            condition: '部分符合ESG標準，有努力改進但仍有提升空間'
        },
        'C': {
            discount: 0,
            discountRange: '約 3.4% 起或依風險調整',
            description: '潛力企業 - 維持一般貸款利率',
            benefits: ['簽訂 12 個月永續轉型意向書', 'ESG 輔導平台免費使用', '定期改善追蹤報告'],
            condition: 'ESG措施基礎薄弱，風險但仍有諾貸款，須依風險調整'
        }
    };
    
    return discountMap[rating] || {
        discount: 0,
        discountRange: '無評級',
        description: '未評級 - 無利率優惠',
        benefits: [],
        condition: '需完成 ESG 評估'
    };
}
    
    // 新 API：提交完整評估並生成結果
    app.post('/api/submit-esg-assessment', async (req, res) => {
        try {
            const assessmentData = req.body;
            
            console.log('📊 收到完整 ESG 評估提交');
            console.log('📋 esgAssessment 數據:', JSON.stringify(assessmentData.esgAssessment || {}, null, 2));
            
            // 計算 ABC 評等
            console.log('🔍 开始计算评级...');
            const ratingResult = calculateESGRating(assessmentData);
            console.log('🔍 评级计算结果:', ratingResult.rating, '级, 百分比:', ratingResult.esgPercent + '%');
            
            // 計算詳細的E/S/G分數
            const esgAssessmentData = assessmentData.esgAssessment || {};
            console.log('🔍 準備計算分數，esgAssessment 數據類型:', typeof esgAssessmentData);
            console.log('🔍 esgAssessment 鍵:', Object.keys(esgAssessmentData));
            
            const esgScores = calculateESGScore(esgAssessmentData);
            
            console.log('✅ 計算完成的分數:', {
                E: esgScores.E,
                S: esgScores.S,
                G: esgScores.G,
                total: esgScores.total
            });
            
            // 用 Gemini 生成個性化建議
            const geminiResult = await generateGeminiRecommendation(assessmentData, ratingResult);
            
            // 計算貸款利率優惠
            const loanDiscount = calculateLoanDiscountByRating(ratingResult.rating);
            
            // 生成補充資源連結
            let supplementaryResources = generateSupplementaryResources(assessmentData);
            
            // 不再在 feedback 中附加資源（已由前端獨立卡片處理）
            let finalFeedback = geminiResult.feedback;
            
            // 組合完整結果
            console.log('🔍 最终返回的评级:', ratingResult.rating, '级');
            const finalResult = {
                status: 'success',
                rating: ratingResult.rating,  // 确保使用ratingResult的rating
                ratingDescription: ratingResult.description,
                scores: {
                    esg: ratingResult.esgPercent,
                    compliant: ratingResult.compliantRatio,
                    details: ratingResult.activityStats,
                    // 添加E/S/G具體分數
                    E: esgScores.E,
                    S: esgScores.S,
                    G: esgScores.G,
                    total: esgScores.total
                },
                feedback: finalFeedback,
                loanDiscount: loanDiscount,
                supplementaryResources: supplementaryResources,
                timestamp: new Date().toISOString()
            };
            
            console.log('📤 返回結果，scores 對象:', JSON.stringify(finalResult.scores, null, 2));
            
            res.json(finalResult);
        } catch (error) {
            console.error('❌ 評估提交錯誤：', error);
            res.status(500).json({
                status: 'error',
                message: error.message
            });
        }
    });

// 生成補充資源（根據評估情況）
function generateSupplementaryResources(assessmentData) {
    const resources = [];
    const table1Data = assessmentData.table1Data || {};
    const esgAssessment = assessmentData.esgAssessment || {};
    
    // 檢查第三方驗證情況
    if (!table1Data.thirdPartyVerification) {
        resources.push({
            title: '🔍 環境部氣候變遷署 許可查證機構',
            description: '若貴公司溫室氣體排放數據未經第三方機構驗證，建議取得環境部氣候變遷署核准的查驗機構進行驗證，以提升數據可信度。',
            url: 'https://ghgregistry.moenv.gov.tw/epa_ghg/VerificationMgt/InspectionAgency.aspx'
        });
    }
    
    // 檢查 G7：是否編製永續報告書
    if (esgAssessment.g7 === 'no') {
        // 添加四大會計師事務所資源
        resources.push({
            title: '📋 安永會計師事務所 (Ernst & Young)',
            description: '安永提供完整的ESG永續報告書編製服務，協助企業建立永續管理框架並符合國際標準（GRI、TCFD等）。',
            url: 'https://www.ey.com/zh_tw'
        });
        
        resources.push({
            title: '📋 德勤會計師事務所 (Deloitte)',
            description: '德勤擁有豐富的ESG諮詢與報告編製經驗，可協助企業進行永續轉型並編製符合國際標準的永續報告書。',
            url: 'https://www2.deloitte.com/tw/zh.html'
        });
        
        resources.push({
            title: '📋 普華永道會計師事務所 (PwC)',
            description: '普華永道提供ESG策略規劃與永續報告書編製服務，協助企業建立完整的永續發展體系。',
            url: 'https://www.pwc.tw/zh.html'
        });
        
        resources.push({
            title: '📋 畢馬威會計師事務所 (KPMG)',
            description: '畢馬威提供ESG永續報告書編製與確信服務，協助企業提升永續透明度並符合國際標準。',
            url: 'https://home.kpmg/tw/zh/home.html'
        });
        
        // 保留原有的確信機構連結
        resources.push({
            title: '📋 永續報告書確信機構清單',
            description: '參考臺灣證券交易所公司治理中心提供的永續報告書確信機構清單，了解更多確信服務選擇。',
            url: 'https://cgc.twse.com.tw/agency/chPage'
        });
    }
    
    return resources;
}

// ========== 以下函數定義（非路由，已在上方API路由區定義） ==========
// 注意：所有API路由已在第31-348行定義（在靜態文件中間件之前）
// 以下僅為函數定義，不包含路由定義

// 構建聊天系統提示詞
function buildChatSystemPrompt(context, userData) {
    let prompt = `你是一位專業的ESG永續發展顧問和智能客服助手，專門協助企業理解ESG評級、永續金融和相關政策。

【你的身份】
- 名稱：ESG智能客服助手
- 服務對象：使用土地銀行綠易通 (Green 'E' Pass) 平台的企業用戶
- 專業領域：ESG評估、GRI標準、永續金融、利率優惠、碳盤查、區塊鏈查證

【當前頁面上下文】
- 頁面：${context.name}
- 描述：${context.description}
- 可用功能：${context.features.join('、')}

`;

    // 如果有使用者的ESG結果，添加到上下文
    if (userData && userData.esgResult) {
        const result = userData.esgResult;
        prompt += `【用戶當前ESG評估結果】
- 評級：${result.rating || '未評級'}
- ESG得分：${result.scores?.esg || 'N/A'}%
- 符合度：${result.scores?.compliant || 'N/A'}%
- 評級說明：${result.ratingDescription || 'N/A'}

`;
    }

    // 如果有GRI評估結果
    if (userData && userData.griResult) {
        const result = userData.griResult;
        prompt += `【用戶當前GRI評估結果】
- 總分：${result.scores?.total || 'N/A'}/${result.scores?.totalMax || 'N/A'}
- 環境(E)：${result.scores?.E || 'N/A'}/24
- 社會(S)：${result.scores?.S || 'N/A'}/30
- 治理(G)：${result.scores?.G || 'N/A'}/24
- 評級：${result.scores?.levelName || 'N/A'}

`;
    }

    prompt += `【回答要求】
1. 使用繁體中文回答
2. 語氣親切、專業、鼓勵
3. 回答要具體、可操作
4. 如果涉及數值計算，要給出明確的數字
5. 如果用戶詢問利率相關問題，可以引用利率模擬功能
6. 如果用戶詢問區塊鏈，可以說明上鏈查證功能
7. 使用Markdown格式組織回答（支持標題、列表、粗體等）
8. 如果問題超出ESG範圍，禮貌地引導用戶詢問相關問題

【特殊功能】
- 利率模擬：如果用戶詢問「如果改善ESG評級，利率會如何變化」，可以調用利率模擬功能
- 區塊鏈查證：如果用戶詢問「我的ESG報告上鏈了嗎」，可以查詢區塊鏈記錄
- 填表協助：如果在評估頁面，可以提供題目說明和填寫建議

現在請回答用戶的問題：`;

    return prompt;
}

// 構建完整的聊天提示詞
function buildChatPrompt(message, systemPrompt, conversationHistory, context, userData) {
    let prompt = systemPrompt;

    // 添加對話歷史（最近10輪）
    if (conversationHistory && conversationHistory.length > 0) {
        prompt += '\n\n【對話歷史】\n';
        const recentHistory = conversationHistory.slice(-10); // 最近10條訊息
        recentHistory.forEach(msg => {
            const role = msg.role === 'user' ? '用戶' : '助手';
            prompt += `${role}：${msg.content}\n`;
        });
    }

    prompt += `\n\n【用戶當前問題】\n${message}\n\n請回答：`;

    return prompt;
}

// 處理特殊命令（利率模擬、區塊鏈查詢等）
async function processSpecialCommands(message, aiResponse, context, userData) {
    const lowerMessage = message.toLowerCase();

    // 檢測利率相關詢問
    if (lowerMessage.includes('利率') || lowerMessage.includes('優惠') || lowerMessage.includes('減碼')) {
        // 如果有ESG結果，可以模擬利率變化
        if (userData && userData.esgResult) {
            const rating = userData.esgResult.rating;
            const discountInfo = calculateLoanDiscountByRating(rating);
            
            // 在AI回答後添加利率資訊
            return aiResponse + `\n\n---\n\n**您當前的利率優惠資訊：**\n- 評級：${rating}級\n- 利率優惠範圍：${discountInfo.discountRange}\n- 優惠說明：${discountInfo.description}\n- 推薦產品：${discountInfo.products?.join('、') || 'N/A'}`;
        }
    }

    // 檢測區塊鏈查詢
    if (lowerMessage.includes('區塊鏈') || lowerMessage.includes('上鏈') || lowerMessage.includes('鏈上')) {
        // 這裡可以集成真實的區塊鏈查詢API
        // 目前返回模擬數據
        return aiResponse + `\n\n---\n\n**區塊鏈查證資訊：**\n（此功能正在開發中，將提供真實的區塊鏈查證服務）`;
    }

    // 檢測評分預測
    if (lowerMessage.includes('預測') || lowerMessage.includes('可能') || lowerMessage.includes('等級')) {
        if (context.page === 'esg-assessment' && userData && userData.currentFormData) {
            // 嘗試計算當前填寫的評分
            try {
                const score = calculateESGScore(userData.currentFormData);
                const levelInfo = `\n\n---\n\n**根據您目前的填寫情況：**\n- 當前得分：${score.total}分\n- 預期評級：${score.levelName}\n- 利率優惠：${score.rateDiscountRange || 'N/A'}\n- 建議改善項目：${score.improvements?.join('、') || '無'}`;
                return aiResponse + levelInfo;
            } catch (e) {
                // 如果計算失敗，只返回AI回答
            }
        }
    }

    return aiResponse;
}

// 啟動伺服器
app.listen(PORT, () => {
    console.log(`伺服器運行於 http://localhost:${PORT}`);
});

