const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// 간단한 메모리 저장소
let clickData = [];
let countryStats = {};

// 국가 이름 매핑
const countryNames = {
    'KR': '🇰🇷 대한민국',
    'US': '🇺🇸 미국', 
    'JP': '🇯🇵 일본',
    'CN': '🇨🇳 중국',
    'GB': '🇬🇧 영국',
    'DE': '🇩🇪 독일',
    'FR': '🇫🇷 프랑스',
    'CA': '🇨🇦 캐나다',
    'Local': '🏠 로컬',
    'Unknown': '❓ 알 수 없음'
};

// 미들웨어
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 캐시 방지
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

// 간단한 IP 국가 매핑
function getCountryFromIP(ip) {
    if (!ip || ip === '127.0.0.1' || ip.includes('localhost') || ip.includes('192.168')) {
        return 'Local';
    }
    
    const num = parseInt(ip.split('.')[0]) || 0;
    if (num <= 60) return 'KR';
    if (num <= 120) return 'US';
    if (num <= 140) return 'JP';
    if (num <= 160) return 'CN';
    if (num <= 180) return 'GB';
    if (num <= 200) return 'DE';
    if (num <= 220) return 'FR';
    return 'CA';
}

// 초기 테스트 데이터 강화
function initData() {
    console.log('초기 데이터 생성 시작...');
    const countries = ['KR', 'US', 'JP', 'CN', 'GB', 'DE', 'FR', 'CA'];
    
    countries.forEach((country, index) => {
        const clicks = Math.floor(Math.random() * 100) + 50; // 50-150 클릭
        
        countryStats[country] = {
            clicks: clicks,
            name: countryNames[country],
            lastClick: new Date()
        };
        
        // 클릭 데이터 생성
        for (let i = 0; i < clicks; i++) {
            clickData.push({
                country: country,
                countryName: countryNames[country],
                timestamp: new Date(Date.now() - Math.random() * 86400000), // 24시간 내 랜덤
                version: '11.0.popcat-style'
            });
        }
    });
    
    console.log('초기 데이터 생성 완료:', {
        totalClicks: clickData.length,
        totalCountries: Object.keys(countryStats).length,
        countries: Object.keys(countryStats)
    });
}

// 서버 시작 시 데이터 초기화
initData();

// API 엔드포인트들
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok',
        version: '11.0.popcat-style',
        totalClicks: clickData.length,
        totalCountries: Object.keys(countryStats).length
    });
});

app.post('/api/click', (req, res) => {
    try {
        const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || '127.0.0.1';
        const country = getCountryFromIP(ip.split(',')[0]);
        const countryName = countryNames[country];
        
        // 데이터 저장
        clickData.push({
            country: country,
            countryName: countryName,
            timestamp: new Date()
        });
        
        if (!countryStats[country]) {
            countryStats[country] = { clicks: 0, name: countryName, lastClick: new Date() };
        }
        countryStats[country].clicks++;
        countryStats[country].lastClick = new Date();
        
        res.json({
            success: true,
            country: country,
            countryName: countryName,
            totalClicks: clickData.length
        });
    } catch (error) {
        res.json({
            success: false,
            country: 'Unknown',
            countryName: countryNames['Unknown']
        });
    }
});

app.get('/api/rankings', (req, res) => {
    try {
        console.log('랭킹 API 호출됨');
        console.log('현재 countryStats:', countryStats);
        console.log('총 클릭 데이터:', clickData.length);
        
        const rankings = Object.entries(countryStats)
            .map(([code, stats]) => ({
                _id: code,
                countryName: stats.name,
                clicks: stats.clicks
            }))
            .sort((a, b) => b.clicks - a.clicks)
            .slice(0, 10);

        const result = {
            success: true,
            rankings: rankings,
            totalClicks: clickData.length,
            totalCountries: Object.keys(countryStats).length,
            recentClicks: clickData.filter(c => new Date() - new Date(c.timestamp) < 86400000).length,
            debug: {
                hasData: clickData.length > 0,
                hasStats: Object.keys(countryStats).length > 0,
                timestamp: new Date().toISOString()
            }
        };
        
        console.log('랭킹 응답:', result);
        res.json(result);
    } catch (error) {
        console.error('랭킹 API 에러:', error);
        res.json({
            success: false,
            rankings: [],
            totalClicks: 0,
            totalCountries: 0,
            recentClicks: 0,
            error: error.message
        });
    }
});

app.get('/api/stats', (req, res) => {
    try {
        const topCountry = Object.entries(countryStats)
            .sort(([,a], [,b]) => b.clicks - a.clicks)[0];
        
        res.json({
            total: clickData.length,
            countries: Object.keys(countryStats).length,
            topCountry: topCountry ? {
                code: topCountry[0],
                name: topCountry[1].name,
                clicks: topCountry[1].clicks
            } : null
        });
    } catch (error) {
        res.json({ error: '통계 조회 실패' });
    }
});

// 정적 파일 서빙
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// public 폴더의 파일들
app.get('/public/:file', (req, res) => {
    const fileName = req.params.file;
    res.sendFile(path.join(__dirname, 'public', fileName));
});

// 404 처리
app.use((req, res) => {
    res.status(404).send('페이지를 찾을 수 없습니다.');
});

// Vercel 서버리스 함수로 내보내기
module.exports = app;

// 로컬 개발용
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
    });
} 