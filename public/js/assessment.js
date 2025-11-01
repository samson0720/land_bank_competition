// ESG評分系統 JavaScript

let currentStep = 1;
let formData = {};

document.addEventListener('DOMContentLoaded', function() {
    initializeAssessment();
});

// 確保utils可用
if (typeof utils === 'undefined') {
    window.utils = {
        showAlert: function(message, type) {
            alert(message);
        },
        showLoading: function(container) {
            if (container) {
                container.innerHTML = '<div class="spinner"></div>';
            }
        },
        hideLoading: function(container) {
            if (container) {
                container.innerHTML = '';
            }
        }
    };
}

function initializeAssessment() {
    // 初始化表單
    setupFormHandlers();
    updateStepDisplay();
}

function setupFormHandlers() {
    // 表單提交處理
    const form = document.getElementById('assessment-form');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }

    // 下一步按鈕
    const nextBtn = document.getElementById('next-btn');
    if (nextBtn) {
        nextBtn.addEventListener('click', handleNext);
    }

    // 上一步按鈕
    const prevBtn = document.getElementById('prev-btn');
    if (prevBtn) {
        prevBtn.addEventListener('click', handlePrev);
    }

    // 階段一：基礎門檻篩選
    const stage1Form = document.getElementById('stage1-form');
    if (stage1Form) {
        stage1Form.addEventListener('submit', handleStage1Submit);
    }

    // 階段二：永續績效評分
    const stage2Form = document.getElementById('stage2-form');
    if (stage2Form) {
        stage2Form.addEventListener('submit', handleStage2Submit);
    }
}

// 處理階段一：基礎門檻篩選
async function handleStage1Submit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        hasEnvironmentalViolations: formData.get('environmental-violations') === 'yes',
        hasLaborViolations: formData.get('labor-violations') === 'yes',
        hasGovernanceIssues: formData.get('governance-issues') === 'yes',
        industry: formData.get('industry'),
        employeeCount: parseInt(formData.get('employee-count'))
    };

    // 檢查是否有重大違規
    const hasMajorViolations = data.hasEnvironmentalViolations || 
                              data.hasLaborViolations || 
                              data.hasGovernanceIssues;

    if (hasMajorViolations) {
        showStage1Result(false, data);
    } else {
        // 通過門檻，進入階段二
        showStage1Result(true, data);
        setTimeout(() => {
            showStage2Form();
        }, 2000);
    }
}

function showStage1Result(passed, data) {
    const resultDiv = document.getElementById('stage1-result');
    if (!resultDiv) return;

    if (passed) {
        resultDiv.innerHTML = `
            <div class="alert alert-success">
                <h3>✓ 通過基礎門檻篩選</h3>
                <p>您的企業已通過基礎門檻篩選，可以進入第二階段：簡易永續績效評分。</p>
                <p style="margin-top: 1rem;">正在為您載入評分表單...</p>
            </div>
        `;
    } else {
        resultDiv.innerHTML = `
            <div class="alert alert-danger">
                <h3>⚠ 未通過基礎門檻篩選</h3>
                <p>很抱歉，您的企業目前有重大違規紀錄，需要先改善後才能申請永續金融產品。</p>
                <div style="margin-top: 1rem;">
                    <h4>建議改善事項：</h4>
                    <ul style="margin-left: 1.5rem; margin-top: 0.5rem;">
                        ${data.hasEnvironmentalViolations ? '<li>處理環境污染違規事項</li>' : ''}
                        ${data.hasLaborViolations ? '<li>解決勞工違規問題</li>' : ''}
                        ${data.hasGovernanceIssues ? '<li>改善公司治理缺失</li>' : ''}
                    </ul>
                </div>
                <button class="btn" onclick="location.reload()" style="margin-top: 1rem;">重新填寫</button>
            </div>
        `;
    }
    resultDiv.style.display = 'block';
}

