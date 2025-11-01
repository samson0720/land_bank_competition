// ESG輔導平台 JavaScript

document.addEventListener('DOMContentLoaded', function() {
    initializePlatform();
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

function initializePlatform() {
    // 碳盤查表單處理
    const carbonForm = document.getElementById('carbon-form');
    if (carbonForm) {
        carbonForm.addEventListener('submit', handleCarbonCalculator);
    }

    // 初始化標籤頁
    showTab('carbon');
}

// 標籤頁切換
function showTab(tabName, targetElement) {
    // 隱藏所有標籤內容
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(tab => tab.classList.remove('active'));

    // 移除所有標籤的active狀態
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => tab.classList.remove('active'));

    // 顯示選中的標籤內容
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }

    // 激活對應的標籤按鈕
    if (targetElement) {
        targetElement.classList.add('active');
    } else {
        // 根據tabName找到對應的標籤按鈕
        const tabTitles = {
            'carbon': '數位碳盤查工具',
            'templates': '模組化範本',
            'products': '銀行產品專區'
        };
        tabs.forEach(tab => {
            if (tab.textContent.trim().includes(tabTitles[tabName])) {
                tab.classList.add('active');
            }
        });
    }
}

// 綁定標籤頁按鈕事件
document.addEventListener('DOMContentLoaded', function() {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.preventDefault();
            const tabName = this.textContent.trim();
            if (tabName.includes('數位碳盤查工具')) {
                showTab('carbon', this);
            } else if (tabName.includes('模組化範本')) {
                showTab('templates', this);
            } else if (tabName.includes('銀行產品專區')) {
                showTab('products', this);
            }
        });
    });
});

function getTabTitle(tabName) {
    const titles = {
        'carbon': '數位碳盤查工具',
        'templates': '模組化範本',
        'products': '銀行產品專區'
    };
    return titles[tabName] || '';
}

