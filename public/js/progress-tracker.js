// ESG Progress Tracker - 儀表板邏輯

// 全局變數
let trackerData = null;
let trendChart = null;
let radarChart = null;
let detailCharts = {};

// 成就定義
const ACHIEVEMENT_DEFINITIONS = {
    carbon_reduction_10: {
        id: 'carbon_reduction_10',
        name: '減碳10%',
        description: '碳排放量較上期減少10%以上',
        icon: '🌱',
        category: 'environment',
        condition: (current, previous) => {
            if (!previous || !current.environmentalData || !previous.environmentalData) return false;
            const prev = previous.environmentalData.scope1Emissions || 0;
            const curr = current.environmentalData.scope1Emissions || 0;
            if (prev === 0) return false;
            const reduction = ((prev - curr) / prev) * 100;
            return reduction >= 10;
        }
    },
    energy_efficiency_5: {
        id: 'energy_efficiency_5',
        name: '能源效率提升',
        description: '能源使用量較上期減少5%以上',
        icon: '⚡',
        category: 'environment',
        condition: (current, previous) => {
            if (!previous || !current.environmentalData || !previous.environmentalData) return false;
            const prev = previous.environmentalData.electricityUsage || 0;
            const curr = current.environmentalData.electricityUsage || 0;
            if (prev === 0) return false;
            const reduction = ((prev - curr) / prev) * 100;
            return reduction >= 5;
        }
    },
    social_responsibility: {
        id: 'social_responsibility',
        name: '社會責任認證',
        description: 'S構面分數達到25分以上',
        icon: '👥',
        category: 'social',
        condition: (current, previous) => current.scores.S >= 25
    },
    governance_excellence: {
        id: 'governance_excellence',
        name: '治理卓越',
        description: 'G構面分數達到18分以上',
        icon: '⚖️',
        category: 'governance',
        condition: (current, previous) => current.scores.G >= 18
    },
    total_score_20: {
        id: 'total_score_20',
        name: '總分提升20分',
        description: 'ESG總分較上期提升20分以上',
        icon: '🌟',
        category: 'comprehensive',
        condition: (current, previous) => {
            if (!previous) return false;
            const currentTotal = current.scores?.total || current.scores?.esg || 0;
            const previousTotal = previous.scores?.total || previous.scores?.esg || 0;
            return (currentTotal - previousTotal) >= 20;
        }
    },
    rating_a: {
        id: 'rating_a',
        name: 'A級評級',
        description: '獲得A級（優秀級）評級',
        icon: '🏆',
        category: 'comprehensive',
        condition: (current, previous) => {
            const rating = current.rating || '';
            return rating === 'A' || rating === 'a';
        }
    },
    continuous_improvement: {
        id: 'continuous_improvement',
        name: '持續改善',
        description: '連續3期評估總分持續提升',
        icon: '📈',
        category: 'comprehensive',
        condition: (assessments) => {
            if (!assessments || assessments.length < 3) return false;
            const last3 = assessments.slice(-3);
            return last3.every((assessment, index) => {
                if (index === 0) return true;
                const currentTotal = assessment.scores?.total || assessment.scores?.esg || 0;
                const prevTotal = last3[index - 1].scores?.total || last3[index - 1].scores?.esg || 0;
                return currentTotal > prevTotal;
            });
        }
    },
    e_score_25: {
        id: 'e_score_25',
        name: '環境優秀',
        description: 'E構面分數達到25分以上',
        icon: '🌍',
        category: 'environment',
        condition: (current, previous) => {
            const eScore = current.scores?.E || current.scores?.eScore || 0;
            return eScore >= 25;
        }
    },
    s_score_25: {
        id: 's_score_25',
        name: '社會優秀',
        description: 'S構面分數達到25分以上',
        icon: '👥',
        category: 'social',
        condition: (current, previous) => {
            const sScore = current.scores?.S || current.scores?.sScore || 0;
            return sScore >= 25;
        }
    },
    total_score_60: {
        id: 'total_score_60',
        name: '總分達標',
        description: 'ESG總分達到60分以上',
        icon: '⭐',
        category: 'comprehensive',
        condition: (current, previous) => {
            const total = current.scores?.total || current.scores?.esg || 0;
            return total >= 60;
        }
    },
    total_score_70: {
        id: 'total_score_70',
        name: '總分良好',
        description: 'ESG總分達到70分以上',
        icon: '⭐⭐',
        category: 'comprehensive',
        condition: (current, previous) => {
            const total = current.scores?.total || current.scores?.esg || 0;
            return total >= 70;
        }
    },
    total_score_80: {
        id: 'total_score_80',
        name: '總分優秀',
        description: 'ESG總分達到80分以上',
        icon: '⭐⭐⭐',
        category: 'comprehensive',
        condition: (current, previous) => {
            const total = current.scores?.total || current.scores?.esg || 0;
            return total >= 80;
        }
    }
};

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('ESG Progress Tracker 初始化...');
    loadTrackerData();
});

// 載入追蹤數據
function loadTrackerData() {
    showLoading();
    
    try {
        // 從 localStorage 獲取當前評估結果
        const currentResult = localStorage.getItem('esgResult');
        const fullData = localStorage.getItem('esgFullData');
        
        // 從 localStorage 獲取歷史數據
        const historyData = localStorage.getItem('esgHistory');
        
        console.log('📦 載入數據：', {
            hasCurrentResult: !!currentResult,
            hasFullData: !!fullData,
            hasHistoryData: !!historyData
        });
        
        if (!currentResult && !historyData) {
            console.log('⚠️ 沒有找到任何數據');
            hideLoading();
            showNoDataMessage();
            return;
        }
        
        // 構建追蹤數據結構
        trackerData = {
            companyId: getCompanyId(),
            companyName: getCompanyName(),
            currentAssessment: currentResult ? JSON.parse(currentResult) : null,
            fullData: fullData ? JSON.parse(fullData) : null,
            assessments: historyData ? JSON.parse(historyData).assessments || [] : [],
            achievements: historyData ? JSON.parse(historyData).achievements || [] : []
        };
        
        console.log('📊 構建的追蹤數據：', {
            companyName: trackerData.companyName,
            assessmentsCount: trackerData.assessments.length,
            hasCurrentAssessment: !!trackerData.currentAssessment,
            hasFullData: !!trackerData.fullData
        });
        
        // 自動修復歷史記錄中的0分數據
        fixHistoricalZeroScores();
        
        // 修復後重新讀取歷史數據（確保使用最新的修復結果）
        if (historyData) {
            const updatedHistoryData = localStorage.getItem('esgHistory');
            if (updatedHistoryData) {
                try {
                    const parsed = JSON.parse(updatedHistoryData);
                    trackerData.assessments = parsed.assessments || trackerData.assessments;
                    trackerData.achievements = parsed.achievements || trackerData.achievements;
                    console.log('✅ 已重新載入修復後的歷史數據');
                } catch (e) {
                    console.warn('⚠️ 重新載入歷史數據失敗:', e);
                }
            }
        }
        
        // 不再自動添加評估到歷史記錄
        // 改為手動導入（用戶在結果頁面點擊「導入到改善追蹤」按鈕）
        console.log('ℹ️ 使用手動導入模式，數據不會自動添加到歷史記錄');
        
        // 檢查成就
        checkAndUpdateAchievements();
        
        // 渲染儀表板
        renderDashboard();
        
        hideLoading();
    } catch (error) {
        console.error('載入數據錯誤：', error);
        hideLoading();
        showErrorMessage('載入數據失敗，請重新評估');
    }
}

