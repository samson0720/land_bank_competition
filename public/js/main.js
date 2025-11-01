// 主JavaScript檔案

// 導航功能
document.addEventListener('DOMContentLoaded', function() {
    // 平滑滾動
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // 表單驗證
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            if (!form.checkValidity()) {
                e.preventDefault();
                e.stopPropagation();
            }
            form.classList.add('was-validated');
        });
    });
});

// 工具函數
const utils = {
    // 格式化數字
    formatNumber: (num) => {
        return num.toLocaleString('zh-TW');
    },

    // 格式化百分比
    formatPercent: (num) => {
        return (num * 100).toFixed(1) + '%';
    },

    // 顯示通知
    showAlert: (message, type = 'info') => {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.textContent = message;
        alertDiv.style.position = 'fixed';
        alertDiv.style.top = '20px';
        alertDiv.style.right = '20px';
        alertDiv.style.zIndex = '9999';
        alertDiv.style.minWidth = '300px';
        document.body.appendChild(alertDiv);

        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    },

    // 載入動畫
    showLoading: (container) => {
        const spinner = document.createElement('div');
        spinner.className = 'spinner';
        container.innerHTML = '';
        container.appendChild(spinner);
    },

    // 隱藏載入動畫
    hideLoading: (container) => {
        container.innerHTML = '';
    }
};

// 導出工具函數
if (typeof module !== 'undefined' && module.exports) {
    module.exports = utils;
}