// 處理碳盤查計算
async function handleCarbonCalculator(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const data = {
        naturalGas: parseFloat(formData.get('natural-gas')) || 0,
        gasoline: parseFloat(formData.get('gasoline')) || 0,
        diesel: parseFloat(formData.get('diesel')) || 0,
        lpg: parseFloat(formData.get('lpg')) || 0,
        electricity: parseFloat(formData.get('electricity')) || 0
    };

    // 檢查是否有輸入
    if (data.electricity === 0 && data.naturalGas === 0 && data.gasoline === 0 && data.diesel === 0 && data.lpg === 0) {
        utils.showAlert('請至少輸入一項能源使用數據', 'warning');
        return;
    }

    const resultContainer = document.getElementById('carbon-result');
    utils.showLoading(resultContainer);

    try {
        // 發送碳盤查計算請求
        const response = await fetch('/api/carbon-calculator', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        displayCarbonResult(result, data);
    } catch (error) {
        console.error('碳盤查計算錯誤:', error);
        utils.showAlert('碳盤查計算失敗，請稍後再試', 'danger');
        utils.hideLoading(resultContainer);
    }
}

function displayCarbonResult(result, inputData) {
    const resultContainer = document.getElementById('carbon-result');
    utils.hideLoading(resultContainer);

    // 計算各項占比
    const scope1Percent = result.scope1 > 0 ? ((result.scope1 / result.total) * 100).toFixed(1) : 0;
    const scope2Percent = result.scope2 > 0 ? ((result.scope2 / result.total) * 100).toFixed(1) : 0;

    // 轉換為噸（除以1000）
    const scope1Ton = (result.scope1 / 1000).toFixed(2);
    const scope2Ton = (result.scope2 / 1000).toFixed(2);
    const totalTon = (result.total / 1000).toFixed(2);

    resultContainer.innerHTML = `
        <div class="card" style="background: linear-gradient(135deg, #4caf50 0%, #2e7d32 100%); color: white;">
            <h3 style="margin-bottom: 1rem;">碳排放量計算結果</h3>
            <div style="font-size: 2rem; font-weight: bold; margin: 1rem 0;">
                總碳排放量：${totalTon} 噸 CO₂e
            </div>
        </div>

        <div class="card">
            <div class="card-header">詳細計算結果</div>
            <div style="margin-top: 1rem;">
                <h4>範疇一：直接排放</h4>
                <p style="font-size: 1.2rem; color: var(--primary-color);">
                    ${scope1Ton} 噸 CO₂e (${scope1Percent}%)
                </p>
                <ul style="margin-left: 1.5rem; margin-top: 0.5rem;">
                    ${inputData.naturalGas > 0 ? `<li>天然氣：${(inputData.naturalGas * 2.02 / 1000).toFixed(2)} 噸 CO₂e</li>` : ''}
                    ${inputData.gasoline > 0 ? `<li>汽油：${(inputData.gasoline * 2.31 / 1000).toFixed(2)} 噸 CO₂e</li>` : ''}
                    ${inputData.diesel > 0 ? `<li>柴油：${(inputData.diesel * 2.68 / 1000).toFixed(2)} 噸 CO₂e</li>` : ''}
                    ${inputData.lpg > 0 ? `<li>液化石油氣：${(inputData.lpg * 1.51 / 1000).toFixed(2)} 噸 CO₂e</li>` : ''}
                </ul>

                <h4 style="margin-top: 2rem;">範疇二：間接排放（電力）</h4>
                <p style="font-size: 1.2rem; color: var(--primary-color);">
                    ${scope2Ton} 噸 CO₂e (${scope2Percent}%)
                </p>
                <p style="margin-top: 0.5rem;">
                    電力用量：${inputData.electricity.toLocaleString()} kWh
                </p>
            </div>
        </div>

        <div class="card">
            <div class="card-header">減碳建議</div>
            <div style="margin-top: 1rem;">
                ${getCarbonReductionSuggestions(result, inputData)}
            </div>
        </div>

        <div style="text-align: center; margin: 2rem 0;">
            <button class="btn" onclick="location.reload()">重新計算</button>
            <button class="btn btn-secondary" onclick="window.print()">列印結果</button>
        </div>
    `;

    resultContainer.style.display = 'block';
    resultContainer.scrollIntoView({ behavior: 'smooth' });
}

function getCarbonReductionSuggestions(result, inputData) {
    const suggestions = [];

    if (result.scope2 > result.scope1) {
        suggestions.push({
            title: '電力使用優化建議',
            items: [
                '更換LED燈具，節省用電20-30%',
                '導入智慧電表，監控用電狀況',
                '改善空調系統效率，降低用電量',
                '考慮採購再生能源，降低範疇二排放'
            ]
        });
    }

    if (result.scope1 > 0) {
        suggestions.push({
            title: '直接排放優化建議',
            items: [
                '改用低排放燃料（如天然氣替代柴油）',
                '改善設備效率，降低燃料使用量',
                '考慮使用電動車輛，減少燃料消耗',
                '定期維護設備，確保最佳運轉效率'
            ]
        });
    }

    suggestions.push({
        title: '長期減碳目標',
        items: [
            '設定年度減碳目標（建議5-10%）',
            '建立碳盤查年度報告機制',
            '追蹤減碳進度，定期檢討改善',
            '申請碳權認證，建立碳資產管理'
        ]
    });

    return suggestions.map(s => `
        <div style="margin: 1rem 0;">
            <h4 style="color: var(--primary-color);">${s.title}</h4>
            <ul style="margin-left: 1.5rem; margin-top: 0.5rem;">
                ${s.items.map(item => `<li>${item}</li>`).join('')}
            </ul>
        </div>
    `).join('');
}

// 下載範本
function downloadTemplate(type) {
    utils.showAlert(`${type === 'basic' ? '基礎版' : '進階版'}範本下載功能開發中，敬請期待！`, 'info');
    // 實際實作時，這裡應該連結到範本檔案的下載
}

// 申請產品
function applyProduct(productType) {
    utils.showAlert('產品申請功能開發中，請先完成ESG評分！', 'info');
    // 實際實作時，這裡應該引導用戶到申請頁面或要求先完成評分
}

