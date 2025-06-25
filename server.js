const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// 데이터 저장을 위한 변수들
let totalClicks = 0;
let countryClicks = new Map();
const DATA_FILE = 'ranking_data.json';

// 국가별 정보
const countryInfo = {
    'KR': { name: 'South Korea', flag: '🇰🇷' },
    'US': { name: 'United States', flag: '🇺🇸' },
    'JP': { name: 'Japan', flag: '🇯🇵' },
    'DE': { name: 'Germany', flag: '🇩🇪' },
    'CN': { name: 'China', flag: '🇨🇳' },
    'GB': { name: 'United Kingdom', flag: '🇬🇧' },
    'FR': { name: 'France', flag: '🇫🇷' },
    'CA': { name: 'Canada', flag: '🇨🇦' },
    'AU': { name: 'Australia', flag: '🇦🇺' },
    'BR': { name: 'Brazil', flag: '🇧🇷' },
    'IT': { name: 'Italy', flag: '🇮🇹' },
    'ES': { name: 'Spain', flag: '🇪🇸' },
    'NL': { name: 'Netherlands', flag: '🇳🇱' },
    'SE': { name: 'Sweden', flag: '🇸🇪' },
    'NO': { name: 'Norway', flag: '🇳🇴' },
    'DK': { name: 'Denmark', flag: '🇩🇰' },
    'FI': { name: 'Finland', flag: '🇫🇮' },
    'RU': { name: 'Russia', flag: '🇷🇺' },
    'IN': { name: 'India', flag: '🇮🇳' },
    'TH': { name: 'Thailand', flag: '🇹🇭' },
    'VN': { name: 'Vietnam', flag: '🇻🇳' },
    'SG': { name: 'Singapore', flag: '🇸🇬' },
    'MY': { name: 'Malaysia', flag: '🇲🇾' },
    'ID': { name: 'Indonesia', flag: '🇮🇩' },
    'PH': { name: 'Philippines', flag: '🇵🇭' },
    'TW': { name: 'Taiwan', flag: '🇹🇼' },
    'HK': { name: 'Hong Kong', flag: '🇭🇰' },
    'MX': { name: 'Mexico', flag: '🇲🇽' },
    'AR': { name: 'Argentina', flag: '🇦🇷' },
    'CL': { name: 'Chile', flag: '🇨🇱' },
    'PE': { name: 'Peru', flag: '🇵🇪' },
    'CO': { name: 'Colombia', flag: '🇨🇴' },
    'TR': { name: 'Turkey', flag: '🇹🇷' },
    'EG': { name: 'Egypt', flag: '🇪🇬' },
    'SA': { name: 'Saudi Arabia', flag: '🇸🇦' },
    'AE': { name: 'UAE', flag: '🇦🇪' },
    'IL': { name: 'Israel', flag: '🇮🇱' },
    'ZA': { name: 'South Africa', flag: '🇿🇦' },
    'NG': { name: 'Nigeria', flag: '🇳🇬' },
    'KE': { name: 'Kenya', flag: '🇰🇪' },
    'UNKNOWN': { name: 'Unknown', flag: '🌍' }
};

// 데이터 로드 함수
function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
            totalClicks = data.totalClicks || 0;
            countryClicks = new Map(data.countryClicks || []);
            console.log(`📂 데이터 로드 완료: ${totalClicks} 클릭`);
            console.log(`🏆 참여 국가: ${countryClicks.size}개`);
        } else {
            console.log('📁 새로운 데이터 파일 생성');
        }
    } catch (error) {
        console.error('❌ 데이터 로드 실패:', error);
        totalClicks = 0;
        countryClicks = new Map();
    }
}

// 데이터 저장 함수
function saveData() {
    try {
        const data = {
            totalClicks,
            countryClicks: Array.from(countryClicks.entries()),
            lastUpdate: new Date().toISOString()
        };
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        console.log(`💾 데이터 저장됨: ${totalClicks} 클릭`);
    } catch (error) {
        console.error('❌ 데이터 저장 실패:', error);
    }
}

