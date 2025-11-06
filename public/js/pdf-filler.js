/**
 * ESG PDF填寫器 - 前端模組
 * 用於生成已填寫ESG評估答案的PDF問卷
 */

class ESGPDFFiller {
    constructor() {
        this.apiEndpoint = '/api/generate-esg-pdf';
    }

    /**
     * 主方法：根據評估結果生成填寫的PDF
     */
    async generatePDFFromAssessment(assessmentResult) {
        try {
            console.log('📄 開始生成填寫的PDF...');
            
            // 嘗試從localStorage獲取完整數據（包含所有活動詳情）
            let fullData = null;
            try {
                const fullDataStr = localStorage.getItem('esgFullData');
                if (fullDataStr) {
                    fullData = JSON.parse(fullDataStr);
                    console.log('✅ 已載入完整評估數據');
                }
            } catch (e) {
                console.warn('⚠️ 無法載入完整數據，使用基本數據');
            }
            
            // 優先使用完整數據，否則使用傳入的數據
            const sourceData = fullData || assessmentResult;
            
            // 準備提交數據
            const pdfData = {
                companyInfo: {
                    name: sourceData.table1Data?.companyName || sourceData.companyName || '',
                    taxId: sourceData.table1Data?.companyTaxId || sourceData.companyTaxId || '',
                    year: sourceData.table1Data?.pastYear || sourceData.year || new Date().getFullYear(),
                    date: sourceData.table1Data?.assessmentDate || sourceData.date || new Date().toISOString().split('T')[0]
                },
                esgScores: assessmentResult.scores || {},
                esgAnswers: sourceData.esgAssessment || assessmentResult.esgAssessment || {},
                environmentalData: {
                    scope1: sourceData.scope1Emissions || 0,
                    scope2: sourceData.scope2Emissions || 0,
                    scope3: sourceData.scope3Emissions || 0,
                    electricity: sourceData.electricityUsage || 0,
                    water: sourceData.waterUsage || 0
                },
                // 使用完整數據中的activities（包含revenueShare、condition1Items等）
                activities: sourceData.activities || assessmentResult.activities || []
            };
            
            console.log('📊 PDF數據準備完成:', {
                companyInfo: pdfData.companyInfo.name ? '有' : '無',
                activities: pdfData.activities.length,
                firstActivity: pdfData.activities[0] || null
            });
            
            // 發送請求到後端
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(pdfData)
            });
            
            if (!response.ok) {
                throw new Error(`PDF生成失敗: ${response.statusText}`);
            }
            
            // 檢查Content-Type
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/pdf')) {
                // 如果不是PDF，嘗試解析錯誤消息
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.message || '伺服器返回的不是PDF文件');
            }
            
            // 獲取PDF二進制數據
            const pdfBlob = await response.blob();
            
            // 驗證PDF是否有效（PDF文件應該以%PDF開頭）
            if (pdfBlob.size === 0) {
                throw new Error('PDF文件為空');
            }
            
            // 檢查PDF文件頭
            const arrayBuffer = await pdfBlob.slice(0, 4).arrayBuffer();
            const header = new TextDecoder().decode(arrayBuffer);
            if (header !== '%PDF') {
                console.warn('⚠️ PDF文件頭可能不正確:', header);
                // 不拋出錯誤，因為可能仍可讀取
            }
            
            console.log('✅ PDF生成成功，大小:', pdfBlob.size, '字節');
            
            return pdfBlob;
        } catch (error) {
            console.error('❌ PDF生成錯誤:', error);
            throw error;
        }
    }

    /**
     * 下載PDF文件
     */
    downloadPDF(pdfBlob, filename) {
        try {
            if (!pdfBlob || pdfBlob.size === 0) {
                throw new Error('PDF文件無效或為空');
            }
            
            const url = URL.createObjectURL(pdfBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename || `ESG_Assessment_${new Date().toISOString().split('T')[0]}.pdf`;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            
            // 延遲清理，確保下載開始
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 100);
            
            console.log('✅ PDF下載已觸發:', filename);
        } catch (error) {
            console.error('❌ PDF下載錯誤:', error);
            alert('下載失敗：' + error.message);
        }
    }

    /**
     * 在新視窗預覽PDF
     */
    previewPDF(pdfBlob) {
        try {
            if (!pdfBlob || pdfBlob.size === 0) {
                throw new Error('PDF文件無效或為空');
            }
            
            const url = URL.createObjectURL(pdfBlob);
            const newWindow = window.open(url, '_blank');
            
            if (!newWindow) {
                alert('無法打開新視窗，請檢查瀏覽器彈窗設定');
                return;
            }
            
            // 監聽窗口關閉，清理URL
            newWindow.addEventListener('beforeunload', () => {
                URL.revokeObjectURL(url);
            });
            
            console.log('✅ PDF預覽已打開');
        } catch (error) {
            console.error('❌ PDF預覽錯誤:', error);
            alert('預覽失敗：' + error.message);
        }
    }

    /**
     * 打印PDF
     */
    printPDF(pdfBlob) {
        const url = URL.createObjectURL(pdfBlob);
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = url;
        document.body.appendChild(iframe);
        
        iframe.onload = function() {
            iframe.contentWindow.print();
            // 2秒後移除iframe
            setTimeout(() => {
                document.body.removeChild(iframe);
                URL.revokeObjectURL(url);
            }, 2000);
        };
    }
}

// 導出全局實例
const esgPdfFiller = new ESGPDFFiller();