function showStage2Form() {
    document.getElementById('stage1-section').style.display = 'none';
    document.getElementById('stage2-section').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 處理階段二：永續績效評分
async function handleStage2Submit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        // E（環境）
        e1_carbonManagement: formData.get('e1_carbon_management'),
        e2_energyEfficiency: formData.get('e2_energy_efficiency'),
        e3_waste: formData.getAll('e3_waste').includes('yes') ? 'yes' : 'no',
        e3_water: formData.getAll('e3_water').includes('yes') ? 'yes' : 'no',
        
        // S（社會）
        s1_training: formData.get('s1_training'),
        s2_welfare: formData.get('s2_welfare'),
        s3_supplychain: formData.get('s3_supplychain'),
        s4_community: formData.get('s4_community'),
        
        // G（治理）
        g1_sustainability: formData.get('g1_sustainability'),
        g2_compliance: formData.get('g2_compliance'),
        g3_integrity: formData.get('g3_integrity'),
        
        // T（轉型透明度）
        t1_platform: formData.get('t1_platform'),
        t2_targets: formData.get('t2_targets'),
        t3_commitment: formData.get('t3_commitment')
    };

    console.log('📤 發送評分數據到後端：', data);

    // 驗證必須欄位
    const requiredFields = [
        'e1_carbonManagement', 'e2_energyEfficiency',
        's1_training', 's2_welfare', 's3_supplychain', 's4_community',
        'g1_sustainability', 'g2_compliance', 'g3_integrity',
        't1_platform', 't2_targets', 't3_commitment'
    ];

    const emptyFields = requiredFields.filter(field => !data[field] || data[field] === '');
    if (emptyFields.length > 0) {
        console.warn('⚠️ 未填寫的欄位：', emptyFields);
        utils.showAlert(`請完整填寫所有欄位！未填項目：${emptyFields.join(', ')}`, 'warning');
        return;
    }

    // 顯示載入中
    const resultContainer = document.getElementById('assessment-result');
    utils.showLoading(resultContainer);

    try {
        // 發送評分計算請求
        const response = await fetch('/api/calculate-score', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const score = await response.json();
        console.log('📥 收到後端回應：', score);
        
        if (!score || score.total === undefined) {
            throw new Error('無效的評分結果');
        }
        
        displayAssessmentResult(score, data);
    } catch (error) {
        console.error('❌ 評分計算錯誤:', error);
        utils.hideLoading(resultContainer);
        utils.showAlert(`評分計算失敗：${error.message}，請稍後再試`, 'danger');
    }
}