// 獲取企業ID
function getCompanyId() {
    const fullData = localStorage.getItem('esgFullData');
    if (fullData) {
        const data = JSON.parse(fullData);
        return data.companyTaxId || 'default';
    }
    return 'default';
}

// 獲取企業名稱
function getCompanyName() {
    const fullData = localStorage.getItem('esgFullData');
    if (fullData) {
        const data = JSON.parse(fullData);
        return data.companyName || '企業';
    }
    return '企業';
}

// 修復歷史記錄中分數為0的評估
function fixHistoricalZeroScores() {
    if (!trackerData || !trackerData.assessments || trackerData.assessments.length === 0) {
        return;
    }
    
    console.log('🔧 開始檢查並修復歷史記錄中的0分數據...');
    let fixedCount = 0;
    
    trackerData.assessments.forEach((assessment, index) => {
        // 檢查是否需要修復：分數為0但details中有數據
        const totalScore = assessment.scores?.total || assessment.scores?.esg || 0;
        const hasDetails = assessment.details && Object.keys(assessment.details).length > 0;
        
        if (totalScore === 0 && hasDetails) {
            console.log(`🔧 發現需要修復的評估 #${index + 1}:`, {
                id: assessment.id,
                date: assessment.date,
                detailsKeys: Object.keys(assessment.details)
            });
            
            // 使用與 addCurrentAssessmentToHistory 相同的計算邏輯
            const esgAssessment = assessment.details || {};
            const normalizedEsgAssessment = normalizeEsgAssessment(esgAssessment);
            
            // 重新計算分數
            const scores = calculateESGScoresFromNormalized(normalizedEsgAssessment);
            
            // 更新評估記錄的分數
            assessment.scores = {
                total: scores.total,
                E: scores.eScore,
                S: scores.sScore,
                G: scores.gScore,
                T: scores.tScore,
                compliant: assessment.scores?.compliant || 0,
                esg: assessment.scores?.esg || scores.total
            };
            
            fixedCount++;
            console.log(`✅ 已修復評估 #${index + 1}:`, {
                id: assessment.id,
                date: assessment.date,
                oldScore: 0,
                newScore: scores.total,
                E: scores.eScore,
                S: scores.sScore,
                G: scores.gScore
            });
        }
    });
    
    if (fixedCount > 0) {
        console.log(`✅ 共修復 ${fixedCount} 個評估記錄`);
        // 保存修復後的數據
        saveHistoryData();
    } else {
        console.log('ℹ️ 沒有需要修復的評估記錄');
    }
}

