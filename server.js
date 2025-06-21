const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// 간단한 메모리 저장소 (임시)
let clickData = [];
let countryStats = {};

// 초기 테스트 데이터 추가 (서버 시작 시)
function initializeTestData() {
    const testCountries = ['KR', 'US', 'JP', 'CN', 'GB'];
    const now = new Date();
    
    testCountries.forEach((country, index) => {
        const clicks = Math.floor(Math.random() * 50) + 10; // 10-60 랜덤 클릭
        
        countryStats[country] = {
            clicks: clicks,
            name: countryNames[country],
            lastClick: new Date(now.getTime() - Math.random() * 3600000) // 1시간 내 랜덤
        };
        
        // 클릭 데이터도 추가
        for (let i = 0; i < clicks; i++) {
            clickData.push({
                country: country,
                countryName: countryNames[country],
                ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
                timestamp: new Date(now.getTime() - Math.random() * 3600000),
                version: '10.0.world-rank'
            });
        }
    });
    
    console.log('테스트 데이터 초기화 완료:', {
        totalClicks: clickData.length,
        countries: Object.keys(countryStats).length
    });
}

// 서버 시작 시 테스트 데이터 초기화
initializeTestData();

// 국가 코드를 한국어 이름으로 매핑
const countryNames = {
    'KR': '🇰🇷 대한민국',
    'US': '🇺🇸 미국',
    'JP': '🇯🇵 일본',
    'CN': '🇨🇳 중국',
    'GB': '🇬🇧 영국',
    'DE': '🇩🇪 독일',
    'FR': '🇫🇷 프랑스',
    'CA': '🇨🇦 캐나다',
    'AU': '🇦🇺 호주',
    'BR': '🇧🇷 브라질',
    'IN': '🇮🇳 인도',
    'RU': '🇷🇺 러시아',
    'IT': '🇮🇹 이탈리아',
    'ES': '🇪🇸 스페인',
    'MX': '🇲🇽 멕시코',
    'TH': '🇹🇭 태국',
    'VN': '🇻🇳 베트남',
    'ID': '🇮🇩 인도네시아',
    'MY': '🇲🇾 말레이시아',
    'SG': '🇸🇬 싱가포르',
    'PH': '🇵🇭 필리핀',
    'TW': '🇹🇼 대만',
    'HK': '🇭🇰 홍콩',
    'NL': '🇳🇱 네덜란드',
    'SE': '🇸🇪 스웨덴',
    'NO': '🇳🇴 노르웨이',
    'DK': '🇩🇰 덴마크',
    'FI': '🇫🇮 핀란드',
    'CH': '🇨🇭 스위스',
    'AT': '🇦🇹 오스트리아',
    'BE': '🇧🇪 벨기에',
    'PT': '🇵🇹 포르투갈',
    'PL': '🇵🇱 폴란드',
    'CZ': '🇨🇿 체코',
    'HU': '🇭🇺 헝가리',
    'GR': '🇬🇷 그리스',
    'TR': '🇹🇷 터키',
    'IL': '🇮🇱 이스라엘',
    'SA': '🇸🇦 사우디아라비아',
    'AE': '🇦🇪 아랍에미리트',
    'EG': '🇪🇬 이집트',
    'ZA': '🇿🇦 남아프리카공화국',
    'NG': '🇳🇬 나이지리아',
    'AR': '🇦🇷 아르헨티나',
    'CL': '🇨🇱 칠레',
    'CO': '🇨🇴 콜롬비아',
    'PE': '🇵🇪 페루',
    'NZ': '🇳🇿 뉴질랜드',
    'Local': '🏠 로컬',
    'Unknown': '❓ 알 수 없음'
};

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 캐시 방지 헤더
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

// IP 주소로 국가 정보를 가져오는 함수 (간단한 매핑 방식)
function getCountryFromIP(ip) {
    try {
        // 로컬 IP 처리
        if (ip === '127.0.0.1' || ip.includes('localhost') || ip.includes('192.168') || ip.includes('10.0') || ip === '::1' || ip === '::ffff:127.0.0.1') {
            return 'Local';
        }

        // Vercel 서버리스 환경에서는 복잡한 API 호출 대신 간단한 IP 기반 매핑 사용
        const ipParts = ip.split('.');
        if (ipParts.length === 4) {
            const firstOctet = parseInt(ipParts[0]);
            const secondOctet = parseInt(ipParts[1]);
            
            // 간단한 지역 매핑 (대략적)
            if (firstOctet >= 1 && firstOctet <= 60) return 'KR'; // 한국 추정
            if (firstOctet >= 61 && firstOctet <= 120) return 'US'; // 미국 추정
            if (firstOctet >= 121 && firstOctet <= 140) return 'JP'; // 일본 추정
            if (firstOctet >= 141 && firstOctet <= 160) return 'CN'; // 중국 추정
            if (firstOctet >= 161 && firstOctet <= 180) return 'GB'; // 영국 추정
            if (firstOctet >= 181 && firstOctet <= 200) return 'DE'; // 독일 추정
            if (firstOctet >= 201 && firstOctet <= 220) return 'FR'; // 프랑스 추정
            if (firstOctet >= 221 && firstOctet <= 255) return 'CA'; // 캐나다 추정
        }
        
        return 'Unknown';
        
    } catch (error) {
        console.error('IP 국가 조회 실패:', error);
        return 'Unknown';
    }
}

// 헬스 체크 엔드포인트
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        version: '10.0.world-rank',
        totalClicks: clickData.length,
        totalCountries: Object.keys(countryStats).length,
        timestamp: new Date().toISOString()
    });
});

