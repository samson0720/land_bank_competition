/**
 * AI 客服聊天助手
 * 提供上下文感知的智能對話功能
 */

class ChatAssistant {
    constructor() {
        this.isOpen = false;
        this.messages = [];
        this.currentContext = this.detectContext();
        this.conversationHistory = [];
        this.init();
    }

    init() {
        this.createWidget();
        this.attachEventListeners();
        this.loadConversationHistory();
        // 顯示歡迎訊息
        this.addWelcomeMessage();
    }

    /**
     * 檢測當前頁面上下文
     */
    detectContext() {
        const path = window.location.pathname;
        const hash = window.location.hash;

        if (path.includes('/assessment') || path.includes('esg-assessment.html')) {
            return {
                page: 'esg-assessment',
                name: 'ESG評估頁面',
                description: '使用者正在填寫ESG自評表',
                features: ['填表說明', '題目解釋', '評分預測']
            };
        } else if (path.includes('/esg-result') || path.includes('esg-result.html')) {
            return {
                page: 'esg-result',
                name: 'ESG結果頁面',
                description: '使用者正在查看ESG評級結果',
                features: ['分數解讀', '改善建議', '利率優惠說明']
            };
        } else if (path.includes('/gri-assessment') || path.includes('gri-assessment.html')) {
            return {
                page: 'gri-assessment',
                name: 'GRI評估頁面',
                description: '使用者正在填寫GRI評估',
                features: ['GRI標準說明', '指標解釋']
            };
        } else if (path.includes('/platform') || path.includes('platform.html')) {
            return {
                page: 'platform',
                name: '輔導平台',
                description: '使用者在使用輔導平台',
                features: ['工具使用', '資源查詢']
            };
        } else if (path === '/' || path.includes('index.html')) {
            return {
                page: 'home',
                name: '首頁',
                description: '使用者在首頁瀏覽',
                features: ['功能介紹', '流程說明', '平台介紹']
            };
        } else {
            return {
                page: 'unknown',
                name: '未知頁面',
                description: '使用者在瀏覽平台',
                features: ['一般諮詢']
            };
        }
    }