// 標準化 esgAssessment 字段名（提取為獨立函數以便重用）
function normalizeEsgAssessment(rawEsgAssessment) {
    const normalized = {};
    
    // E構面映射
    if (rawEsgAssessment.e1_carbonManagement) {
        normalized.e1_carbonManagement = rawEsgAssessment.e1_carbonManagement;
    } else if (rawEsgAssessment.e1) {
        normalized.e1_carbonManagement = rawEsgAssessment.e1 === 'yes' ? 'completed-scope1-2' : 
                                         rawEsgAssessment.e1 === 'platform-tool' ? 'platform-tool' :
                                         rawEsgAssessment.e1 === 'committed-next-year' ? 'committed-next-year' : rawEsgAssessment.e1;
    }
    
    if (rawEsgAssessment.e2_energyEfficiency) {
        normalized.e2_energyEfficiency = rawEsgAssessment.e2_energyEfficiency;
    } else if (rawEsgAssessment.e2) {
        normalized.e2_energyEfficiency = rawEsgAssessment.e2 === 'yes' ? 'updated-equipment-past2y' :
                                          rawEsgAssessment.e2 === 'led-full-replacement' ? 'led-full-replacement' :
                                          rawEsgAssessment.e2 === 'basic-measures' ? 'basic-measures' : rawEsgAssessment.e2;
    }
    
    if (rawEsgAssessment.e3_waste !== undefined) {
        normalized.e3_waste = rawEsgAssessment.e3_waste;
    } else if (rawEsgAssessment.e3) {
        normalized.e3_waste = rawEsgAssessment.e3 === 'yes' ? 'yes' : 'no';
    }
    
    if (rawEsgAssessment.e3_water !== undefined) {
        normalized.e3_water = rawEsgAssessment.e3_water;
    } else if (rawEsgAssessment.e4) {
        normalized.e3_water = rawEsgAssessment.e4 === 'yes' ? 'yes' : 'no';
    }
    
    // S構面映射
    if (rawEsgAssessment.s1_training) {
        normalized.s1_training = rawEsgAssessment.s1_training;
    } else if (rawEsgAssessment.s1) {
        normalized.s1_training = rawEsgAssessment.s1 === 'yes' ? 'yes-15hours' :
                                rawEsgAssessment.s1 === 'basic-training' ? 'basic-training' :
                                rawEsgAssessment.s1 === 'yes-15hours' ? 'yes-15hours' : rawEsgAssessment.s1;
    }
    
    if (rawEsgAssessment.s2_welfare) {
        normalized.s2_welfare = rawEsgAssessment.s2_welfare;
    } else if (rawEsgAssessment.s2) {
        normalized.s2_welfare = rawEsgAssessment.s2 === 'yes' ? 'exceeds-law' :
                               rawEsgAssessment.s2 === 'basic-insurance' ? 'basic-insurance' :
                               rawEsgAssessment.s2 === 'exceeds-law' ? 'exceeds-law' : rawEsgAssessment.s2;
    }
    
    if (rawEsgAssessment.s3_supplychain) {
        normalized.s3_supplychain = rawEsgAssessment.s3_supplychain;
    } else if (rawEsgAssessment.s3) {
        normalized.s3_supplychain = rawEsgAssessment.s3 === 'yes' ? 'yes' : 'no';
    }
    
    if (rawEsgAssessment.s4_community) {
        normalized.s4_community = rawEsgAssessment.s4_community;
    } else if (rawEsgAssessment.s4) {
        normalized.s4_community = rawEsgAssessment.s4 === 'yes' ? 'yes' : 'no';
    }
    
    // G構面映射
    if (rawEsgAssessment.g1_sustainability) {
        normalized.g1_sustainability = rawEsgAssessment.g1_sustainability;
    } else if (rawEsgAssessment.g1) {
        normalized.g1_sustainability = rawEsgAssessment.g1 === 'yes' ? 'executive-with-team' :
                                      rawEsgAssessment.g1 === 'dedicated-staff' ? 'dedicated-staff' :
                                      rawEsgAssessment.g1 === 'executive-with-team' ? 'executive-with-team' : rawEsgAssessment.g1;
    }
    
    if (rawEsgAssessment.g2_compliance) {
        normalized.g2_compliance = rawEsgAssessment.g2_compliance;
    } else if (rawEsgAssessment.g2) {
        normalized.g2_compliance = rawEsgAssessment.g2 === 'yes' ? 'no-major-violations' :
                                   rawEsgAssessment.g2 === 'minor-violations-resolved' ? 'minor-violations-resolved' :
                                   rawEsgAssessment.g2 === 'no-major-violations' ? 'no-major-violations' : rawEsgAssessment.g2;
    }
    
    if (rawEsgAssessment.g3_integrity) {
        normalized.g3_integrity = rawEsgAssessment.g3_integrity;
    } else if (rawEsgAssessment.g3) {
        normalized.g3_integrity = rawEsgAssessment.g3 === 'yes' ? 'yes' : 'no';
    }
    
    // T構面
    if (rawEsgAssessment.t1_platform) normalized.t1_platform = rawEsgAssessment.t1_platform;
    if (rawEsgAssessment.t2_targets) normalized.t2_targets = rawEsgAssessment.t2_targets;
    if (rawEsgAssessment.t3_commitment) normalized.t3_commitment = rawEsgAssessment.t3_commitment;
    
    // 兼容舊字段名
    if (rawEsgAssessment.s1_employeeSatisfaction) normalized.s1_employeeSatisfaction = rawEsgAssessment.s1_employeeSatisfaction;
    if (rawEsgAssessment.s2_community) normalized.s2_community = rawEsgAssessment.s2_community;
    if (rawEsgAssessment.s3_social) normalized.s3_social = rawEsgAssessment.s3_social;
    if (rawEsgAssessment.g1_governanceStructure) normalized.g1_governanceStructure = rawEsgAssessment.g1_governanceStructure;
    if (rawEsgAssessment.g2_riskManagement) normalized.g2_riskManagement = rawEsgAssessment.g2_riskManagement;
    if (rawEsgAssessment.g3_audit) normalized.g3_audit = rawEsgAssessment.g3_audit;
    if (rawEsgAssessment.g4_transparency) normalized.g4_transparency = rawEsgAssessment.g4_transparency;
    if (rawEsgAssessment.g5_ethics) normalized.g5_ethics = rawEsgAssessment.g5_ethics;
    if (rawEsgAssessment.g6_compliance) normalized.g6_compliance = rawEsgAssessment.g6_compliance;
    if (rawEsgAssessment.g7_supplyChain) normalized.g7_supplyChain = rawEsgAssessment.g7_supplyChain;
    
    return normalized;
}

// 從標準化的 esgAssessment 計算分數（提取為獨立函數以便重用）
function calculateESGScoresFromNormalized(esg) {
    let eScore = 0, sScore = 0, gScore = 0, tScore = 0;
    
    // E構面（支持新舊兩種格式，滿分35分）
    // E1: 節能採購（6分）
    if (esg.e1_carbonManagement === 'completed-scope1-2') eScore += 12;
    else if (esg.e1_carbonManagement === 'platform-tool') eScore += 6;
    else if (esg.e1_carbonManagement === 'committed-next-year') eScore += 3;
    else if (esg.e1 === 'yes') eScore += 6;
    
    // E2: 節能控管與量化指標（7分）
    if (esg.e2_energyEfficiency === 'updated-equipment-past2y') eScore += 10;
    else if (esg.e2_energyEfficiency === 'led-full-replacement') eScore += 7;
    else if (esg.e2_energyEfficiency === 'basic-measures') eScore += 4;
    else if (esg.e2 === 'yes') eScore += 7;
    
    // E3: 碳排減量計畫（7分）
    if (esg.e3 === 'yes') eScore += 7;
    else {
        if (esg.e3_waste === 'yes') eScore += 3;
        if (esg.e3_water === 'yes') eScore += 3;
    }
    
    // E4: 無環境污染裁罰（6分）
    if (esg.e4 === 'yes') eScore += 6;
    
    // E5: 綠能建置投資（5分）
    if (esg.e5 === 'yes') eScore += 5;
    
    // E6: 廢棄物資源循環利用（4分）
    if (esg.e6 === 'yes') eScore += 4;
    
    // S構面（支持新舊兩種格式，滿分35分）
    // S1: 無鄰居檢舉事件（7分）
    if (esg.s1_training === 'yes-15hours') sScore += 10;
    else if (esg.s1_training === 'basic-training') sScore += 4;
    else if (esg.s1_employeeSatisfaction === 'yes') sScore += 10;
    else if (esg.s1 === 'yes') sScore += 7;
    
    // S2: 無勞工裁罰事項（8分）
    if (esg.s2_welfare === 'exceeds-law') sScore += 10;
    else if (esg.s2_welfare === 'basic-insurance') sScore += 5;
    else if (esg.s2_community === 'yes') sScore += 10;
    else if (esg.s2 === 'yes') sScore += 8;
    
    // S3: 公益或相關採購（7分）
    if (esg.s3_supplychain === 'yes') sScore += 5;
    else if (esg.s3_social === 'yes') sScore += 10;
    else if (esg.s3 === 'yes') sScore += 7;
    
    // S4: 聘用弱勢族群或實習計畫（8分）
    if (esg.s4_community === 'yes') sScore += 5;
    else if (esg.s4 === 'yes') sScore += 8;
    
    // S5: 投資ESG綠色金融商品（5分）
    if (esg.s5 === 'yes') sScore += 5;
    
    // G構面（支持新舊兩種格式，滿分30分）
    // G1: 依照規定繳稅（5分）
    if (esg.g1_sustainability === 'executive-with-team') gScore += 10;
    else if (esg.g1_sustainability === 'dedicated-staff') gScore += 5;
    else if (esg.g1_governanceStructure === 'yes') gScore += 5;
    else if (esg.g1 === 'yes') gScore += 5;
    
    // G2: 無漏開發票等故意事項（5分）
    if (esg.g2_compliance === 'no-major-violations') gScore += 10;
    else if (esg.g2_compliance === 'minor-violations-resolved') gScore += 5;
    else if (esg.g2_riskManagement === 'yes') gScore += 3;
    else if (esg.g2 === 'yes') gScore += 5;
    
    // G3: 無逃漏裁罰事項（4分）
    if (esg.g3_integrity === 'yes') gScore += 5;
    else if (esg.g3_audit === 'yes') gScore += 3;
    else if (esg.g3 === 'yes') gScore += 4;
    
    // G4: 近三年皆有盈餘（4分）
    if (esg.g4 === 'yes') gScore += 4;
    
    // G5: 定期召開董事會說明財務（4分）
    if (esg.g5 === 'yes') gScore += 4;
    
    // G6: 定期與股東說明營運狀況（4分）
    if (esg.g6 === 'yes') gScore += 4;
    
    // G7: 編製永續報告書（4分）
    if (esg.g7 === 'yes') gScore += 4;
    
    // 限制G分數不超過30分（滿分）
    gScore = Math.min(gScore, 30);
    
    const total = eScore + sScore + gScore; // 不再包含T构面
    
    return { eScore, sScore, gScore, total };
}