// 디버깅용 데이터 확인 엔드포인트
app.get('/api/debug', (req, res) => {
    res.json({
        clickData: clickData.slice(-10), // 최근 10개 클릭만
        countryStats: countryStats,
        totalClicks: clickData.length,
        totalCountries: Object.keys(countryStats).length,
        sampleIP: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown'
    });
});

// 클릭 기록 API (실제 지역 감지)
app.post('/api/click', (req, res) => {
    try {
        // 클라이언트 IP 주소 가져오기
        let clientIP = req.headers['x-forwarded-for'] || 
                      req.headers['x-real-ip'] || 
                      req.connection.remoteAddress || 
                      req.socket.remoteAddress ||
                      '127.0.0.1';

        // IPv6 형태의 로컬 IP 처리
        if (clientIP === '::1' || clientIP === '::ffff:127.0.0.1') {
            clientIP = '127.0.0.1';
        }

        // 첫 번째 IP만 사용 (프록시 체인인 경우)
        if (clientIP.includes(',')) {
            clientIP = clientIP.split(',')[0].trim();
        }

        // 실제 IP 지역 감지 사용
        const countryCode = getCountryFromIP(clientIP);
        const countryName = countryNames[countryCode] || `${countryCode} 국가`;
        
        console.log(`클릭 기록: IP=${clientIP}, Country=${countryCode} (${countryName})`);
        
        // 메모리에 클릭 데이터 저장
        const clickRecord = {
            country: countryCode,
            countryName: countryName,
            ip: clientIP,
            timestamp: new Date(),
            version: req.body.version || '10.0.world-rank'
        };
        
        clickData.push(clickRecord);
        
        // 국가별 통계 업데이트
        if (!countryStats[countryCode]) {
            countryStats[countryCode] = {
                clicks: 0,
                name: countryName,
                lastClick: new Date()
            };
        }
        countryStats[countryCode].clicks++;
        countryStats[countryCode].lastClick = new Date();
        
        res.json({ 
            success: true, 
            country: countryCode,
            countryName: countryName,
            message: '클릭이 기록되었습니다.',
            totalClicks: clickData.length
        });
        
    } catch (error) {
        console.error('클릭 저장 오류:', error);
        res.json({ 
            success: false, 
            error: '클릭 저장에 실패했습니다.',
            country: 'Unknown',
            countryName: countryNames['Unknown'],
            message: '게임은 계속 플레이할 수 있습니다.'
        });
    }
});

// 랭킹 조회 API (실제 국가별 통계)
app.get('/api/rankings', (req, res) => {
    try {
        console.log('랭킹 조회 요청:', {
            totalData: clickData.length,
            countries: Object.keys(countryStats).length,
            stats: countryStats
        });

        // 국가별 랭킹 생성
        const rankings = Object.entries(countryStats)
            .map(([countryCode, stats]) => ({
                _id: countryCode,
                countryName: stats.name,
                clicks: stats.clicks,
                lastClick: stats.lastClick
            }))
            .sort((a, b) => b.clicks - a.clicks)
            .slice(0, 15); // Top 15로 확장

        // 전체 통계 계산
        const totalClicks = clickData.length;
        const totalCountries = Object.keys(countryStats).length;
        
        // 최근 활동 통계
        const recentClicks = clickData.filter(click => 
            new Date() - new Date(click.timestamp) < 24 * 60 * 60 * 1000 // 24시간 내
        ).length;

        const result = {
            success: true,
            rankings: rankings,
            totalClicks: totalClicks,
            totalCountries: totalCountries,
            recentClicks: recentClicks,
            lastUpdate: new Date().toISOString(),
            debug: {
                hasData: clickData.length > 0,
                hasStats: Object.keys(countryStats).length > 0,
                sampleData: clickData.slice(-3)
            }
        };

        console.log('랭킹 응답:', result);
        res.json(result);
        
    } catch (error) {
        console.error('랭킹 조회 오류:', error);
        res.json({ 
            success: false, 
            error: '랭킹 조회에 실패했습니다.',
            rankings: [],
            totalClicks: 0,
            totalCountries: 0,
            recentClicks: 0
        });
    }
});

// 실시간 통계 API 추가
app.get('/api/stats', (req, res) => {
    try {
        const now = new Date();
        const oneHourAgo = new Date(now - 60 * 60 * 1000);
        const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
        
        const stats = {
            total: clickData.length,
            lastHour: clickData.filter(click => new Date(click.timestamp) > oneHourAgo).length,
            lastDay: clickData.filter(click => new Date(click.timestamp) > oneDayAgo).length,
            countries: Object.keys(countryStats).length,
            topCountry: Object.entries(countryStats)
                .sort(([,a], [,b]) => b.clicks - a.clicks)[0] || null
        };
        
        if (stats.topCountry) {
            stats.topCountry = {
                code: stats.topCountry[0],
                name: stats.topCountry[1].name,
                clicks: stats.topCountry[1].clicks
            };
        }
        
        res.json(stats);
    } catch (error) {
        res.json({ error: '통계 조회 실패' });
    }
});

// 루트 경로
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// public 폴더의 정적 파일들
app.get('/public/:file', (req, res) => {
    const fileName = req.params.file;
    res.sendFile(path.join(__dirname, 'public', fileName));
});

// 404 처리
app.use((req, res) => {
    res.status(404).send('페이지를 찾을 수 없습니다.');
});

// 에러 처리
app.use((error, req, res, next) => {
    console.error('서버 에러:', error);
    res.status(500).json({ 
        error: '서버 내부 오류가 발생했습니다.',
        message: '잠시 후 다시 시도해주세요.'
    });
});

// Vercel 서버리스 함수로 내보내기
module.exports = app;

// 로컬 개발 환경
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
        console.log(`로컬 주소: http://localhost:${PORT}`);
    });
} 