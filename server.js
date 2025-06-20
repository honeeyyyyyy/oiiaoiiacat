const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// 간단한 메모리 저장소 (임시)
let clickData = [];
let countryStats = {};

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

// 헬스 체크 엔드포인트
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        version: '9.0.final.simple',
        totalClicks: clickData.length,
        timestamp: new Date().toISOString()
    });
});

// 클릭 기록 API (메모리 저장)
app.post('/api/click', async (req, res) => {
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

        // 간단한 국가 매핑 (geoip-lite 없이)
        const country = getCountryFromIP(clientIP);
        
        console.log(`클릭 기록: IP=${clientIP}, Country=${country}`);
        
        // 메모리에 클릭 데이터 저장
        const clickRecord = {
            country: country,
            ip: clientIP,
            timestamp: new Date(),
            version: req.body.version || '9.0.final'
        };
        
        clickData.push(clickRecord);
        
        // 국가별 통계 업데이트
        if (!countryStats[country]) {
            countryStats[country] = 0;
        }
        countryStats[country]++;
        
        res.json({ 
            success: true, 
            country: country,
            message: '클릭이 기록되었습니다.',
            totalClicks: clickData.length
        });
        
    } catch (error) {
        console.error('클릭 저장 오류:', error);
        res.json({ 
            success: false, 
            error: '클릭 저장에 실패했습니다.',
            country: 'Unknown',
            message: '게임은 계속 플레이할 수 있습니다.'
        });
    }
});

// 랭킹 조회 API (메모리 기반)
app.get('/api/rankings', async (req, res) => {
    try {
        // 국가별 랭킹 생성
        const rankings = Object.entries(countryStats)
            .map(([country, clicks]) => ({
                _id: country,
                clicks: clicks
            }))
            .sort((a, b) => b.clicks - a.clicks)
            .slice(0, 10);

        res.json({
            success: true,
            rankings: rankings,
            totalClicks: clickData.length,
            totalCountries: Object.keys(countryStats).length
        });
        
    } catch (error) {
        console.error('랭킹 조회 오류:', error);
        res.json({ 
            success: false, 
            error: '랭킹 조회에 실패했습니다.',
            rankings: [],
            totalClicks: 0,
            totalCountries: 0
        });
    }
});

// 간단한 국가 매핑 함수
function getCountryFromIP(ip) {
    // 로컬 IP 처리
    if (ip === '127.0.0.1' || ip.includes('localhost') || ip.includes('192.168') || ip.includes('10.0')) {
        return 'Local';
    }
    
    // Vercel 환경에서는 실제 IP가 전달되므로 기본값 설정
    // 실제로는 geoip-lite나 다른 서비스를 사용해야 하지만, 일단 간단하게 처리
    const ipParts = ip.split('.');
    if (ipParts.length === 4) {
        const firstOctet = parseInt(ipParts[0]);
        
        // 간단한 지역 매핑 (실제로는 정확하지 않음)
        if (firstOctet >= 1 && firstOctet <= 50) return 'KR'; // 한국 (임시)
        if (firstOctet >= 51 && firstOctet <= 100) return 'US'; // 미국 (임시)
        if (firstOctet >= 101 && firstOctet <= 150) return 'JP'; // 일본 (임시)
        if (firstOctet >= 151 && firstOctet <= 200) return 'CN'; // 중국 (임시)
        if (firstOctet >= 201 && firstOctet <= 255) return 'GB'; // 영국 (임시)
    }
    
    return 'Unknown';
}

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