// 將當前評估添加到歷史記錄
function addCurrentAssessmentToHistory() {
    if (!trackerData.fullData || !trackerData.currentAssessment) {
        console.log('⚠️ 無法添加評估：缺少必要數據', {
            hasFullData: !!trackerData.fullData,
            hasCurrentAssessment: !!trackerData.currentAssessment
        });
        return;
    }
    
    console.log('📝 開始添加評估到歷史記錄...');
    console.log('📊 currentAssessment:', trackerData.currentAssessment);
    console.log('📊 fullData:', trackerData.fullData);
    
    // 轉換scores格式：從後端格式轉換為儀表板格式
    const backendScores = trackerData.currentAssessment.scores || {};
    const esgFullDataScores = trackerData.fullData.scores || {};
    
    console.log('📊 backendScores:', backendScores);
    console.log('📊 esgFullDataScores:', esgFullDataScores);
    
    // 優先使用後端返回的E/S/G分數（如果存在）
    let eScore = backendScores.E || esgFullDataScores.E || 0;
    let sScore = backendScores.S || esgFullDataScores.S || 0;
    let gScore = backendScores.G || esgFullDataScores.G || 0;
    
    // 如果後端沒有返回E/S/G，則從ESG評估答案計算
    // 注意：即使後端有E/S/G，也應該重新計算以確保準確性（因為後端可能使用不同的計算方式）
    const esgAssessment = trackerData.fullData.esgAssessment || {};
    console.log('📊 esgAssessment 原始數據:', esgAssessment);
    
    // 使用標準化函數
    const normalizedEsgAssessment = normalizeEsgAssessment(esgAssessment);
    console.log('📊 標準化後的 esgAssessment:', normalizedEsgAssessment);
    
    // 使用標準化後的數據進行計算
    const esg = normalizedEsgAssessment;
    
    // 使用計算函數重新計算分數（覆蓋之前的初始值）
    const calculatedScores = calculateESGScoresFromNormalized(esg);
    eScore = calculatedScores.eScore;
    sScore = calculatedScores.sScore;
    gScore = calculatedScores.gScore;
    const tScore = calculatedScores.tScore;
    
    // 計算總分（E30 + S30 + G25 + T15 = 100）
    const calculatedTotal = calculatedScores.total;
    
    // 優先使用計算的總分，如果後端有百分比，可以用於顯示但不影響存儲
    let totalScore = calculatedTotal;
    
    // 如果計算的總分為0，可能是數據問題，嘗試使用後端的百分比
    if (totalScore === 0) {
        const backendEsgPercent = backendScores.esg || esgFullDataScores.esg || 0;
        if (backendEsgPercent > 0 && backendEsgPercent <= 100) {
            // 如果後端返回的是百分比，轉換為分數（假設滿分100）
            totalScore = Math.round(backendEsgPercent);
        }
    }
    
    console.log('📊 計算的分數：', {
        eScore: eScore,
        sScore: sScore,
        gScore: gScore,
        tScore: tScore,
        calculatedTotal: calculatedTotal,
        totalScore: totalScore,
        backendEsg: backendScores.esg,
        originalKeys: Object.keys(esgAssessment),
        normalizedKeys: Object.keys(normalizedEsgAssessment)
    });
    
    const now = Date.now();
    const assessmentDate = trackerData.fullData.date || new Date().toISOString().split('T')[0];
    
    const assessment = {
        id: `assessment_${now}`,
        date: assessmentDate,
        timestamp: now,
        scores: {
            total: totalScore,
            E: eScore,
            S: sScore,
            G: gScore,
            compliant: backendScores.compliant || 0,
            esg: backendScores.esg || totalScore
        },
        rating: trackerData.currentAssessment.rating || 'D',
        ratingDescription: trackerData.currentAssessment.ratingDescription || '',
        environmentalData: {
            scope1Emissions: trackerData.fullData.scope1Emissions || 0,
            scope2Emissions: trackerData.fullData.scope2Emissions || 0,
            electricityUsage: trackerData.fullData.electricityUsage || 0,
            waterUsage: trackerData.fullData.waterUsage || 0
        },
        details: esgAssessment
    };
    
    // 檢查是否已存在（避免重複添加）- 使用時間戳判斷
    // 允許同一天多次評估，但避免完全相同時間戳的評估
    // 注意：now變數已在上面定義，這裡直接使用
    
    const exists = trackerData.assessments.some(a => {
        // 如果ID相同，則是重複
        if (a.id === assessment.id) return true;
        // 如果時間戳非常接近（10秒內），可能是重複提交
        return Math.abs(a.timestamp - assessment.timestamp) < 10000;
    });
    
    if (!exists) {
        trackerData.assessments.push(assessment);
        trackerData.assessments.sort((a, b) => a.timestamp - b.timestamp);
        saveHistoryData();
        console.log('✅ 已添加評估到歷史記錄:', {
            id: assessment.id,
            date: assessment.date,
            totalScore: assessment.scores.total,
            rating: assessment.rating
        });
    } else {
        console.log('ℹ️ 評估已存在，跳過添加。現有評估數量:', trackerData.assessments.length);
    }
}

