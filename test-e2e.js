const http = require('http');
const fs = require('fs');

// 模擬完整的評估答案
const mockAnswers = {
    E1: 'yes', E2: 'basic', E3: 'yes', E4: 'partial', E5: 'yes', E6: 'yes', E7: 'basic', E8: 'yes',
    S1: 'yes', S2: 'yes', S3: 'basic', S4: 'yes', S5: 'partial', S6: 'yes', S7: 'yes', S8: 'basic', S9: 'yes', S10: 'yes',
    G1: 'yes', G2: 'yes', G3: 'yes', G4: 'basic', G5: 'yes', G6: 'yes', G7: 'yes', G8: 'yes'
};

async function testE2E() {
    console.log('🧪 開始端到端測試...\n');
    
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({ answers: mockAnswers });
        
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/generate-report',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        const req = http.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    
                    console.log('✅ API 回應成功！\n');
                    
                    // 驗證回應數據
                    const checks = {
                        '✓ status': response.status === 'success',
                        '✓ scores': response.scores && response.scores.total > 0,
                        '✓ report': response.report && response.report.length > 0,
                        '✓ aiRecommendations': response.aiRecommendations && response.aiRecommendations.length > 0,
                    };
                    
                    console.log('📋 回應數據驗證:');
                    let allPass = true;
                    for (const [check, result] of Object.entries(checks)) {
                        console.log(`   ${check}: ${result ? '✅ PASS' : '❌ FAIL'}`);
                        if (!result) allPass = false;
                    }
                    
                    if (!allPass) {
                        throw new Error('某些必要字段缺失');
                    }
                    
                    // 驗證 HTML 渲染
                    console.log('\n🎨 HTML 渲染驗證:');
                    const htmlChecks = {
                        '有 AI 教練標記': response.aiRecommendations.includes('🤖') || response.aiRecommendations.includes('AI'),
                        '有結構化內容': response.aiRecommendations.includes('##') || response.aiRecommendations.includes('###'),
                        '有建議內容': response.aiRecommendations.includes('改善') || response.aiRecommendations.includes('建議') || response.aiRecommendations.includes('機會'),
                    };
                    
                    for (const [check, result] of Object.entries(htmlChecks)) {
                        console.log(`   ${check}: ${result ? '✅ PASS' : '⚠️ 警告'}`);
                    }
                    
                    console.log('\n📊 生成的報告統計:');
                    console.log(`   基本報告: ${response.report.length} 字符`);
                    console.log(`   AI 建議: ${response.aiRecommendations.length} 字符`);
                    console.log(`   總計: ${response.report.length + response.aiRecommendations.length} 字符`);
                    
                    console.log('\n🔍 AI 建議內容摘要:');
                    const lines = response.aiRecommendations.split('\n').slice(0, 5);
                    lines.forEach(line => {
                        if (line.trim()) {
                            console.log(`   ${line.substring(0, 80)}`);
                        }
                    });
                    
                    resolve(response);
                } catch (error) {
                    console.error('❌ 解析失敗:', error.message);
                    reject(error);
                }
            });
        });
        
        req.on('error', (error) => {
            console.error('❌ 請求失敗:', error.message);
            reject(error);
        });
        
        req.write(postData);
        req.end();
    });
}

testE2E()
    .then(() => {
        console.log('\n' + '='.repeat(60));
        console.log('✅ 所有測試通過！完整功能正常！');
        console.log('='.repeat(60));
        console.log('\n🎯 可以進行的操作:');
        console.log('1. 訪問 http://localhost:3000/gri-assessment');
        console.log('2. 填寫評估表單');
        console.log('3. 點擊提交');
        console.log('4. 查看帶有 AI 建議的報告');
        console.log('\n或直接訪問測試頁面: http://localhost:3000/test-report');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ 測試失敗:', error);
        process.exit(1);
    });
