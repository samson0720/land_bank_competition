const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// 路由：首頁
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// 路由：評分系統
app.get('/assessment', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'assessment.html'));
});

// 路由：輔導平台
app.get('/platform', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'platform.html'));
});

// 路由：GRI 評估系統
app.get('/gri-assessment', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'gri-assessment.html'));
});

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
    
    // 計算 GRI 評分
    const griScore = calculateGRIScore(responses);
    
    console.log('📊 GRI 計算結果：', griScore);
    
    res.json({
        status: 'success',
        message: '感謝您完成 GRI 評估！',
        score: griScore,
        timestamp: timestamp
    });
});

// API：碳盤查計算
app.post('/api/carbon-calculator', (req, res) => {
    const data = req.body;
    const result = calculateCarbonFootprint(data);
    res.json(result);
});

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

    // ===================== E 構面（環境保護與氣候行動）- 30分 =====================
    // E1: 碳管理意識與盤查（12分）
    let e1Score = 0;
    if (data.e1_carbonManagement === 'completed-scope1-2') {
        e1Score = 12; // 完成盤查 + 目標
    } else if (data.e1_carbonManagement === 'platform-tool') {
        e1Score = 6; // 盤查完成但無明確目標
    } else if (data.e1_carbonManagement === 'committed-next-year') {
        e1Score = 2;
    } else {
        e1Score = 0;
    }
    scores.E += e1Score;
    scores.details.e1 = e1Score;
    if (e1Score < 12) scores.improvements.push('E1');

    // E2: 能源效率與節約行動（10分）
    if (data.e2_energyEfficiency === 'updated-equipment-past2y') {
        scores.E += 10;
        scores.details.e2 = 10;
    } else if (data.e2_energyEfficiency === 'led-full-replacement') {
        scores.E += 6;
        scores.details.e2 = 6;
        scores.improvements.push('E2');
    } else if (data.e2_energyEfficiency === 'basic-measures') {
        scores.E += 3;
        scores.details.e2 = 3;
        scores.improvements.push('E2');
    } else {
        scores.details.e2 = 0;
        scores.improvements.push('E2');
    }

    // E3: 廢棄物與水資源管理（8分）- 改為「資源化管理」
    let e3Score = 0;
    if (data.e3_waste === 'yes') e3Score += 4; // 廢棄物減量目標
    if (data.e3_water === 'yes') e3Score += 4; // 資源化管理（不限雨水回收）
    scores.E += e3Score;
    scores.details.e3 = e3Score;
    if (e3Score === 0) scores.improvements.push('E3');

    // ===================== S 構面（社會責任與人力資本）- 30分 =====================
    // S1: 員工培訓與職涯發展（10分）
    if (data.s1_training === 'yes-15hours') {
        scores.S += 10;
        scores.details.s1 = 10;
    } else if (data.s1_training === 'basic-training') {
        scores.S += 5;
        scores.details.s1 = 5;
        scores.improvements.push('S1');
    } else {
        scores.details.s1 = 0;
        scores.improvements.push('S1');
    }

    // S2: 員工福利與友善職場（10分）- 增加量化定義
    if (data.s2_welfare === 'exceeds-law') {
        scores.S += 10;
        scores.details.s2 = 10;
    } else if (data.s2_welfare === 'basic-insurance') {
        scores.S += 5;
        scores.details.s2 = 5;
        scores.improvements.push('S2');
    } else {
        scores.details.s2 = 0;
        scores.improvements.push('S2');
    }

    // S3: 供應鏈管理（初階）（5分）- 增加「主要供應商」定義
    if (data.s3_supplychain === 'yes') {
        scores.S += 5;
        scores.details.s3 = 5;
    } else {
        scores.details.s3 = 0;
        scores.improvements.push('S3');
    }

    // S4: 當地社會參與（5分）
    if (data.s4_community === 'yes') {
        scores.S += 5;
        scores.details.s4 = 5;
    } else {
        scores.details.s4 = 0;
        scores.improvements.push('S4');
    }

    // ===================== G 構面（公司治理與誠信經營）- 25分 =====================
    // G1: 永續專責組織與承諾（10分）
    if (data.g1_sustainability === 'executive-with-team') {
        scores.G += 10;
        scores.details.g1 = 10;
    } else if (data.g1_sustainability === 'dedicated-staff') {
        scores.G += 5;
        scores.details.g1 = 5;
        scores.improvements.push('G1');
    } else {
        scores.details.g1 = 0;
        scores.improvements.push('G1');
    }

    // G2: 法規遵循紀錄（10分）- 強化風險管理：重大違規即為紅線
    if (data.g2_compliance === 'no-major-violations') {
        scores.G += 10;
        scores.details.g2 = 10;
    } else if (data.g2_compliance === 'minor-violations-resolved') {
        scores.G += 5;
        scores.details.g2 = 5;
        scores.improvements.push('G2');
    } else {
        // 重大違規：風險級別限制
        scores.details.g2 = 0;
        scores.improvements.push('G2');
    }

    // G3: 誠信經營與風險管理（5分）
    if (data.g3_integrity === 'yes') {
        scores.G += 5;
        scores.details.g3 = 5;
    } else {
        scores.details.g3 = 0;
        scores.improvements.push('G3');
    }

    // ===================== T 構面（轉型與透明度承諾）- 15分 =====================
    // T1: 平台使用與透明揭露（5分）- 新增「數據使用授權」
    if (data.t1_platform === 'yes-2years') {
        scores.T += 5;
        scores.details.t1 = 5;
    } else {
        scores.details.t1 = 0;
        scores.improvements.push('T1');
    }

    // T2: 永續目標設定（5分）
    if (data.t2_targets === 'yes-quantitative') {
        scores.T += 5;
        scores.details.t2 = 5;
    } else {
        scores.details.t2 = 0;
        scores.improvements.push('T2');
    }

    // T3: 轉型意向與改善承諾（5分）- 新增指標
    if (data.t3_commitment === 'yes') {
        scores.T += 5;
        scores.details.t3 = 5;
    } else {
        scores.details.t3 = 0;
        scores.improvements.push('T3');
    }

    // 計算總分（E30 + S30 + G25 + T15 = 100）
    scores.total = Math.round((scores.E + scores.S + scores.G + scores.T) * 10) / 10;

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

// 啟動伺服器
app.listen(PORT, () => {
    console.log(`伺服器運行於 http://localhost:${PORT}`);
});