// 手動重新檢查成就（用戶點擊按鈕時觸發）
function recheckAchievements() {
    if (!trackerData || trackerData.assessments.length < 1) {
        alert('沒有評估數據可以檢查成就');
        return;
    }
    
    if (!confirm('確定要重新檢查所有成就嗎？這將掃描所有歷史評估記錄。')) {
        return;
    }
    
    console.log('🔄 手動觸發成就重新檢查...');
    
    // 清空現有成就（可選，如果不想重複解鎖可以保留）
    // trackerData.achievements = [];
    
    // 重新檢查成就
    checkAndUpdateAchievements();
    
    // 重新渲染成就頁面
    renderAchievementsPage();
    renderAchievementsSummary();
    
    alert('✅ 成就檢查完成！請查看成就頁面。');
}

// 手動修復所有分數（用戶點擊修復按鈕時觸發）
function fixAllScores() {
    if (!trackerData || !trackerData.assessments || trackerData.assessments.length === 0) {
        alert('沒有需要修復的數據');
        return;
    }
    
    if (!confirm('確定要修復所有歷史記錄中的分數嗎？這將重新計算所有評估的分數。')) {
        return;
    }
    
    console.log('🔧 手動修復所有評估分數...');
    let fixedCount = 0;
    
    trackerData.assessments.forEach((assessment, index) => {
        const esgAssessment = assessment.details || {};
        
        // 如果有details數據，重新計算分數
        if (Object.keys(esgAssessment).length > 0) {
            const normalizedEsgAssessment = normalizeEsgAssessment(esgAssessment);
            const scores = calculateESGScoresFromNormalized(normalizedEsgAssessment);
            
            // 更新分數
            const oldScore = assessment.scores?.total || assessment.scores?.esg || 0;
            assessment.scores = {
                total: scores.total,
                E: scores.eScore,
                S: scores.sScore,
                G: scores.gScore,
                T: scores.tScore,
                compliant: assessment.scores?.compliant || 0,
                esg: assessment.scores?.esg || scores.total
            };
            
            if (oldScore !== scores.total) {
                fixedCount++;
                console.log(`✅ 修復評估 #${index + 1}: ${oldScore} → ${scores.total}`);
            }
        }
    });
    
    if (fixedCount > 0) {
        saveHistoryData();
        alert(`✅ 已修復 ${fixedCount} 個評估記錄！頁面將自動刷新。`);
        // 重新載入頁面
        window.location.reload();
    } else {
        alert('沒有需要修復的評估記錄');
    }
}

// 保存歷史數據
function saveHistoryData() {
    const historyData = {
        companyId: trackerData.companyId,
        companyName: trackerData.companyName,
        assessments: trackerData.assessments,
        achievements: trackerData.achievements,
        metadata: {
            lastUpdated: new Date().toISOString(),
            totalAssessments: trackerData.assessments.length
        }
    };
    
    localStorage.setItem('esgHistory', JSON.stringify(historyData));
}

// 檢查並更新成就（檢查所有歷史評估）
function checkAndUpdateAchievements() {
    if (!trackerData || trackerData.assessments.length < 1) {
        console.log('⚠️ 無法檢查成就：沒有評估數據');
        return;
    }
    
    console.log(`🏆 開始檢查成就，共有 ${trackerData.assessments.length} 個評估記錄`);
    
    const newAchievements = [];
    
    // 檢查所有評估記錄，尋找符合條件的成就
    trackerData.assessments.forEach((assessment, index) => {
        const previous = index > 0 ? trackerData.assessments[index - 1] : null;
        
        // 檢查單項成就
        Object.keys(ACHIEVEMENT_DEFINITIONS).forEach(key => {
            const definition = ACHIEVEMENT_DEFINITIONS[key];
            
            // 檢查是否已解鎖
            const alreadyUnlocked = trackerData.achievements.some(a => a.id === definition.id);
            if (alreadyUnlocked) {
                return;
            }
            
            // 檢查條件
            let conditionMet = false;
            
            try {
                if (definition.id === 'continuous_improvement') {
                    // 持續改善需要檢查所有評估
                    conditionMet = definition.condition(trackerData.assessments);
                } else {
                    // 其他成就檢查當前評估
                    conditionMet = definition.condition(assessment, previous);
                }
            } catch (error) {
                console.error(`❌ 檢查成就 "${definition.name}" 時出錯：`, error);
                conditionMet = false;
            }
            
            if (conditionMet) {
                const achievement = {
                    id: definition.id,
                    name: definition.name,
                    description: definition.description,
                    icon: definition.icon,
                    category: definition.category,
                    unlockedDate: assessment.date || new Date().toISOString().split('T')[0],
                    unlockedByAssessment: assessment.id || `assessment_${index}`,
                    condition: definition.condition.toString()
                };
                
                trackerData.achievements.push(achievement);
                newAchievements.push(achievement);
                console.log(`🎉 解鎖新成就: "${achievement.name}" (評估 #${index + 1})`, {
                    assessmentId: assessment.id,
                    total: assessment.scores?.total || assessment.scores?.esg || 0,
                    E: assessment.scores?.E || 0,
                    S: assessment.scores?.S || 0,
                    G: assessment.scores?.G || 0,
                    rating: assessment.rating || 'N/A'
                });
            }
        });
    });
    
    console.log(`📊 成就檢查完成，共發現 ${newAchievements.length} 個新成就`);
    console.log(`📊 總成就數: ${trackerData.achievements.length}`);
    
    if (newAchievements.length > 0) {
        saveHistoryData();
        showAchievementNotification(newAchievements);
    }
}

// 顯示成就通知
function showAchievementNotification(achievements) {
    const modal = document.getElementById('achievement-modal');
    const modalBody = document.getElementById('achievement-modal-body');
    
    modalBody.innerHTML = `
        <p>您已解鎖新成就：</p>
        ${achievements.map(achievement => `
            <div class="achievement-item unlocked" style="margin: 1rem 0;">
                <div class="icon" style="font-size: 3rem;">${achievement.icon}</div>
                <div class="name">${achievement.name}</div>
                <div class="description">${achievement.description}</div>
                <div class="date">解鎖日期：${achievement.unlockedDate}</div>
            </div>
        `).join('')}
    `;
    
    modal.style.display = 'flex';
}

// 關閉成就通知
function closeAchievementModal() {
    document.getElementById('achievement-modal').style.display = 'none';
}

