/**
 * ESG PDF生成器 - 後端核心模組
 * 使用 pdf-lib 將ESG評估結果填入PDF表單
 */

const { PDFDocument, PDFPage, degrees, StandardFonts, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

// 準備fontkit（在PDFDocument創建時註冊）
let fontkitModule = null;
try {
    fontkitModule = require('@pdf-lib/fontkit');
    console.log('✅ @pdf-lib/fontkit已加載');
} catch (e) {
    console.warn('⚠️ @pdf-lib/fontkit未安裝:', e.message);
}

// 載入座標配置
const coordinates = require('./pdf-coordinates-config');

class ESGPDFGenerator {
    constructor(pdfTemplatePath) {
        // 優先使用提供的路徑，否則嘗試使用實際的PDF模板文件
        this.templatePath = pdfTemplatePath || path.join(__dirname, '第二版企業ESG資料問卷(Word)11410.pdf');
        this.fontCache = {};
        this.chineseFont = null; // 中文字體緩存
        console.log('📄 PDF模板路徑:', this.templatePath);
    }

    /**
     * 嘗試加載中文字體
     */
    async loadChineseFont(pdfDoc) {
        if (this.chineseFont) {
            return this.chineseFont;
        }

        // 嘗試加載Windows系統中文字體
        // 根據系統實際情況調整字體路徑
        const fontPaths = [
            'C:\\Windows\\Fonts\\msyh.ttc',      // Microsoft YaHei (可能是TTC格式)
            'C:\\Windows\\Fonts\\msyhbd.ttc',    // Microsoft YaHei Bold
            'C:\\Windows\\Fonts\\mingliu.ttc',   // 新細明體 (TTC格式，需要轉換)
            'C:\\Windows\\Fonts\\kaiu.ttf',      // 標楷體
            'C:\\Windows\\Fonts\\kaiu.ttc',      // 標楷體 (TTC格式)
            'C:\\Windows\\Fonts\\simsun.ttc',    // 宋體
            'C:\\Windows\\Fonts\\simhei.ttf',    // 黑體
        ];

        // 只有當fontkit已加載時才嘗試加載自定義字體
        if (!fontkitModule) {
            console.warn('⚠️ fontkit未加載，跳過自定義字體');
            return null;
        }
        
        for (const fontPath of fontPaths) {
            try {
                if (fs.existsSync(fontPath)) {
                    const fontBytes = fs.readFileSync(fontPath);
                    // pdf-lib只支持TTF格式，不支持TTC
                    // 如果遇到TTC，需要先轉換為TTF或使用其他方法
                    if (fontPath.endsWith('.ttf')) {
                        this.chineseFont = await pdfDoc.embedFont(fontBytes);
                        console.log('✅ 成功加載中文字體:', path.basename(fontPath));
                        return this.chineseFont;
                    } else if (fontPath.endsWith('.ttc')) {
                        // TTC格式包含多個字體，需要特殊處理
                        console.log('ℹ️ 跳過TTC格式字體（需要特殊處理）:', path.basename(fontPath));
                    }
                }
            } catch (error) {
                console.warn('⚠️ 無法加載字體:', path.basename(fontPath), error.message);
            }
        }

        console.warn('⚠️ 無法加載中文字體，將使用默認字體（不支持中文）');
        return null;
    }

    /**
     * 安全處理文本：移除或替換中文字符
     */
    sanitizeText(text) {
        if (!text) return 'N/A';
        // 簡單處理：只保留ASCII字符和常見符號
        return String(text).replace(/[^\x00-\x7F]/g, '').trim() || 'N/A';
    }

    /**
     * 轉換中文為英文描述（因為默認字體不支持中文）
     */
    translateToEnglish(text) {
        const translations = {
            '企業永續經濟活動自評問卷': 'ESG Assessment Questionnaire',
            '【基本信息】': '[Basic Information]',
            '基本信息': 'Basic Information',
            '企業名稱': 'Company Name',
            '統一編號': 'Tax ID',
            '評估年度': 'Assessment Year',
            '評估日期': 'Assessment Date',
            '【ESG評估結果】': '[ESG Assessment Results]',
            'ESG評估結果': 'ESG Assessment Results',
            '評級': 'Rating',
            '完成度': 'Completion',
            '環境': 'Environment',
            '社會': 'Social',
            '治理': 'Governance',
            '【ESG評估回答】': '[ESG Assessment Answers]',
            'ESG評估回答': 'ESG Assessment Answers',
            '節能採購': 'Energy Efficient Procurement',
            '節能控管': 'Energy Management',
            '碳排減量': 'Carbon Reduction',
            '環保裁罰': 'Environmental Penalty',
            '綠能投資': 'Green Energy Investment',
            '循環經濟': 'Circular Economy',
            '鄰居檢舉': 'Neighbor Complaint',
            '勞工裁罰': 'Labor Penalty',
            '公益採購': 'Charity Purchase',
            '弱勢聘用': 'Vulnerable Employment',
            'ESG投資': 'ESG Investment',
            '稅務合規': 'Tax Compliance',
            '發票誠信': 'Invoice Integrity',
            '逃漏裁罰': 'Tax Evasion Penalty',
            '持續獲利': 'Continuous Profit',
            '董事會': 'Board Meeting',
            '股東溝通': 'Shareholder Communication',
            '永續報告': 'Sustainability Report',
            '是': 'Yes',
            '否': 'No',
            '有': 'Yes',
            '無': 'No'
        };

        let result = text;
        // 先處理帶方括號的
        for (const [chinese, english] of Object.entries(translations)) {
            result = result.replace(new RegExp(chinese.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), english);
        }
        return result;
    }

    /**
     * 主方法：生成已填寫的PDF
     */
    async generateFilledPDF(assessmentData) {
        console.log('🔄 開始生成PDF...');
        
        try {
            // 檢查模板文件
            if (!fs.existsSync(this.templatePath)) {
                console.warn('⚠️ 找不到PDF模板，將使用原始PDF或創建新PDF');
                return await this.generatePDFFromScratch(assessmentData);
            }

            // 讀取PDF模板
            const pdfBytes = fs.readFileSync(this.templatePath);
            const pdfDoc = await PDFDocument.load(pdfBytes);
            
            // 在PDFDocument創建後註冊fontkit（必須在embedFont之前）
            if (fontkitModule) {
                try {
                    PDFDocument.registerFontkit(fontkitModule);
                    console.log('✅ fontkit已註冊到PDFDocument');
                } catch (e) {
                    console.warn('⚠️ fontkit註冊失敗:', e.message);
                }
            }

            // 填寫表單數據
            await this.fillPDFContent(pdfDoc, assessmentData);

            // 生成最終PDF
            const pdfBuffer = await pdfDoc.save();
            console.log('✅ PDF生成完成，大小:', pdfBuffer.byteLength, '字節');
            
            return pdfBuffer;
        } catch (error) {
            console.error('❌ PDF生成錯誤:', error);
            // 降級方案：如果填寫失敗，生成新PDF
            return await this.generatePDFFromScratch(assessmentData);
        }
    }

    /**
     * 填寫PDF表單內容 - 使用文本定位方式填寫
     */
    async fillPDFContent(pdfDoc, data) {
        console.log('📝 開始填寫PDF表單（使用文本定位方式）...');
        console.log('📊 收到的數據:', {
            companyInfo: data.companyInfo ? '有' : '無',
            activities: (data.activities || []).length,
            esgAnswers: data.esgAnswers ? '有' : '無'
        });
        
        // 嘗試加載中文字體
        const chineseFont = await this.loadChineseFont(pdfDoc);
        const defaultFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const font = chineseFont || defaultFont;
        
        const pages = pdfDoc.getPages();
        console.log(`📄 PDF共有 ${pages.length} 頁`);
        
        if (pages.length === 0) {
            console.warn('⚠️ PDF沒有頁面');
            return;
        }

        // 根據PDF範例的結構，定義填寫位置（這些坐標需要根據實際PDF調整）
        // PDF座標系統：左下角為(0,0)，單位為點(1/72英寸)
        // A4尺寸：595.276 x 841.890 點

        // 在第一頁填寫基本信息
        const firstPage = pages[0];
        const pageHeight = firstPage.getSize().height;
        const fontSize = coordinates.font.size.normal;
        const coord = coordinates.page1;

        // 填寫基本信息（使用配置的座標）
        if (data.companyInfo) {
            console.log('📝 填寫基本信息...');
            console.log(`   - 公司名稱: "${data.companyInfo.name}"`);
            console.log(`   - 統一編號: "${data.companyInfo.taxId}"`);
            console.log(`   - 評估年度: "${data.companyInfo.year}"`);
            console.log(`   - 評估日期: "${data.companyInfo.date}"`);
            
            // 企業名稱
            this.drawTextOnPage(firstPage, data.companyInfo.name || '', {
                x: coord.companyInfo.name.x,
                y: pageHeight - coord.companyInfo.name.y,
                size: fontSize,
                font: font
            });

            // 統一編號
            this.drawTextOnPage(firstPage, String(data.companyInfo.taxId || ''), {
                x: coord.companyInfo.taxId.x,
                y: pageHeight - coord.companyInfo.taxId.y,
                size: fontSize,
                font: font
            });

            // 評估年度
            this.drawTextOnPage(firstPage, String(data.companyInfo.year || ''), {
                x: coord.companyInfo.year.x,
                y: pageHeight - coord.companyInfo.year.y,
                size: fontSize,
                font: font
            });

            // 評估日期 - 拆分成年、月、日三個字段
            const dateStr = data.companyInfo.date || '';
            let dateYear = '', dateMonth = '', dateDay = '';
            
            // 解析日期格式（可能是 "2025-01-15" 或 "2025/01/15"）
            if (dateStr) {
                const dateMatch = dateStr.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
                if (dateMatch) {
                    dateYear = dateMatch[1];
                    dateMonth = String(parseInt(dateMatch[2])).padStart(2, '0');
                    dateDay = String(parseInt(dateMatch[3])).padStart(2, '0');
                } else {
                    // 如果格式不匹配，嘗試直接分割
                    const parts = dateStr.split(/[-\/]/);
                    if (parts.length >= 3) {
                        dateYear = parts[0];
                        dateMonth = String(parseInt(parts[1])).padStart(2, '0');
                        dateDay = String(parseInt(parts[2])).padStart(2, '0');
                    }
                }
            }
            
            // 填寫年
            if (coord.companyInfo.dateYear) {
                this.drawTextOnPage(firstPage, dateYear, {
                    x: coord.companyInfo.dateYear.x,
                    y: pageHeight - coord.companyInfo.dateYear.y,
                    size: fontSize,
                    font: font
                });
            }
            
            // 填寫月
            if (coord.companyInfo.dateMonth) {
                this.drawTextOnPage(firstPage, dateMonth, {
                    x: coord.companyInfo.dateMonth.x,
                    y: pageHeight - coord.companyInfo.dateMonth.y,
                    size: fontSize,
                    font: font
                });
            }
            
            // 填寫日
            if (coord.companyInfo.dateDay) {
                this.drawTextOnPage(firstPage, dateDay, {
                    x: coord.companyInfo.dateDay.x,
                    y: pageHeight - coord.companyInfo.dateDay.y,
                    size: fontSize,
                    font: font
                });
            }
            
            console.log('  ✅ 基本信息已填寫');
        } else {
            console.warn('⚠️ 沒有公司基本信息');
        }

        // 填寫表格一：營運經濟活動
        const operatingActivities = (data.activities || []).filter(a => a.type === 'operating');
        console.log(`📝 填寫表格一：${operatingActivities.length} 個營運經濟活動`);
        
        if (operatingActivities.length === 0) {
            console.log('  ⚠️ 沒有營運經濟活動數據');
        }
        
        operatingActivities.forEach((activity, index) => {
            console.log(`  - 活動 ${index + 1}: ${activity.activityCode} (${activity.activityName})`);
            console.log(`    營收比重: ${activity.revenueShare}%, 評級: ${activity.rating}`);
            
            // 使用配置的座標
            const cols = coord.table1.columns;
            const baseY = pageHeight - (coord.table1.startY - index * coord.table1.rowHeight);
            
            console.log(`    填寫位置: y=${baseY.toFixed(0)}`);
            
            // 活動代號
            this.drawTextOnPage(firstPage, activity.activityCode || '', {
                x: cols.code.x,
                y: baseY + cols.code.offset,
                size: fontSize,
                font: font
            });

            // 類別
            this.drawTextOnPage(firstPage, activity.category || '', {
                x: cols.category.x,
                y: baseY + cols.category.offset,
                size: fontSize - 1,
                font: font
            });

            // 營收比重（僅營運經濟活動）
            if (activity.revenueShare !== null && activity.revenueShare !== undefined) {
                this.drawTextOnPage(firstPage, `${activity.revenueShare}%`, {
                    x: cols.revenueShare.x,
                    y: baseY + cols.revenueShare.offset,
                    size: fontSize,
                    font: font
                });
            }

            // 條件一：是/否
            this.drawTextOnPage(firstPage, activity.condition1 ? '是' : '否', {
                x: cols.condition1.x,
                y: baseY + cols.condition1.offset,
                size: fontSize,
                font: font
            });

            // 條件一的具體項目
            if (activity.condition1Items && activity.condition1Items.length > 0) {
                const itemsText = activity.condition1Items.join('、');
                this.drawTextOnPage(firstPage, itemsText, {
                    x: cols.condition1Items.x,
                    y: baseY + cols.condition1Items.offset,
                    size: coordinates.font.size.small,
                    font: font
                });
            }

            // 條件二：是/否
            this.drawTextOnPage(firstPage, activity.condition2 ? '是' : '否', {
                x: cols.condition2.x,
                y: baseY + cols.condition2.offset,
                size: fontSize,
                font: font
            });

            // 條件二的違反項目
            if (activity.condition2Violations && activity.condition2Violations.length > 0) {
                const violationsText = activity.condition2Violations.join('、');
                this.drawTextOnPage(firstPage, violationsText, {
                    x: cols.condition2Violations.x,
                    y: baseY + cols.condition2Violations.offset,
                    size: coordinates.font.size.small,
                    font: font
                });
            }

            // 條件三：是/否
            this.drawTextOnPage(firstPage, activity.condition3 ? '是' : '否', {
                x: cols.condition3.x,
                y: baseY + cols.condition3.offset,
                size: fontSize,
                font: font
            });

            // 轉型計畫
            if (activity.transitionPlan && activity.transitionPlan !== '不適用') {
                this.drawTextOnPage(firstPage, activity.transitionPlan === '是' ? '有' : '無', {
                    x: cols.transitionPlan.x,
                    y: baseY + cols.transitionPlan.offset,
                    size: fontSize,
                    font: font
                });
            }

            // 自評結果
            const ratingText = this.getRatingText(activity.rating);
            this.drawTextOnPage(firstPage, ratingText, {
                x: cols.rating.x,
                y: baseY + cols.rating.offset,
                size: fontSize,
                font: font
            });
        });

        // 填寫表格二：個別專案項目
        // 根據PDF範例，表格二通常在表格一之後的頁面（可能是第2頁或第3頁）
        const projectActivities = (data.activities || []).filter(a => a.type === 'project');
        console.log(`📝 填寫表格二：${projectActivities.length} 個個別專案項目`);
        
        if (projectActivities.length > 0) {
            // 假設表格二在第2頁（如果PDF有足夠頁面）
            const table2PageIndex = Math.min(1, pages.length - 1);
            const table2Page = pages[table2PageIndex];
            const table2PageHeight = table2Page.getSize().height;
            const table2Coord = coordinates.page2.table2;
            const table2Cols = table2Coord.columns;
            
            projectActivities.forEach((activity, index) => {
                const baseY = table2PageHeight - (table2Coord.startY - index * table2Coord.rowHeight);
                
                // 活動代號
                this.drawTextOnPage(table2Page, activity.activityCode || '', {
                    x: table2Cols.code.x,
                    y: baseY + table2Cols.code.offset,
                    size: fontSize,
                    font: font
                });

                // 類別
                this.drawTextOnPage(table2Page, activity.category || '', {
                    x: table2Cols.category.x,
                    y: baseY + table2Cols.category.offset,
                    size: fontSize - 1,
                    font: font
                });

                // 條件一：是/否
                this.drawTextOnPage(table2Page, activity.condition1 ? '是' : '否', {
                    x: table2Cols.condition1.x,
                    y: baseY + table2Cols.condition1.offset,
                    size: fontSize,
                    font: font
                });

                // 條件一的具體項目
                if (activity.condition1Items && activity.condition1Items.length > 0) {
                    const itemsText = activity.condition1Items.join('、');
                    this.drawTextOnPage(table2Page, itemsText, {
                        x: table2Cols.condition1Items.x,
                        y: baseY + table2Cols.condition1Items.offset,
                        size: coordinates.font.size.small,
                        font: font
                    });
                }

                // 條件二：是/否
                this.drawTextOnPage(table2Page, activity.condition2 ? '是' : '否', {
                    x: table2Cols.condition2.x,
                    y: baseY + table2Cols.condition2.offset,
                    size: fontSize,
                    font: font
                });

                // 條件二的違反項目
                if (activity.condition2Violations && activity.condition2Violations.length > 0) {
                    const violationsText = activity.condition2Violations.join('、');
                    this.drawTextOnPage(table2Page, violationsText, {
                        x: table2Cols.condition2Violations.x,
                        y: baseY + table2Cols.condition2Violations.offset,
                        size: coordinates.font.size.small,
                        font: font
                    });
                }

                // 條件三：是/否
                this.drawTextOnPage(table2Page, activity.condition3 ? '是' : '否', {
                    x: table2Cols.condition3.x,
                    y: baseY + table2Cols.condition3.offset,
                    size: fontSize,
                    font: font
                });

                // 轉型計畫
                if (activity.transitionPlan && activity.transitionPlan !== '不適用') {
                    this.drawTextOnPage(table2Page, activity.transitionPlan === '是' ? '有' : '無', {
                        x: table2Cols.transitionPlan.x,
                        y: baseY + table2Cols.transitionPlan.offset,
                        size: fontSize,
                        font: font
                    });
                }

                // 自評結果
                const ratingText = this.getRatingText(activity.rating);
                this.drawTextOnPage(table2Page, ratingText, {
                    x: table2Cols.rating.x,
                    y: baseY + table2Cols.rating.offset,
                    size: fontSize,
                    font: font
                });
            });
        }

        console.log('✅ PDF內容填寫完成');
        console.log(`📊 填寫統計:`);
        console.log(`   - 基本信息: ${data.companyInfo ? '已填寫' : '無數據'}`);
        console.log(`   - 營運活動: ${operatingActivities.length} 個`);
        console.log(`   - 專案活動: ${projectActivities.length} 個`);
    }

    /**
     * 在頁面上繪製文本（支持中文）
     */
    drawTextOnPage(page, text, options) {
        if (!text || text === 'undefined' || text === 'null') return;
        
        try {
            let finalText = String(text);
            
            // 如果沒有中文字體，處理中文文本
            if (!this.chineseFont && /[\u4e00-\u9fa5]/.test(finalText)) {
                // 如果包含中文但沒有中文字體，先嘗試轉換為英文
                const translated = this.translateToEnglish(finalText);
                if (translated !== finalText) {
                    finalText = translated;
                } else {
                    // 如果翻譯失敗，移除中文字符
                    finalText = this.sanitizeText(finalText);
                }
            }
            
            // 確保文本不為空
            if (!finalText || finalText.trim() === '') {
                return;
            }
            
            page.drawText(finalText, {
                x: options.x || 0,
                y: options.y || 0,
                size: options.size || 10,
                font: options.font
            });
            
            // 調試日志（只記錄關鍵字段）
            if (options.x < 200) { // 基本信息區域
                console.log(`  ✓ 填寫: x=${options.x}, y=${options.y.toFixed(0)}, 內容="${finalText.substring(0, 20)}"`);
            }
        } catch (error) {
            console.warn('⚠️ 繪製文本失敗:', text, '錯誤:', error.message);
            // 即使失敗也繼續，不中斷整個流程
        }
    }

    /**
     * 獲取評級文本
     */
    getRatingText(rating) {
        const ratingMap = {
            'Y': '符合',
            'T': '轉型中',
            'N': '不符合',
            'X': '不適用'
        };
        return ratingMap[rating] || rating;
    }

    /**
     * 將評估數據映射到PDF字段
     */
    getFieldMappings(data) {
        const mappings = {};

        // 基本信息
        if (data.companyInfo) {
            mappings['company_name'] = data.companyInfo.name || '';
            mappings['company_tax_id'] = data.companyInfo.taxId || '';
            mappings['assessment_year'] = data.companyInfo.year || '';
            mappings['assessment_date'] = data.companyInfo.date || '';
        }

        // ESG評估回答
        if (data.esgAnswers) {
            const esgFields = {
                e1: 'e1_energy_purchase',
                e2: 'e2_energy_control',
                e3: 'e3_carbon_reduction',
                e4: 'e4_environmental_penalty',
                e5: 'e5_renewable_energy',
                e6: 'e6_circular_economy',
                s1: 's1_neighbor_complaint',
                s2: 's2_labor_penalty',
                s3: 's3_charity_purchase',
                s4: 's4_vulnerable_employment',
                s5: 's5_esg_investment',
                g1: 'g1_tax_compliance',
                g2: 'g2_invoice_integrity',
                g3: 'g3_tax_evasion_penalty',
                g4: 'g4_continuous_profit',
                g5: 'g5_board_meeting',
                g6: 'g6_shareholder_communication',
                g7: 'g7_sustainability_report'
            };

            for (const [key, fieldName] of Object.entries(esgFields)) {
                if (data.esgAnswers[key]) {
                    mappings[fieldName] = data.esgAnswers[key] === 'yes' ? 'Yes' : 'No';
                }
            }
        }

        // 環境數據
        if (data.environmentalData) {
            mappings['scope1_emissions'] = data.environmentalData.scope1 || 0;
            mappings['scope2_emissions'] = data.environmentalData.scope2 || 0;
            mappings['scope3_emissions'] = data.environmentalData.scope3 || 0;
            mappings['total_emissions'] = (data.environmentalData.scope1 || 0) + 
                                         (data.environmentalData.scope2 || 0) + 
                                         (data.environmentalData.scope3 || 0);
            mappings['electricity_usage'] = data.environmentalData.electricity || 0;
            mappings['water_usage'] = data.environmentalData.water || 0;
        }

        // ESG評分摘要（如果有）
        if (data.esgScores) {
            mappings['esg_rating'] = data.esgScores.rating || '';
            mappings['esg_percentage'] = data.esgScores.percentage || '';
            mappings['environmental_score'] = data.esgScores.E || '';
            mappings['social_score'] = data.esgScores.S || '';
            mappings['governance_score'] = data.esgScores.G || '';
        }

        // 經濟活動數據
        if (data.activities && Array.isArray(data.activities)) {
            data.activities.forEach((activity, index) => {
                const prefix = `activity_${index + 1}`;
                mappings[`${prefix}_code`] = this.sanitizeText(activity.activityCode || '');
                mappings[`${prefix}_name`] = this.sanitizeText(activity.activityName || '');
                mappings[`${prefix}_category`] = this.sanitizeText(activity.category || '');
                mappings[`${prefix}_rating`] = this.sanitizeText(activity.rating || '');
                
                // 營收比重（僅營運經濟活動）
                if (activity.type === 'operating' && activity.revenueShare !== null && activity.revenueShare !== undefined) {
                    mappings[`${prefix}_revenue_share`] = this.sanitizeText(String(activity.revenueShare));
                }
                
                // 條件一
                mappings[`${prefix}_c1`] = activity.condition1 ? 'Yes' : 'No';
                if (activity.condition1Items && Array.isArray(activity.condition1Items) && activity.condition1Items.length > 0) {
                    mappings[`${prefix}_c1_items`] = this.sanitizeText(activity.condition1Items.join(', '));
                }
                
                // 條件二
                mappings[`${prefix}_c2`] = activity.condition2 ? 'Yes' : 'No';
                if (activity.condition2Violations && Array.isArray(activity.condition2Violations) && activity.condition2Violations.length > 0) {
                    mappings[`${prefix}_c2_violations`] = this.sanitizeText(activity.condition2Violations.join(', '));
                }
                
                // 條件三
                mappings[`${prefix}_c3`] = activity.condition3 ? 'Yes' : 'No';
                
                // 轉型計畫
                if (activity.transitionPlan) {
                    mappings[`${prefix}_transition_plan`] = this.sanitizeText(activity.transitionPlan);
                }
            });
        }

        return mappings;
    }

    /**
     * 降級方案：從頭創建PDF
     */
    async generatePDFFromScratch(data) {
        console.log('📄 創建新PDF文件...');
        
        try {
            const pdfDoc = await PDFDocument.create();
            const page = pdfDoc.addPage([595.276, 841.890]); // A4尺寸
            
            const { width, height } = page.getSize();
            const fontSize = 12;
            const lineHeight = 15;
            const margin = 30;
            
            let yPosition = height - margin;

            // 標題 (轉換為英文以避免中文編碼問題)
            page.drawText(this.translateToEnglish('企業永續經濟活動自評問卷'), {
                x: margin,
                y: yPosition,
                size: 18
            });
            yPosition -= lineHeight * 2;

            // 基本信息
            page.drawText(this.translateToEnglish('【基本信息】'), {
                x: margin,
                y: yPosition,
                size: 14
            });
            yPosition -= lineHeight;

            if (data.companyInfo) {
                // 安全处理用户输入：如果有中文，用拼音或英文替代
                const safeName = this.sanitizeText(data.companyInfo.name || 'N/A');
                const safeTaxId = this.sanitizeText(String(data.companyInfo.taxId || 'N/A'));
                const safeYear = String(data.companyInfo.year || 'N/A');
                const safeDate = String(data.companyInfo.date || 'N/A');
                
                const infoLines = [
                    `${this.translateToEnglish('企業名稱')}: ${safeName}`,
                    `${this.translateToEnglish('統一編號')}: ${safeTaxId}`,
                    `${this.translateToEnglish('評估年度')}: ${safeYear}`,
                    `${this.translateToEnglish('評估日期')}: ${safeDate}`
                ];

                infoLines.forEach(line => {
                    page.drawText(line, {
                        x: margin + 20,
                        y: yPosition,
                        size: fontSize
                    });
                    yPosition -= lineHeight;
                });
            }

            yPosition -= lineHeight;

            // ESG評估結果
            if (data.esgScores) {
                page.drawText(this.translateToEnglish('【ESG評估結果】'), {
                    x: margin,
                    y: yPosition,
                    size: 14
                });
                yPosition -= lineHeight;

                const scoreLines = [
                    `${this.translateToEnglish('評級')}: ${data.esgScores.rating || 'N/A'}`,
                    `${this.translateToEnglish('完成度')}: ${data.esgScores.percentage || 'N/A'}%`,
                    `${this.translateToEnglish('環境')}(E): ${data.esgScores.E || 'N/A'}`,
                    `${this.translateToEnglish('社會')}(S): ${data.esgScores.S || 'N/A'}`,
                    `${this.translateToEnglish('治理')}(G): ${data.esgScores.G || 'N/A'}`
                ];

                scoreLines.forEach(line => {
                    page.drawText(line, {
                        x: margin + 20,
                        y: yPosition,
                        size: fontSize
                    });
                    yPosition -= lineHeight;
                });
            }

            yPosition -= lineHeight;

            // ESG評估回答
            if (data.esgAnswers) {
                page.drawText(this.translateToEnglish('【ESG評估回答】'), {
                    x: margin,
                    y: yPosition,
                    size: 14
                });
                yPosition -= lineHeight;

                const answerLines = [
                    `E1 ${this.translateToEnglish('節能採購')}: ${data.esgAnswers.e1 === 'yes' ? this.translateToEnglish('是') : this.translateToEnglish('否')}`,
                    `E2 ${this.translateToEnglish('節能控管')}: ${data.esgAnswers.e2 === 'yes' ? this.translateToEnglish('是') : this.translateToEnglish('否')}`,
                    `E3 ${this.translateToEnglish('碳排減量')}: ${data.esgAnswers.e3 === 'yes' ? this.translateToEnglish('是') : this.translateToEnglish('否')}`,
                    `E4 ${this.translateToEnglish('環保裁罰')}: ${data.esgAnswers.e4 === 'yes' ? this.translateToEnglish('無') : this.translateToEnglish('有')}`,
                    `E5 ${this.translateToEnglish('綠能投資')}: ${data.esgAnswers.e5 === 'yes' ? this.translateToEnglish('是') : this.translateToEnglish('否')}`,
                    `E6 ${this.translateToEnglish('循環經濟')}: ${data.esgAnswers.e6 === 'yes' ? this.translateToEnglish('是') : this.translateToEnglish('否')}`,
                    `S1 ${this.translateToEnglish('鄰居檢舉')}: ${data.esgAnswers.s1 === 'yes' ? this.translateToEnglish('無') : this.translateToEnglish('有')}`,
                    `S2 ${this.translateToEnglish('勞工裁罰')}: ${data.esgAnswers.s2 === 'yes' ? this.translateToEnglish('無') : this.translateToEnglish('有')}`,
                    `S3 ${this.translateToEnglish('公益採購')}: ${data.esgAnswers.s3 === 'yes' ? this.translateToEnglish('是') : this.translateToEnglish('否')}`,
                    `S4 ${this.translateToEnglish('弱勢聘用')}: ${data.esgAnswers.s4 === 'yes' ? this.translateToEnglish('是') : this.translateToEnglish('否')}`,
                    `S5 ${this.translateToEnglish('ESG投資')}: ${data.esgAnswers.s5 === 'yes' ? this.translateToEnglish('是') : this.translateToEnglish('否')}`,
                    `G1 ${this.translateToEnglish('稅務合規')}: ${data.esgAnswers.g1 === 'yes' ? this.translateToEnglish('是') : this.translateToEnglish('否')}`,
                    `G2 ${this.translateToEnglish('發票誠信')}: ${data.esgAnswers.g2 === 'yes' ? this.translateToEnglish('是') : this.translateToEnglish('否')}`,
                    `G3 ${this.translateToEnglish('逃漏裁罰')}: ${data.esgAnswers.g3 === 'yes' ? this.translateToEnglish('無') : this.translateToEnglish('有')}`,
                    `G4 ${this.translateToEnglish('持續獲利')}: ${data.esgAnswers.g4 === 'yes' ? this.translateToEnglish('是') : this.translateToEnglish('否')}`,
                    `G5 ${this.translateToEnglish('董事會')}: ${data.esgAnswers.g5 === 'yes' ? this.translateToEnglish('是') : this.translateToEnglish('否')}`,
                    `G6 ${this.translateToEnglish('股東溝通')}: ${data.esgAnswers.g6 === 'yes' ? this.translateToEnglish('是') : this.translateToEnglish('否')}`,
                    `G7 ${this.translateToEnglish('永續報告')}: ${data.esgAnswers.g7 === 'yes' ? this.translateToEnglish('是') : this.translateToEnglish('否')}`
                ];

                answerLines.forEach(line => {
                    page.drawText(line, {
                        x: margin + 20,
                        y: yPosition,
                        size: fontSize - 1
                    });
                    yPosition -= lineHeight;
                    
                    // 如果空間不足，添加新頁面
                    if (yPosition < margin) {
                        const newPage = pdfDoc.addPage([595.276, 841.890]);
                        yPosition = height - margin;
                    }
                });
            }

            const pdfBuffer = await pdfDoc.save();
            console.log('✅ 新PDF創建完成，大小:', pdfBuffer.byteLength, '字節');
            
            return pdfBuffer;
        } catch (error) {
            console.error('❌ PDF創建失敗:', error);
            throw error;
        }
    }
}

module.exports = ESGPDFGenerator;