function displayAssessmentResult(score, formData) {
    const resultContainer = document.getElementById('assessment-result');
    utils.hideLoading(resultContainer);

    // 計算利率減碼
    const rateDiscount = score.rateDiscount * 100; // 轉換為百分比
    const baseRate = 2.5; // 基準利率
    const actualRate = baseRate - rateDiscount;

    resultContainer.innerHTML = `
        <div class="card">
            <div class="score-display">
                <div class="score-value">${Math.round(score.total)}</div>
                <div class="score-level badge badge-${score.level}">
                    評分等級：${score.levelName}
                </div>
                <div class="score-breakdown">
                    <div class="score-item">
                        <div class="score-item-label">E（環境）</div>
                        <div class="score-item-value">${score.details.e1 !== undefined ? (score.details.e1 + score.details.e2 + score.details.e3) : 0}</div>
                    </div>
                    <div class="score-item">
                        <div class="score-item-label">S（社會）</div>
                        <div class="score-item-value">${score.details.s1 !== undefined ? (score.details.s1 + score.details.s2 + score.details.s3 + score.details.s4) : 0}</div>
                    </div>
                    <div class="score-item">
                        <div class="score-item-label">G（治理）</div>
                        <div class="score-item-value">${score.details.g1 !== undefined ? (score.details.g1 + score.details.g2 + score.details.g3) : 0}</div>
                    </div>
                    <div class="score-item">
                        <div class="score-item-label">T（轉型透明度）</div>
                        <div class="score-item-value">${score.details.t1 !== undefined ? (score.details.t1 + score.details.t2) : 0}</div>
                    </div>
                </div>
            </div>
        </div>

        <div class="card">
            <div class="card-header">利率減碼建議</div>
            <div style="padding: 1rem;">
                <p><strong>基準利率：</strong>${baseRate}%</p>
                <p><strong>ESG評分等級：</strong>${score.levelName}</p>
                <p><strong>利率減碼幅度：</strong>${rateDiscount.toFixed(2)}%</p>
                <p style="font-size: 1.5rem; color: var(--primary-color); margin-top: 1rem;">
                    <strong>實際利率：${actualRate.toFixed(2)}%</strong>
                </p>
                ${score.products ? `
                    <p style="margin-top: 1rem; color: var(--text-light);">
                        <strong>推薦產品：</strong>${score.products.join('、')}
                    </p>
                ` : ''}
                
                ${score.specialBenefits ? `
                    <div style="margin-top: 1.5rem; padding: 1rem; background: #e8f5e9; border-left: 4px solid #4caf50; border-radius: 4px;">
                        <p style="margin: 0 0 0.5rem 0; color: #2e7d32;"><strong>🎯 特別優惠/條件：</strong></p>
                        <ul style="margin: 0.5rem 0 0 1.5rem; color: #2e7d32;">
                            ${score.specialBenefits.map(benefit => `<li>${benefit}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                
                ${score.warning ? `
                    <div style="margin-top: 1rem; padding: 1rem; background: #fff3e0; border-left: 4px solid #ff9800; border-radius: 4px;">
                        <p style="margin: 0; color: #e65100;"><strong>⚠️ 重要提醒：</strong>${score.warning}</p>
                    </div>
                ` : ''}
            </div>
        </div>

        <div class="card">
            <div class="card-header">詳細評分</div>
            <div style="padding: 1rem;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr style="border-bottom: 1px solid var(--border-color);">
                        <td style="padding: 0.5rem;"><strong>構面</strong></td>
                        <td style="padding: 0.5rem; text-align: right;"><strong>得分</strong></td>
                        <td style="padding: 0.5rem; text-align: right;"><strong>滿分</strong></td>
                    </tr>
                    <tr style="border-bottom: 1px solid var(--border-color);">
                        <td style="padding: 0.5rem;">E（環境）</td>
                        <td style="padding: 0.5rem; text-align: right;">${score.E}</td>
                        <td style="padding: 0.5rem; text-align: right;">35</td>
                    </tr>
                    <tr style="border-bottom: 1px solid var(--border-color);">
                        <td style="padding: 0.5rem;">S（社會）</td>
                        <td style="padding: 0.5rem; text-align: right;">${score.S}</td>
                        <td style="padding: 0.5rem; text-align: right;">30</td>
                    </tr>
                    <tr style="border-bottom: 1px solid var(--border-color);">
                        <td style="padding: 0.5rem;">G（治理）</td>
                        <td style="padding: 0.5rem; text-align: right;">${score.G}</td>
                        <td style="padding: 0.5rem; text-align: right;">25</td>
                    </tr>
                    <tr style="border-bottom: 1px solid var(--border-color);">
                        <td style="padding: 0.5rem;">T（轉型透明度）</td>
                        <td style="padding: 0.5rem; text-align: right;">${score.T}</td>
                        <td style="padding: 0.5rem; text-align: right;">10</td>
                    </tr>
                    <tr style="background: var(--bg-light);">
                        <td style="padding: 0.5rem;"><strong>總分</strong></td>
                        <td style="padding: 0.5rem; text-align: right;"><strong>${Math.round(score.total)}</strong></td>
                        <td style="padding: 0.5rem; text-align: right;"><strong>100</strong></td>
                    </tr>
                </table>
            </div>
        </div>

        <div class="card">
            <div class="card-header">推薦金融產品</div>
            <div style="padding: 1rem;">
                ${score.products && score.products.length > 0 ? score.products.map(product => `
                    <div style="padding: 1rem; margin: 1rem 0; background: var(--bg-light); border-radius: 5px;">
                        <h4 style="color: var(--primary-color); margin-bottom: 0.5rem;">${product}</h4>
                    </div>
                `).join('') : '<p>根據您的評分，暫無特定推薦產品</p>'}
            </div>
        </div>

        ${score.improvements && score.improvements.length > 0 ? `
        <div class="card">
            <div class="card-header">改善建議</div>
            <div style="padding: 1rem;">
                <p style="margin-bottom: 1rem; color: var(--text-light);">
                    您可以通過以下改善方向提升 ESG 評分：
                </p>
                <ul style="margin-left: 1.5rem;">
                    ${score.improvements.map(item => `<li style="margin-bottom: 0.5rem;">${getImprovementText(item)}</li>`).join('')}
                </ul>
            </div>
        </div>
        ` : ''}

        <div style="text-align: center; margin: 2rem 0;">
            <button class="btn" onclick="location.reload()">重新評分</button>
            <button class="btn btn-secondary" onclick="window.print()">列印結果</button>
        </div>
    `;

    // 顯示結果區域
    document.getElementById('assessment-result').style.display = 'block';
    document.getElementById('stage2-section').style.display = 'none';
    
    // 滾動到結果
    document.getElementById('assessment-result').scrollIntoView({ behavior: 'smooth' });
}

function getImprovementText(indicator) {
    const texts = {
        'E1': '完成範疇一、二碳盤查並設定減碳目標',
        'E2': '更新主要設備或全面更換 LED 照明',
        'E3': '制定廢棄物減量目標並建立水資源管理',
        'S1': '建立年度人才培訓計畫（人均15小時以上）',
        'S2': '提供優於法規的員工福利',
        'S3': '要求主要供應商簽署永續承諾書',
        'S4': '建立年度社區回饋或公益活動',
        'G1': '指派高階主管為 ESG 負責人',
        'G2': '確保過去3年無重大違規紀錄',
        'G3': '將誠信經營規範納入公司規章',
        'T1': '連續使用平台填報 ESG 數據達2年',
        'T2': '在平台上公開至少一項量化永續目標',
        'T3': '與銀行簽訂永續轉型意向書並定期追蹤'
    };
    return texts[indicator] || indicator;
}

// 步驟導航
function handleNext() {
    if (validateCurrentStep()) {
        currentStep++;
        updateStepDisplay();
    }
}

function handlePrev() {
    if (currentStep > 1) {
        currentStep--;
        updateStepDisplay();
    }
}

function validateCurrentStep() {
    // 表單驗證邏輯
    return true;
}

function updateStepDisplay() {
    // 更新步驟顯示
    const steps = document.querySelectorAll('.step');
    steps.forEach((step, index) => {
        if (index + 1 < currentStep) {
            step.classList.add('completed');
            step.classList.remove('active');
        } else if (index + 1 === currentStep) {
            step.classList.add('active');
            step.classList.remove('completed');
        } else {
            step.classList.remove('active', 'completed');
        }
    });
}