// IP를 통한 국가 감지 함수
async function getCountryFromIP(ip) {
    try {
        // 로컬호스트인 경우 한국으로 설정
        if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
            return 'KR';
        }
        
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode`);
        const data = await response.json();
        return data.countryCode || 'UNKNOWN';
    } catch (error) {
        console.error('❌ 국가 감지 실패:', error);
        return 'UNKNOWN';
    }
}

// 클릭 처리 함수
async function handleClick(clientIP) {
    try {
        const countryCode = await getCountryFromIP(clientIP);
        
        // 전체 클릭수 증가
        totalClicks++;
        
        // 국가별 클릭수 증가
        const currentCount = countryClicks.get(countryCode) || 0;
        countryClicks.set(countryCode, currentCount + 1);
        
        console.log(`🖱️ 클릭: ${countryCode} (${countryInfo[countryCode]?.name || 'Unknown'}) - 전체: ${totalClicks}`);
        
        // 데이터 저장
        saveData();
        
        return true;
    } catch (error) {
        console.error('❌ 클릭 처리 실패:', error);
        return false;
    }
}

// 랭킹 데이터 생성 함수
function getRankingData() {
    const countries = Array.from(countryClicks.entries())
        .map(([code, clicks]) => ({
            code,
            name: countryInfo[code]?.name || 'Unknown',
            flag: countryInfo[code]?.flag || '🌍',
            clicks
        }))
        .sort((a, b) => b.clicks - a.clicks);
    
    return {
        type: 'ranking',
        totalClicks,
        countries,
        timestamp: new Date().toISOString()
    };
}

// 모든 클라이언트에게 랭킹 브로드캐스트
function broadcastRanking() {
    const rankingData = getRankingData();
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            try {
                client.send(JSON.stringify(rankingData));
            } catch (error) {
                console.error('❌ 클라이언트 전송 실패:', error);
            }
        }
    });
}

// 정적 파일 서빙
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

// 루트 경로
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// WebSocket 연결 처리
wss.on('connection', (ws, req) => {
    const clientIP = req.connection.remoteAddress || req.socket.remoteAddress || '127.0.0.1';
    console.log(`🔗 새 클라이언트 연결: ${clientIP}`);
    
    // 연결 즉시 현재 랭킹 전송
    try {
        ws.send(JSON.stringify(getRankingData()));
    } catch (error) {
        console.error('❌ 초기 랭킹 전송 실패:', error);
    }
    
    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            
            if (data.type === 'click') {
                const success = await handleClick(clientIP);
                if (success) {
                    // 모든 클라이언트에게 업데이트된 랭킹 브로드캐스트
                    broadcastRanking();
                }
            } else if (data.type === 'getRanking') {
                // 랭킹 요청시 현재 랭킹 전송
                ws.send(JSON.stringify(getRankingData()));
            }
        } catch (error) {
            console.error('❌ 메시지 처리 실패:', error);
        }
    });
    
    ws.on('close', () => {
        console.log(`❌ 클라이언트 연결 종료: ${clientIP}`);
    });
    
    ws.on('error', (error) => {
        console.error('❌ WebSocket 오류:', error);
    });
});

// 정기적으로 데이터 저장 (5초마다)
setInterval(saveData, 5000);

// 서버 시작
const PORT = process.env.PORT || 3000;

loadData();

server.listen(PORT, () => {
    console.log('🚀 OIIA OIIA CAT 서버 시작됨');
    console.log(`📡 포트: ${PORT}`);
    console.log(`🌍 전세계 랭킹 시스템 활성화`);
    console.log(`📊 현재 총 클릭수: ${totalClicks}`);
    console.log(`🏆 참여 국가: ${countryClicks.size}개`);
    console.log(`💾 자동 저장: 활성화`);
    console.log(`⚡ 실시간 WebSocket: 활성화`);
}); 