    /**
     * 創建聊天組件DOM
     */
    createWidget() {
        const widget = document.createElement('div');
        widget.className = 'chat-widget';
        widget.innerHTML = `
            <button class="chat-button" id="chatToggleBtn" aria-label="開啟AI客服">
                <div class="chat-button-label"></div>
                <div class="chat-button-badge">✨</div>
            </button>
            <div class="chat-container" id="chatContainer">
                <div class="chat-header">
                    <div>
                        <h3>ESG AI 智能客服</h3>
                        <div class="status">
                            <span class="status-dot"></span>
                            <span>AI 線上服務中</span>
                        </div>
                    </div>
                    <button class="close-btn" id="chatCloseBtn" aria-label="關閉">×</button>
                </div>
                <div class="chat-messages" id="chatMessages"></div>
                <div class="chat-quick-actions" id="chatQuickActions"></div>
                <div class="chat-input-area">
                    <div class="chat-input-wrapper">
                        <textarea 
                            class="chat-input" 
                            id="chatInput" 
                            placeholder="輸入您的問題..."
                            rows="1"
                        ></textarea>
                    </div>
                    <button class="chat-send-btn" id="chatSendBtn" aria-label="發送">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13"></line>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(widget);
        this.updateQuickActions();
    }

    /**
     * 更新快捷操作按鈕
     */
    updateQuickActions() {
        const container = document.getElementById('chatQuickActions');
        if (!container) return;

        const actions = this.getQuickActions();
        container.innerHTML = actions.map(action => 
            `<button class="chat-quick-action" data-action="${action.action}">${action.label}</button>`
        ).join('');

        // 綁定點擊事件
        container.querySelectorAll('.chat-quick-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                this.handleQuickAction(action);
            });
        });
    }

    /**
     * 根據上下文獲取快捷操作
     */
    getQuickActions() {
        const contextActions = {
            'esg-assessment': [
                { action: 'explain-question', label: '📝 題目說明' },
                { action: 'example-fill', label: '💡 填寫範例' },
                { action: 'score-prediction', label: '📊 評分預測' }
            ],
            'esg-result': [
                { action: 'explain-score', label: '📈 解讀分數' },
                { action: 'improvement-tips', label: '💡 改善建議' },
                { action: 'rate-simulation', label: '💰 利率模擬' }
            ],
            'gri-assessment': [
                { action: 'gri-standard', label: '📋 GRI標準' },
                { action: 'indicator-help', label: '❓ 指標說明' }
            ],
            'platform': [
                { action: 'tool-help', label: '🛠️ 工具使用' },
                { action: 'resource-guide', label: '📚 資源指南' }
            ],
            'home': [
                { action: 'platform-intro', label: '🏠 平台介紹' },
                { action: 'process-guide', label: '🚀 流程說明' },
                { action: 'start-assessment', label: '📊 開始評估' }
            ]
        };

        return contextActions[this.currentContext.page] || [
            { action: 'general-help', label: '❓ 一般幫助' }
        ];
    }

    /**
     * 處理快捷操作
     */
    handleQuickAction(action) {
        const questions = {
            'explain-question': '請解釋當前題目的含義和填寫要求',
            'example-fill': '請提供填寫範例或參考值',
            'score-prediction': '根據我目前的填寫情況，預測可能的ESG等級',
            'explain-score': '請詳細解釋我的ESG評分結果',
            'improvement-tips': '請提供具體的改善建議',
            'rate-simulation': '如果我把碳排減少20%，利率會降多少？',
            'gri-standard': '請說明GRI標準的要求',
            'indicator-help': '請解釋當前指標的含義',
            'tool-help': '請說明如何使用這個工具',
            'resource-guide': '請介紹可用的資源',
            'platform-intro': '請介紹這個平台的功能',
            'process-guide': '請說明評估流程',
            'start-assessment': '如何開始進行ESG評估？',
            'general-help': '我需要幫助'
        };

        const question = questions[action] || '我需要幫助';
        document.getElementById('chatInput').value = question;
        this.sendMessage();
    }

    /**
     * 添加歡迎訊息
     */
    addWelcomeMessage() {
        const welcomeMessage = this.getWelcomeMessage();
        this.addMessage('assistant', welcomeMessage);
    }

    /**
     * 根據上下文獲取歡迎訊息
     */
    getWelcomeMessage() {
        const messages = {
            'esg-assessment': `您好！我是ESG智能客服。我注意到您正在填寫ESG自評表。

我可以幫您：
• 📝 解釋每個題目的含義
• 💡 提供填寫範例或參考值
• 📊 根據您的填寫情況預測可能的ESG等級

有什麼問題隨時問我！`,
            'esg-result': `您好！我看到您剛完成ESG評估。我可以幫您：

• 📈 詳細解讀您的評分結果
• 💡 提供針對性的改善建議
• 💰 模擬利率優惠情況
• 🔗 查詢區塊鏈上鏈狀態

需要哪方面的幫助？`,
            'gri-assessment': `您好！我正在協助您完成GRI評估。我可以：

• 📋 解釋GRI標準要求
• ❓ 說明各個指標的含義
• 📊 提供評估建議

隨時問我！`,
            'platform': `您好！歡迎使用輔導平台。我可以協助您：

• 🛠️ 工具使用說明
• 📚 資源查詢指南
• 💡 最佳實踐建議

有什麼需要幫助的嗎？`,
            'home': `您好！歡迎來到土地銀行綠易通 (Green 'E' Pass) 平台。我是您的AI智能客服。

我可以幫您：
• 🏠 介紹平台功能
• 🚀 說明評估流程
• 📊 協助開始評估
• ❓ 回答任何問題

點擊下方快捷按鈕或直接輸入問題開始對話！`
        };

        return messages[this.currentContext.page] || `您好！我是ESG智能客服，有什麼可以幫助您的嗎？`;
    }

    /**
     * 附加事件監聽器
     */
    attachEventListeners() {
        // 切換聊天視窗
        document.getElementById('chatToggleBtn').addEventListener('click', () => {
            this.toggleChat();
        });

        // 關閉聊天視窗
        document.getElementById('chatCloseBtn').addEventListener('click', () => {
            this.closeChat();
        });

        // 發送訊息
        document.getElementById('chatSendBtn').addEventListener('click', () => {
            this.sendMessage();
        });

        // 輸入框 Enter 鍵發送
        const input = document.getElementById('chatInput');
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // 自動調整輸入框高度
        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 100) + 'px';
        });
    }

    /**
     * 切换聊天窗口
     */
    toggleChat() {
        this.isOpen = !this.isOpen;
        const container = document.getElementById('chatContainer');
        if (this.isOpen) {
            container.classList.add('active');
            document.getElementById('chatInput').focus();
        } else {
            container.classList.remove('active');
        }
    }

    /**
     * 关闭聊天窗口
     */
    closeChat() {
        this.isOpen = false;
        document.getElementById('chatContainer').classList.remove('active');
    }

    /**
     * 发送消息
     */
    async sendMessage() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();

        if (!message) return;

        // 添加使用者訊息
        this.addMessage('user', message);
        input.value = '';
        input.style.height = 'auto';

        // 顯示正在輸入
        this.showTyping();

        try {
            // 獲取使用者上下文數據（如果有）
            const userData = this.getUserContextData();

            // 調用API
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: message,
                    context: this.currentContext,
                    userData: userData,
                    conversationHistory: this.conversationHistory.slice(-10) // 只發送最近10條
                })
            });

            // 檢查HTTP響應狀態
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            // 隱藏正在輸入
            this.hideTyping();

            if (data.status === 'success') {
                this.addMessage('assistant', data.response);
                // 更新對話歷史
                this.conversationHistory.push(
                    { role: 'user', content: message },
                    { role: 'assistant', content: data.response }
                );
                this.saveConversationHistory();
            } else {
                // 顯示後端返回的錯誤消息
                const errorMsg = data.message || '抱歉，我遇到了一些問題。請稍後再試。';
                this.addMessage('assistant', errorMsg);
            }
        } catch (error) {
            console.error('Chat error:', error);
            this.hideTyping();
            
            // 判斷錯誤類型
            let errorMessage = '抱歉，網路連線出現問題。請檢查您的網路連線後重試。';
            
            if (error.message.includes('HTTP 429')) {
                // 速率限制錯誤
                errorMessage = '請求過於頻繁，請稍候幾秒後再試。';
            } else if (error.message.includes('HTTP')) {
                // HTTP錯誤
                const statusMatch = error.message.match(/HTTP (\d+)/);
                if (statusMatch) {
                    const status = statusMatch[1];
                    if (status === '500') {
                        errorMessage = '服務器內部錯誤，請稍後再試。';
                    } else if (status === '400') {
                        errorMessage = '請求格式錯誤，請重新發送。';
                    } else {
                        errorMessage = `服務器回應錯誤（${status}），請稍後再試。`;
                    }
                } else {
                    errorMessage = '服務器回應錯誤，請稍後再試。如果問題持續，請聯繫技術支援。';
                }
            } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
                // 網絡連接錯誤
                errorMessage = '無法連接到服務器。請確認服務器正在運行，或檢查您的網路連線。';
            }
            
            this.addMessage('assistant', errorMessage);
        }
    }

    /**
     * 獲取使用者上下文數據（從localStorage或頁面）
     */
    getUserContextData() {
        const data = {};

        // 嘗試從localStorage獲取ESG評估結果
        try {
            const esgResult = localStorage.getItem('esgAssessmentResult');
            if (esgResult) {
                data.esgResult = JSON.parse(esgResult);
            }

            const griResult = localStorage.getItem('griAssessmentResult');
            if (griResult) {
                data.griResult = JSON.parse(griResult);
            }
        } catch (e) {
            console.warn('Failed to load user data:', e);
        }

        // 嘗試從頁面獲取當前填寫的數據
        if (this.currentContext.page === 'esg-assessment') {
            const formData = this.getESGFormData();
            if (formData) {
                data.currentFormData = formData;
            }
        }

        return data;
    }

    /**
     * 獲取當前ESG表單數據
     */
    getESGFormData() {
        try {
            // 這裡需要根據實際的表單結構來獲取數據
            // 由於表單結構可能複雜，這裡只做範例
            const data = {};
            const inputs = document.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                if (input.name || input.id) {
                    const key = input.name || input.id;
                    if (input.value) {
                        data[key] = input.value;
                    }
                }
            });
            return Object.keys(data).length > 0 ? data : null;
        } catch (e) {
            return null;
        }
    }

    /**
     * 添加訊息到聊天界面
     */
    addMessage(role, content) {
        const messagesContainer = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${role}`;

        const timestamp = new Date().toLocaleTimeString('zh-TW', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        // 簡單的Markdown渲染
        const renderedContent = this.renderMarkdown(content);

        // 使用SVG图标替代emoji
        const userIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
        </svg>`;
        const aiIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"></rect>
            <circle cx="9" cy="9" r="1.5"></circle>
            <circle cx="15" cy="9" r="1.5"></circle>
            <path d="M9 15h6"></path>
            <path d="M12 3v2"></path>
            <path d="M12 19v2"></path>
            <path d="M3 12h2"></path>
            <path d="M19 12h2"></path>
        </svg>`;

        messageDiv.innerHTML = `
            <div class="avatar">${role === 'user' ? userIcon : aiIcon}</div>
            <div class="content">
                ${renderedContent}
                <div class="timestamp">${timestamp}</div>
            </div>
        `;

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // 保存訊息
        this.messages.push({ role, content, timestamp });
    }

    /**
     * 簡單的Markdown渲染
     */
    renderMarkdown(text) {
        // 轉義HTML
        let html = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // 標題
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

        // 粗體
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // 斜體
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

        // 代碼
        html = html.replace(/`(.*?)`/g, '<code>$1</code>');

        // 列表
        html = html.replace(/^\- (.*$)/gim, '<li>$1</li>');
        html = html.replace(/^• (.*$)/gim, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

        // 換行
        html = html.replace(/\n/g, '<br>');

        return html;
    }

    /**
     * 顯示正在輸入
     */
    showTyping() {
        const messagesContainer = document.getElementById('chatMessages');
        const typingDiv = document.createElement('div');
        typingDiv.className = 'chat-message assistant';
        typingDiv.id = 'typingIndicator';
        const aiIcon = `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"></rect>
            <circle cx="9" cy="9" r="1.5"></circle>
            <circle cx="15" cy="9" r="1.5"></circle>
            <path d="M9 15h6"></path>
            <path d="M12 3v2"></path>
            <path d="M12 19v2"></path>
            <path d="M3 12h2"></path>
            <path d="M19 12h2"></path>
        </svg>`;

        typingDiv.innerHTML = `
            <div class="avatar">${aiIcon}</div>
            <div class="chat-typing">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;
        messagesContainer.appendChild(typingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    /**
     * 隱藏正在輸入
     */
    hideTyping() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    /**
     * 保存對話歷史
     */
    saveConversationHistory() {
        try {
            localStorage.setItem('chatHistory', JSON.stringify(this.conversationHistory));
        } catch (e) {
            console.warn('Failed to save chat history:', e);
        }
    }

    /**
     * 載入對話歷史
     */
    loadConversationHistory() {
        try {
            const history = localStorage.getItem('chatHistory');
            if (history) {
                this.conversationHistory = JSON.parse(history);
            }
        } catch (e) {
            console.warn('Failed to load chat history:', e);
        }
    }
}

// 初始化聊天助手
let chatAssistant;

// 等待DOM載入完成
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        chatAssistant = new ChatAssistant();
    });
} else {
    chatAssistant = new ChatAssistant();
}

