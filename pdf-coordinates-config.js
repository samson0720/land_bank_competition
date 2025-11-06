/**
 * PDF座標配置
 * 根據PDF範例圖調整填寫位置
 * 
 * PDF座標系統：左下角為(0,0)，單位為點(1/72英寸)
 * A4尺寸：595.32 x 841.92 點
 */

module.exports = {
    // 第1頁：基本信息
    page1: {
        // 基本信息區域（根據PDF實際結構調整）
        // 從PDF圖片看，"一、基本資料"在頁面中間偏上位置
        // 25%線對應Y座標：841.92 * 0.75 = 631（從頂部75% = 從底部25%）
        companyInfo: {
            name: { x: 120, y: 720 },      // 企業名稱（在"企業名稱:"標籤後）
            taxId: { x: 120, y: 700 },     // 企業統編（在"企業統編:"標籤後）
            year: { x: 200, y: 680 },       // 過去一年年度（在"過去一年年度:"後）
            // 填寫日期 - 年月日（在25%線附近，右上角）
            dateYear: { x: 480, y: 625 },   // 年（在"填寫日期: 年 月 日"的"年"位置）
            dateMonth: { x: 510, y: 625 },  // 月（在"月"位置）
            dateDay: { x: 540, y: 625 }     // 日（在"日"位置）
        },
        
        // 表格一：營運經濟活動起始位置
        // 根據PDF結構，表格在"貳、永續經濟活動自評"部分，在頁面下半部分
        table1: {
            startX: 80,                    // 表格起始X座標
            startY: 500,                   // 第一個活動的Y座標（從頁面頂部計算，實際填寫時會轉換）
            rowHeight: 100,                // 每行活動的高度間距
            
            // 各列的位置
            columns: {
                code: { x: 80, offset: 0 },           // 活動代號
                category: { x: 150, offset: 0 },      // 類別
                revenueShare: { x: 280, offset: 0 },  // 營收比重
                condition1: { x: 350, offset: 0 },    // 條件一
                condition1Items: { x: 380, offset: -10 }, // 條件一項目
                condition2: { x: 350, offset: -20 },  // 條件二
                condition2Violations: { x: 380, offset: -30 }, // 條件二違反項目
                condition3: { x: 350, offset: -40 },  // 條件三
                transitionPlan: { x: 350, offset: -60 }, // 轉型計畫
                rating: { x: 480, offset: 0 }          // 自評結果
            }
        }
    },
    
    // 第2頁：表格二（個別專案項目）
    page2: {
        // 表格二起始位置（通常在PDF的第2頁或第3頁）
        table2: {
            startX: 80,
            startY: 600,
            rowHeight: 120,
            
            columns: {
                code: { x: 80, offset: 0 },
                category: { x: 150, offset: 0 },
                condition1: { x: 350, offset: 0 },
                condition1Items: { x: 380, offset: -10 },
                condition2: { x: 350, offset: -20 },
                condition2Violations: { x: 380, offset: -30 },
                condition3: { x: 350, offset: -40 },
                transitionPlan: { x: 350, offset: -60 },
                rating: { x: 480, offset: 0 }
            }
        }
    },
    
    // 字體設定
    font: {
        size: {
            normal: 10,
            small: 8,
            large: 12
        }
    }
};