// 渲染儀表板
function renderDashboard() {
    console.log('📊 渲染儀表板，數據：', trackerData);
    
    if (!trackerData || !trackerData.assessments || trackerData.assessments.length === 0) {
        console.log('⚠️ 沒有評估數據');
        showNoDataMessage();
        return;
    }
    
    console.log(`✅ 找到 ${trackerData.assessments.length} 個評估記錄`);
    
    let current = trackerData.assessments[trackerData.assessments.length - 1];
    let previous = trackerData.assessments.length > 1 ? 
        trackerData.assessments[trackerData.assessments.length - 2] : null;
    
    // 如果當前評估分數為0，但有歷史數據，顯示上一個評估
    const currentScore = current.scores?.total || current.scores?.esg || 0;
    if (currentScore === 0 && previous) {
        console.log('⚠️ 當前評估分數為0，使用上一個評估數據顯示');
        // 交換：將上一個評估作為當前顯示，當前作為上上一個
        const temp = current;
        current = previous;
        previous = trackerData.assessments.length > 2 ? 
            trackerData.assessments[trackerData.assessments.length - 3] : null;
        
        // 在控制台提示用戶
        console.warn('⚠️ 注意：最新評估分數計算錯誤（0分），已顯示上一個評估的數據');
    }
    
    // 更新企業名稱
    document.getElementById('company-name').textContent = 
        `${trackerData.companyName} - ESG 改善追蹤儀表板`;
    
    // 更新最後更新時間
    const lastDate = current.date || new Date().toISOString().split('T')[0];
    document.getElementById('last-updated').textContent = `最後更新：${lastDate}`;
    
    // 渲染總分卡片
    renderTotalScoreCard(current, previous);
    
    // 渲染改善率卡片
    renderImprovementCard(current, previous);
    
    // 渲染成就卡片
    renderAchievementsSummary();
    
    // 渲染 E/S/G 卡片
    renderESGCards(current, previous);
    
    // 渲染圖表
    renderTrendChart();
    renderRadarChart(current, previous);
    
    // 渲染詳細頁面
    renderDetailPages(current, previous);
    
    // 渲染成就頁面
    renderAchievementsPage();
}

// 渲染總分卡片
function renderTotalScoreCard(current, previous) {
    console.log('🎨 渲染總分卡片，當前數據：', current);
    
    // 支持多種scores格式
    const totalScore = current.scores?.total || current.scores?.esg || 0;
    const percentage = totalScore;
    
    console.log('📊 總分計算：', {
        'current.scores': current.scores,
        'totalScore': totalScore,
        'percentage': percentage
    });
    
    const MAX_SCORE = 100; // ESG滿分為100分（E35 + S35 + G30）
    
    document.getElementById('total-score').textContent = `${totalScore || 0} / ${MAX_SCORE}`;
    document.getElementById('total-percentage').textContent = `${percentage}%`;
    
    // 動畫進度條（基於100分計算百分比）
    const percentageForProgress = totalScore > 0 ? (totalScore / MAX_SCORE * 100) : 0;
    setTimeout(() => {
        document.getElementById('total-progress').style.width = `${percentageForProgress}%`;
    }, 100);
    
    // 比較
    const comparisonEl = document.getElementById('total-comparison');
    if (previous) {
        const prevTotal = previous.scores?.total || previous.scores?.esg || 0;
        const diff = totalScore - prevTotal;
        const diffPercent = prevTotal > 0 ? 
            ((diff / prevTotal) * 100).toFixed(1) : 0;
        
        comparisonEl.innerHTML = `
            <span class="comparison-label">與上期比較：</span>
            <span class="comparison-value ${diff > 0 ? 'positive' : diff < 0 ? 'negative' : 'neutral'}">
                ${diff > 0 ? '+' : ''}${diff} 分 (${diff > 0 ? '+' : ''}${diffPercent}%)
                ${diff > 0 ? '⬆' : diff < 0 ? '⬇' : '➡'}
            </span>
        `;
    } else {
        // 首次評估，顯示提示
        comparisonEl.innerHTML = `
            <span class="comparison-label">首次評估</span>
            <span class="comparison-value neutral">暫無比較數據</span>
        `;
    }
    
    // 評級
    const rating = current.rating || 'D';
    const ratingNames = {
        'A': '優秀',
        'B': '良好',
        'C': '普通',
        'D': '待改善'
    };
    document.getElementById('rating-value').textContent = `${rating} 級 - ${ratingNames[rating]}`;
}

// 渲染改善率卡片
function renderImprovementCard(current, previous) {
    if (!previous) {
        // 首次評估，顯示當前分數
        const currTotal = current.scores?.total || current.scores?.esg || 0;
        document.getElementById('improvement-icon').textContent = '📊';
        document.getElementById('improvement-value').textContent = `${currTotal}%`;
        document.getElementById('improvement-value').style.color = '#006633';
        document.getElementById('improvement-details').innerHTML = `<p>當前ESG總分：${currTotal}分</p>`;
        return;
    }
    
    const currTotal = current.scores?.total || current.scores?.esg || 0;
    const prevTotal = previous.scores?.total || previous.scores?.esg || 0;
    const diff = currTotal - prevTotal;
    const diffPercent = prevTotal > 0 ? 
        ((diff / prevTotal) * 100).toFixed(1) : 0;
    
    document.getElementById('improvement-icon').textContent = diff > 0 ? '📈' : diff < 0 ? '📉' : '➡';
    document.getElementById('improvement-value').textContent = `${diff > 0 ? '+' : ''}${diffPercent}%`;
    document.getElementById('improvement-value').style.color = diff > 0 ? '#28a745' : diff < 0 ? '#dc3545' : '#666';
    document.getElementById('improvement-points').textContent = `${diff > 0 ? '+' : ''}${diff}分`;
}

// 渲染成就摘要
function renderAchievementsSummary() {
    const count = trackerData.achievements.length;
    document.getElementById('achievements-count').textContent = count;
    
    const preview = document.getElementById('achievements-preview');
    if (count === 0) {
        preview.innerHTML = '<p class="no-achievements">尚無成就</p>';
    } else {
        const recent = trackerData.achievements.slice(-3).reverse();
        preview.innerHTML = recent.map(achievement => `
            <div class="achievement-badge">
                <span class="icon">${achievement.icon}</span>
                <span>${achievement.name}</span>
            </div>
        `).join('');
    }
    
    // 最近成就區域
    const recentAchievements = document.getElementById('recent-achievements');
    if (count === 0) {
        recentAchievements.innerHTML = '<p class="no-achievements">尚無成就</p>';
    } else {
        const recent = trackerData.achievements.slice(-5).reverse();
        recentAchievements.innerHTML = recent.map(achievement => `
            <div class="achievement-item unlocked">
                <div class="icon">${achievement.icon}</div>
                <div class="name">${achievement.name}</div>
                <div class="description">${achievement.description}</div>
                <div class="date">${achievement.unlockedDate}</div>
            </div>
        `).join('');
    }
}

