const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// CORS 설정
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.static('.'));

// 메모리 기반 데이터 저장소
let countryData = {};
let totalClicks = 0;

// 간단한 IP 기반 국가 매핑 (테스트용)
const ipToCountry = {
    '127.0.0.1': '대한민국',
    'localhost': '대한민국'
};

// 기본 국가 목록
const defaultCountries = [
    '대한민국', '미국', '일본', '중국', '독일', 
    '프랑스', '영국', '캐나다', '호주', '브라질',
    '인도', '러시아', '이탈리아', '스페인', '네덜란드'
];

// 초기 데이터 설정
defaultCountries.forEach(country => {
    countryData[country] = Math.floor(Math.random() * 1000);
    totalClicks += countryData[country];
});

// IP에서 국가 추출
function getCountryFromIP(ip) {
    // 로컬 IP나 알려진 IP는 매핑 사용
    if (ipToCountry[ip]) {
        return ipToCountry[ip];
    }
    
    // 기본적으로 대한민국 반환 (실제 환경에서는 IP API 사용)
    return '대한민국';
}

// HTML 파일 직접 서빙
app.get('/', (req, res) => {
    const htmlContent = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>OIIA OIIA CAT - 에셀이와 함께하는 고양이 돌리기 게임</title>
    
    <!-- SEO Meta Tags -->
    <meta name="description" content="OIIA OIIA CAT - 시각장애 고양이 Ethel의 감동적인 이야기를 담은 고양이 돌리기 게임. 전 세계 플레이어들과 함께하는 재미있는 클릭 게임으로 동물 보호의 의미도 담고 있습니다.">
    <meta name="keywords" content="고양이 게임, OIIA CAT, 고양이 돌리기, spinning cat, OIIA OIIA, 오이야 고양이, Ethel, 시각장애 고양이, 동물 보호, 클릭 게임, 웹 게임, 무료 게임">
    <meta name="author" content="OIIA OIIA CAT Team">
    
    <!-- Open Graph Meta Tags -->
    <meta property="og:title" content="OIIA OIIA CAT - 에셀이와 함께하는 고양이 돌리기 게임">
    <meta property="og:description" content="시각장애를 가진 특별한 고양이 Ethel의 이야기를 담은 따뜻한 클릭 게임. 전 세계 플레이어들과 순위를 경쟁하며 동물 보호의 의미를 되새겨보세요.">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://oiiaoiiacat.com">
    
    <!-- Favicon -->
    <link rel="icon" type="image/png" href="/cat-static.gif">
    
    <!-- Google Analytics -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-H65QPY6YZ5"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-H65QPY6YZ5');
    </script>
    
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Fredoka One', 'Arial', sans-serif;
        }

        body {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background-color: #ffffff;
            user-select: none;
            overflow: hidden;
            position: relative;
        }

        .container {
            width: 100vw;
            height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            position: relative;
        }

        .score-container {
            font-size: 3rem;
            color: #333;
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 100;
            background: rgba(255, 255, 255, 0.9);
            padding: 10px 30px;
            border-radius: 20px;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
        }

        .cat-container {
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            position: relative;
            cursor: pointer;
        }

        .cat {
            position: absolute;
            width: auto;
            height: 80vh;
            max-width: none;
            object-fit: contain;
            opacity: 0;
            display: none;
            mix-blend-mode: multiply;
        }

        #cat-static { 
            transform: scale(0.9); 
        }
        
        #cat-spin { 
            transform: scale(1.2); 
        }

        .cat.active {
            opacity: 1;
            display: block;
        }

        .info {
            font-size: 1.5rem;
            color: #333;
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(255, 255, 255, 0.9);
            padding: 10px 20px;
            border-radius: 15px;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
            z-index: 100;
        }

        /* 토글 가능한 랭킹 시스템 */
        .rankings {
            position: fixed !important;
            bottom: 0 !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            background: rgba(255, 255, 255, 0.95) !important;
            border-radius: 20px 20px 0 0 !important;
            box-shadow: 0 -4px 15px rgba(0, 0, 0, 0.1) !important;
            padding: 0 !important;
            max-height: 70vh !important;
            overflow: hidden !important;
            z-index: 100 !important;
            min-width: 320px !important;
            max-width: 90vw !important;
            display: block !important;
            transition: all 0.3s ease !important;
        }

        .rankings.collapsed {
            max-height: 60px !important;
        }

        .ranking-toggle {
            background: linear-gradient(135deg, #FF6B9D, #e55a8a);
            color: white;
            padding: 15px 20px;
            cursor: pointer;
            border-radius: 20px 20px 0 0;
            text-align: center;
            font-weight: bold;
            user-select: none;
            transition: all 0.3s ease;
            border: none;
            width: 100%;
        }

        .ranking-toggle:hover {
            background: linear-gradient(135deg, #e55a8a, #d44b7a);
        }

        .ranking-content {
            padding: 20px;
            max-height: calc(70vh - 60px);
            overflow-y: auto;
            transition: all 0.3s ease;
        }

        .rankings.collapsed .ranking-content {
            display: none;
        }

        .ranking-stats {
            display: flex;
            justify-content: space-around;
            margin-bottom: 20px;
            background: #f8f9fa;
            padding: 15px;
            border-radius: 10px;
        }

        .stat-item {
            text-align: center;
        }

        .stat-number {
            font-size: 1.8rem;
            font-weight: bold;
            color: #FF6B9D;
            display: block;
        }

        .stat-label {
            font-size: 0.9rem;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .leaderboard {
            background: #f8f9fa;
            border-radius: 10px;
            overflow: hidden;
        }

        .leaderboard-header {
            display: grid;
            grid-template-columns: 60px 1fr 120px;
            background: #FF6B9D;
            color: white;
            padding: 10px;
            font-weight: bold;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .leaderboard-row {
            display: grid;
            grid-template-columns: 60px 1fr 120px;
            padding: 12px 10px;
            border-bottom: 1px solid #dee2e6;
            transition: background 0.3s ease;
        }

        .leaderboard-row:hover {
            background: #e9ecef;
        }

        .leaderboard-row:last-child {
            border-bottom: none;
        }

        .rank {
            font-weight: bold;
            color: #FF6B9D;
            text-align: center;
        }

        .country {
            color: #333;
            text-align: left;
        }

        .clicks {
            color: #FF6B9D;
            text-align: right;
            font-weight: bold;
        }

        .loading {
            text-align: center;
            color: #666;
            padding: 20px;
            font-style: italic;
        }

        /* 푸터 */
        .footer {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 999;
        }

        .footer a {
            color: rgba(0,0,0,0.5);
            text-decoration: none;
            margin: 0 10px;
            font-size: 0.9rem;
            transition: color 0.3s ease;
        }

        .footer a:hover {
            color: #FF6B9D;
        }

        /* 모바일 최적화 */
        @media (max-width: 768px) {
            .cat {
                height: 70vh;
            }

            .score-container {
                font-size: 2rem;
                padding: 8px 20px;
            }

            .info {
                font-size: 1.2rem;
                padding: 8px 15px;
            }

            .rankings {
                min-width: 280px !important;
                left: 10px !important;
                right: 10px !important;
                transform: none !important;
                max-width: none !important;
            }

            .ranking-stats {
                flex-direction: column;
                gap: 10px;
            }

            .leaderboard-header,
            .leaderboard-row {
                grid-template-columns: 50px 1fr 100px;
                font-size: 0.8rem;
            }
        }

        /* 버전 표시 */
        .version {
            position: fixed;
            top: 10px;
            right: 10px;
            color: rgba(0,0,0,0.3);
            font-size: 0.8rem;
            z-index: 999;
        }
    </style>
</head>
<body>
    <div class="version">v2.0 SERVER</div>
    
    <div class="container">
        <div class="score-container">
            클릭 수: <span id="clickCount">0</span>
        </div>
        
        <div class="cat-container" onclick="handleCatClick()">
            <img id="cat-static" class="cat active" src="/cat-static.gif" alt="OIIA OIIA CAT">
            <img id="cat-spin" class="cat" src="/cat-spin.gif" alt="OIIA OIIA CAT Spinning">
        </div>
        
        <div class="info">
            스페이스바 또는 클릭으로 고양이를 돌려보세요!
        </div>
    </div>

    <!-- 랭킹 시스템 -->
    <div class="rankings collapsed" id="rankings">
        <div class="ranking-toggle" onclick="toggleRankings()">
            🌍 전세계 랭킹 보기 ↑
        </div>
        
        <div class="ranking-content">
            <div class="ranking-stats">
                <div class="stat-item">
                    <span class="stat-number" id="totalClicks">0</span>
                    <span class="stat-label">전세계 클릭</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number" id="totalCountries">0</span>
                    <span class="stat-label">참여 국가</span>
                </div>
            </div>
            
            <div class="leaderboard">
                <div class="leaderboard-header">
                    <div>순위</div>
                    <div>국가</div>
                    <div>클릭 수</div>
                </div>
                <div id="leaderboardContent">
                    <div class="loading">랭킹을 불러오는 중...</div>
                </div>
            </div>
        </div>
    </div>

    <div class="footer">
        <a href="/terms.html">이용약관</a> | 
        <a href="/privacy.html">개인정보처리방침</a>
    </div>

    <!-- Audio -->
    <audio id="spinSound" preload="auto">
        <source src="/spin.mp3" type="audio/mpeg">
    </audio>

    <script>
        let clickCount = 0;
        let isSpinning = false;
        let rankingVisible = false;
        
        const catStatic = document.getElementById('cat-static');
        const catSpin = document.getElementById('cat-spin');
        const clickCountElement = document.getElementById('clickCount');
        const spinSound = document.getElementById('spinSound');
        
        // 고양이 클릭 처리
        function handleCatClick() {
            if (isSpinning) return;
            
            clickCount++;
            clickCountElement.textContent = clickCount;
            
            // 고양이 이미지 변경 및 소리 재생
            catStatic.classList.remove('active');
            catSpin.classList.add('active');
            isSpinning = true;
            
            // 소리 재생 (오류 무시)
            try {
                spinSound.currentTime = 0;
                spinSound.play().catch(() => {});
            } catch (e) {}
            
            // 서버에 클릭 전송
            sendClickToServer();
            
            // 1초 후 정적 이미지로 복원
            setTimeout(() => {
                catSpin.classList.remove('active');
                catStatic.classList.add('active');
                isSpinning = false;
            }, 1000);
        }
        
        // 서버에 클릭 데이터 전송
        async function sendClickToServer() {
            try {
                const response = await fetch('/api/click', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        timestamp: new Date().toISOString()
                    })
                });
                
                const data = await response.json();
                if (data.success) {
                    console.log('Click recorded for ' + data.countryName + ': ' + data.clicks + ' total');
                    
                    // 랭킹이 열려있으면 업데이트
                    if (rankingVisible) {
                        loadRankings();
                    }
                } else {
                    console.error('Failed to record click:', data.error);
                }
            } catch (error) {
                console.error('Error sending click:', error);
            }
        }
        
        // 랭킹 토글
        function toggleRankings() {
            const rankings = document.getElementById('rankings');
            const toggle = document.querySelector('.ranking-toggle');
            
            rankingVisible = !rankings.classList.contains('collapsed');
            
            if (rankings.classList.contains('collapsed')) {
                rankings.classList.remove('collapsed');
                toggle.textContent = '🌍 전세계 랭킹 숨기기 ↓';
                rankingVisible = true;
                loadRankings();
            } else {
                rankings.classList.add('collapsed');
                toggle.textContent = '🌍 전세계 랭킹 보기 ↑';
                rankingVisible = false;
            }
        }
        
        // 랭킹 데이터 로드
        async function loadRankings() {
            try {
                const response = await fetch('/api/ranking');
                const data = await response.json();
                
                if (data.success) {
                    // 전체 통계 업데이트
                    document.getElementById('totalClicks').textContent = data.totalClicks.toLocaleString();
                    document.getElementById('totalCountries').textContent = data.participatingCountries;
                    
                    // 리더보드 업데이트
                    const leaderboardContent = document.getElementById('leaderboardContent');
                    
                    if (data.rankings && data.rankings.length > 0) {
                        leaderboardContent.innerHTML = data.rankings.map((country, index) => 
                            '<div class="leaderboard-row">' +
                                '<div class="rank">#' + (index + 1) + '</div>' +
                                '<div class="country">' + country.countryName + '</div>' +
                                '<div class="clicks">' + country.clicks.toLocaleString() + '</div>' +
                            '</div>'
                        ).join('');
                    } else {
                        leaderboardContent.innerHTML = '<div class="loading">아직 데이터가 없습니다...</div>';
                    }
                } else {
                    console.error('Failed to load rankings:', data.error);
                    document.getElementById('leaderboardContent').innerHTML = '<div class="loading">랭킹을 불러올 수 없습니다</div>';
                }
            } catch (error) {
                console.error('Error loading rankings:', error);
                document.getElementById('leaderboardContent').innerHTML = '<div class="loading">랭킹 로딩 중 오류 발생</div>';
            }
        }
        
        // 키보드 이벤트 (스페이스바)
        document.addEventListener('keydown', (event) => {
            if (event.code === 'Space') {
                event.preventDefault();
                handleCatClick();
            }
        });
        
        // 페이지 로드 시 초기화
        document.addEventListener('DOMContentLoaded', () => {
            console.log('OIIA OIIA CAT v2.0 SERVER loaded!');
        });
        
        // 자동 랭킹 업데이트 (30초마다)
        setInterval(() => {
            if (rankingVisible) {
                loadRankings();
            }
        }, 30000);
    </script>
</body>
</html>`;
    
    res.send(htmlContent);
});

// 클릭 API
app.post('/api/click', (req, res) => {
    try {
        const clientIP = req.headers['x-forwarded-for'] || 
                        req.headers['x-real-ip'] || 
                        req.connection.remoteAddress || 
                        req.socket.remoteAddress ||
                        '127.0.0.1';
        
        const country = getCountryFromIP(clientIP);
        
        // 국가별 클릭 수 증가
        if (!countryData[country]) {
            countryData[country] = 0;
        }
        countryData[country]++;
        totalClicks++;
        
        console.log(`Click from ${clientIP} (${country}): ${countryData[country]} total clicks`);
        
        res.json({
            success: true,
            countryName: country,
            clicks: countryData[country],
            totalClicks: totalClicks
        });
    } catch (error) {
        console.error('Error processing click:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process click'
        });
    }
});

// 랭킹 API
app.get('/api/ranking', (req, res) => {
    try {
        // 국가별 데이터를 배열로 변환하고 클릭 수로 정렬
        const rankings = Object.keys(countryData)
            .map(country => ({
                countryName: country,
                clicks: countryData[country]
            }))
            .sort((a, b) => b.clicks - a.clicks)
            .slice(0, 10); // 상위 10개국만
        
        res.json({
            success: true,
            rankings: rankings,
            totalClicks: totalClicks,
            participatingCountries: Object.keys(countryData).length
        });
    } catch (error) {
        console.error('Error getting rankings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get rankings'
        });
    }
});

// 정적 파일 서빙
app.get('/cat-static.gif', (req, res) => {
    res.sendFile(path.join(__dirname, 'cat-static.gif'));
});

app.get('/cat-spin.gif', (req, res) => {
    res.sendFile(path.join(__dirname, 'cat-spin.gif'));
});

app.get('/spin.mp3', (req, res) => {
    res.sendFile(path.join(__dirname, 'spin.mp3'));
});

app.get('/terms.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'terms.html'));
});

app.get('/privacy.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'privacy.html'));
});

// 서버 시작
app.listen(port, () => {
    console.log(`OIIA OIIA CAT Server running on port ${port}`);
    console.log(`Initial total clicks: ${totalClicks}`);
    console.log(`Countries: ${Object.keys(countryData).length}`);
});

module.exports = app; 