// 渲染 E/S/G 卡片
function renderESGCards(current, previous) {
    console.log('🎨 渲染E/S/G卡片，當前數據：', current.scores);
    
    // E 環境
    const eScore = current.scores?.E || 0;
    const ePercentage = (eScore / 35 * 100).toFixed(1);
    document.getElementById('e-score').textContent = eScore;
    document.getElementById('e-percentage').textContent = `${ePercentage}%`;
    setTimeout(() => {
        document.getElementById('e-progress').style.width = `${ePercentage}%`;
    }, 200);
    
    const eComparisonEl = document.getElementById('e-comparison');
    if (previous) {
        const prevE = previous.scores?.E || 0;
        const eDiff = eScore - prevE;
        const eDiffPercent = prevE > 0 ? ((eDiff / prevE) * 100).toFixed(1) : 0;
        eComparisonEl.innerHTML = `
            <span class="comparison-label">改善率：</span>
            <span class="comparison-value ${eDiff > 0 ? 'positive' : eDiff < 0 ? 'negative' : 'neutral'}">
                ${eDiff > 0 ? '+' : ''}${eDiffPercent}% ${eDiff > 0 ? '⬆' : eDiff < 0 ? '⬇' : '➡'}
            </span>
        `;
    } else {
        eComparisonEl.innerHTML = `
            <span class="comparison-label">首次評估</span>
            <span class="comparison-value neutral">暫無比較數據</span>
        `;
    }
    
    // S 社會
    const sScore = current.scores?.S || 0;
    const sPercentage = (sScore / 35 * 100).toFixed(1);
    document.getElementById('s-score').textContent = sScore;
    document.getElementById('s-percentage').textContent = `${sPercentage}%`;
    setTimeout(() => {
        document.getElementById('s-progress').style.width = `${sPercentage}%`;
    }, 300);
    
    const sComparisonEl = document.getElementById('s-comparison');
    if (previous) {
        const prevS = previous.scores?.S || 0;
        const sDiff = sScore - prevS;
        const sDiffPercent = prevS > 0 ? ((sDiff / prevS) * 100).toFixed(1) : 0;
        sComparisonEl.innerHTML = `
            <span class="comparison-label">改善率：</span>
            <span class="comparison-value ${sDiff > 0 ? 'positive' : sDiff < 0 ? 'negative' : 'neutral'}">
                ${sDiff > 0 ? '+' : ''}${sDiffPercent}% ${sDiff > 0 ? '⬆' : sDiff < 0 ? '⬇' : '➡'}
            </span>
        `;
    } else {
        sComparisonEl.innerHTML = `
            <span class="comparison-label">首次評估</span>
            <span class="comparison-value neutral">暫無比較數據</span>
        `;
    }
    
    // G 治理
    const gScore = current.scores?.G || 0;
    const gPercentage = (gScore / 30 * 100).toFixed(1);
    document.getElementById('g-score').textContent = gScore;
    document.getElementById('g-percentage').textContent = `${gPercentage}%`;
    setTimeout(() => {
        document.getElementById('g-progress').style.width = `${gPercentage}%`;
    }, 400);
    
    const gComparisonEl = document.getElementById('g-comparison');
    if (previous) {
        const prevG = previous.scores?.G || 0;
        const gDiff = gScore - prevG;
        const gDiffPercent = prevG > 0 ? ((gDiff / prevG) * 100).toFixed(1) : 0;
        gComparisonEl.innerHTML = `
            <span class="comparison-label">改善率：</span>
            <span class="comparison-value ${gDiff > 0 ? 'positive' : gDiff < 0 ? 'negative' : 'neutral'}">
                ${gDiff > 0 ? '+' : ''}${gDiffPercent}% ${gDiff > 0 ? '⬆' : gDiff < 0 ? '⬇' : '➡'}
            </span>
        `;
    } else {
        gComparisonEl.innerHTML = `
            <span class="comparison-label">首次評估</span>
            <span class="comparison-value neutral">暫無比較數據</span>
        `;
    }
}

// 渲染趨勢圖
function renderTrendChart() {
    const ctx = document.getElementById('trend-chart');
    if (!ctx) return;
    
    const timeRange = document.getElementById('time-range-select').value;
    let assessments = filterAssessmentsByTimeRange(trackerData.assessments, timeRange);
    
    // 過濾掉分數為0的評估（避免顯示錯誤的0分數據點）
    assessments = assessments.filter(a => {
        const totalScore = a.scores?.total || a.scores?.esg || 0;
        return totalScore > 0;
    });
    
    if (assessments.length === 0) {
        ctx.parentElement.innerHTML = '<p style="text-align: center; padding: 2rem;">暫無數據</p>';
        return;
    }
    
    const labels = assessments.map(a => {
        const date = new Date(a.date || a.timestamp);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    });
    
    const totalScores = assessments.map(a => a.scores?.total || a.scores?.esg || 0);
    const eScores = assessments.map(a => a.scores?.E || 0);
    const sScores = assessments.map(a => a.scores?.S || 0);
    const gScores = assessments.map(a => a.scores?.G || 0);
    
    console.log('📈 趨勢圖數據：', {
        labels: labels,
        totalScores: totalScores,
        eScores: eScores,
        sScores: sScores,
        gScores: gScores
    });
    
    if (trendChart) {
        trendChart.destroy();
    }
    
    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '總分',
                    data: totalScores,
                    borderColor: '#006633',
                    backgroundColor: 'rgba(0, 102, 51, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: '環境 (E)',
                    data: eScores,
                    borderColor: '#28a745',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    tension: 0.4
                },
                {
                    label: '社會 (S)',
                    data: sScores,
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    tension: 0.4
                },
                {
                    label: '治理 (G)',
                    data: gScores,
                    borderColor: '#6f42c1',
                    backgroundColor: 'rgba(111, 66, 193, 0.1)',
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

// 渲染雷達圖
function renderRadarChart(current, previous) {
    const ctx = document.getElementById('radar-chart');
    if (!ctx) return;
    
    const datasets = [{
        label: '當前表現',
        data: [
            current.scores.E || 0,
            current.scores.S || 0,
            current.scores.G || 0
        ],
        borderColor: '#006633',
        backgroundColor: 'rgba(0, 102, 51, 0.2)',
        pointBackgroundColor: '#006633'
    }];
    
    if (previous) {
        datasets.push({
            label: '上期表現',
            data: [
                previous.scores.E || 0,
                previous.scores.S || 0,
                previous.scores.G || 0
            ],
            borderColor: '#999',
            backgroundColor: 'rgba(153, 153, 153, 0.1)',
            borderDash: [5, 5],
            pointBackgroundColor: '#999'
        });
    }
    
    if (radarChart) {
        radarChart.destroy();
    }
    
    radarChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['環境 (E)', '社會 (S)', '治理 (G)'],
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                r: {
                    beginAtZero: true,
                    max: 30,
                    ticks: {
                        stepSize: 5
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top'
                }
            }
        }
    });
}

// 過濾評估數據（根據時間範圍）
function filterAssessmentsByTimeRange(assessments, timeRange) {
    if (timeRange === 'all') return assessments;
    
    const now = new Date();
    let cutoffDate = new Date();
    
    if (timeRange === '6months') {
        cutoffDate.setMonth(now.getMonth() - 6);
    } else if (timeRange === '1year') {
        cutoffDate.setFullYear(now.getFullYear() - 1);
    }
    
    return assessments.filter(a => {
        const assessmentDate = new Date(a.date || a.timestamp);
        return assessmentDate >= cutoffDate;
    });
}

// 更新圖表
function updateCharts() {
    renderTrendChart();
    // 重新獲取當前和上期數據
    const current = trackerData.assessments[trackerData.assessments.length - 1];
    const previous = trackerData.assessments.length > 1 ? 
        trackerData.assessments[trackerData.assessments.length - 2] : null;
    renderRadarChart(current, previous);
}

// 切換標籤頁
function switchTab(tabName) {
    // 更新標籤按鈕
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // 更新內容
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`tab-${tabName}`).classList.add('active');
}

// 渲染詳細頁面
function renderDetailPages(current, previous) {
    // E 詳細頁面
    renderDetailPage('e', current, previous, 35);
    // S 詳細頁面
    renderDetailPage('s', current, previous, 35);
    // G 詳細頁面
    renderDetailPage('g', current, previous, 30);
}

function renderDetailPage(type, current, previous, maxScore) {
    const typeUpper = type.toUpperCase();
    const score = current.scores[typeUpper] || 0;
    const previousScore = previous ? (previous.scores[typeUpper] || 0) : 0;
    const diff = score - previousScore;
    
    const statsEl = document.getElementById(`${type}-detail-stats`);
    statsEl.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">當前分數</span>
            <span class="stat-value">${score} / ${maxScore}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">上期分數</span>
            <span class="stat-value">${previousScore || '--'} / ${maxScore}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">改善幅度</span>
            <span class="stat-value ${diff > 0 ? 'positive' : diff < 0 ? 'negative' : 'neutral'}">
                ${diff > 0 ? '+' : ''}${diff} 分
                <span class="stat-change">(${previousScore > 0 ? ((diff / previousScore) * 100).toFixed(1) : 0}%)</span>
            </span>
        </div>
        <div class="stat-item">
            <span class="stat-label">完成度</span>
            <span class="stat-value">${((score / maxScore) * 100).toFixed(1)}%</span>
        </div>
    `;
    
    // 渲染詳細圖表
    const ctx = document.getElementById(`${type}-detail-chart`);
    if (ctx) {
        if (detailCharts[type]) {
            detailCharts[type].destroy();
        }
        
        const assessments = trackerData.assessments;
        const labels = assessments.map(a => {
            const date = new Date(a.date);
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        });
        const scores = assessments.map(a => {
            return a.scores[typeUpper] || 0;
        });
        
        detailCharts[type] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: `${typeUpper} 分數`,
                    data: scores,
                    borderColor: type === 'e' ? '#28a745' : type === 's' ? '#007bff' : '#6f42c1',
                    backgroundColor: type === 'e' ? 'rgba(40, 167, 69, 0.1)' : 
                                    type === 's' ? 'rgba(0, 123, 255, 0.1)' : 
                                    'rgba(111, 66, 193, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: maxScore
                    }
                }
            }
        });
    }
}

// 渲染成就頁面
function renderAchievementsPage() {
    const unlocked = document.getElementById('unlocked-achievements');
    const locked = document.getElementById('locked-achievements');
    
    const unlockedAchievements = trackerData.achievements;
    const allAchievements = Object.values(ACHIEVEMENT_DEFINITIONS);
    const lockedAchievements = allAchievements.filter(def => 
        !unlockedAchievements.some(a => a.id === def.id)
    );
    
    unlocked.innerHTML = unlockedAchievements.length > 0 ? 
        unlockedAchievements.map(achievement => `
            <div class="achievement-item unlocked">
                <div class="icon">${achievement.icon}</div>
                <div class="name">${achievement.name}</div>
                <div class="description">${achievement.description}</div>
                <div class="date">解鎖日期：${achievement.unlockedDate}</div>
            </div>
        `).join('') : 
        '<p class="no-achievements">尚無解鎖成就</p>';
    
    locked.innerHTML = lockedAchievements.length > 0 ?
        lockedAchievements.map(definition => `
            <div class="achievement-item locked">
                <div class="icon">${definition.icon}</div>
                <div class="name">${definition.name}</div>
                <div class="description">${definition.description}</div>
            </div>
        `).join('') :
        '<p class="no-achievements">所有成就已解鎖！🎉</p>';
}

// 檢查成就
function checkAchievements() {
    showLoading();
    checkAndUpdateAchievements();
    renderAchievementsPage();
    renderAchievementsSummary();
    hideLoading();
    alert('成就檢查完成！');
}

// 導出報告
function exportReport() {
    showLoading();
    
    // 這裡可以調用後端API生成PDF報告
    // 目前先顯示提示
    setTimeout(() => {
        hideLoading();
        alert('報告導出功能開發中，將生成包含趨勢圖和詳細分析的PDF報告。');
    }, 1000);
}

// 分享報告
function shareReport() {
    const companyName = trackerData.companyName;
    const current = trackerData.assessments[trackerData.assessments.length - 1];
    const score = current.scores.total;
    const rating = current.rating;
    
    const message = `【${companyName} ESG 改善報告】\n總分：${score}/100\n評級：${rating}級\n\n查看完整報告：${window.location.href}`;
    
    if (navigator.share) {
        navigator.share({
            title: 'ESG 改善報告',
            text: message,
            url: window.location.href
        });
    } else {
        // 複製到剪貼板
        navigator.clipboard.writeText(message).then(() => {
            alert('報告連結已複製到剪貼板！');
        });
    }
}

// 顯示/隱藏載入
function showLoading() {
    document.getElementById('loading-overlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
}

// 顯示無數據訊息
function showNoDataMessage() {
    const container = document.querySelector('.tracker-container');
    container.innerHTML = `
        <div style="text-align: center; padding: 4rem 2rem;">
            <h2>尚未有評估數據</h2>
            <p style="color: #666; margin: 1rem 0 2rem;">請先完成 ESG 評估以開始追蹤改善成效</p>
            <button class="btn btn-primary" onclick="window.location.href='/assessment'" 
                    style="padding: 1rem 2rem; font-size: 1.1rem;">
                開始評估
            </button>
        </div>
    `;
}

// 顯示錯誤訊息
function showErrorMessage(message) {
    alert(message);
}


