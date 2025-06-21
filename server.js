const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// 데이터 파일 경로
const DATA_FILE = path.join(__dirname, 'ranking_data.json');

// 국가별 클릭 데이터 저장소 (파일 백업 포함)
let countryClicks = {};
let totalClicks = 0;
let lastSaveTime = Date.now();

// 클릭 처리를 위한 뮤텍스 (동시성 제어)
let isProcessingClick = false;
const clickQueue = [];

// 안전한 클릭 처리 함수
async function processClick(countryCode) {
    return new Promise((resolve) => {
        clickQueue.push({ countryCode, resolve });
        processClickQueue();
    });
}

async function processClickQueue() {
    if (isProcessingClick || clickQueue.length === 0) return;
    
    isProcessingClick = true;
    
    try {
        while (clickQueue.length > 0) {
            const { countryCode, resolve } = clickQueue.shift();
            
            // 데이터 검증 및 증가
            if (!countryClicks[countryCode]) {
                countryClicks[countryCode] = 0;
            }
            
            // 안전한 증가 (숫자 타입 확인)
            if (typeof countryClicks[countryCode] !== 'number') {
                countryClicks[countryCode] = 0;
            }
            
            countryClicks[countryCode]++;
            totalClicks++;
            
            resolve({
                countryClicks: countryClicks[countryCode],
                totalClicks: totalClicks
            });
        }
        
        // 변경사항 저장 (비동기로 처리하여 응답 속도 향상)
        setImmediate(() => saveData());
        
    } finally {
        isProcessingClick = false;
    }
}

// 데이터 로드 함수
async function loadData() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        const parsed = JSON.parse(data);
        
        // 데이터 검증
        if (parsed && typeof parsed === 'object') {
            countryClicks = parsed.countryClicks || {};
            totalClicks = parsed.totalClicks || 0;
            
            // 데이터 무결성 검증
            let calculatedTotal = 0;
            for (const country in countryClicks) {
                if (typeof countryClicks[country] !== 'number' || countryClicks[country] < 0) {
                    countryClicks[country] = 0;
                }
                calculatedTotal += countryClicks[country];
            }
            
            // 총합이 맞지 않으면 재계산
            if (totalClicks !== calculatedTotal) {
                console.log(`Total clicks mismatch: stored ${totalClicks}, calculated ${calculatedTotal}. Fixing...`);
                totalClicks = calculatedTotal;
                await saveData();
            }
            
            console.log(`✅ Data loaded: ${totalClicks} total clicks, ${Object.keys(countryClicks).length} countries`);
        }
    } catch (error) {
        console.log('📁 No existing data file found, starting fresh');
        countryClicks = {};
        totalClicks = 0;
        await saveData();
    }
}

// 데이터 저장 함수 (안전한 저장)
async function saveData() {
    try {
        const data = {
            countryClicks: countryClicks,
            totalClicks: totalClicks,
            lastUpdate: new Date().toISOString(),
            dataVersion: '1.0'
        };
        
        // 임시 파일에 먼저 저장 후 원본으로 이동 (원자적 쓰기)
        const tempFile = DATA_FILE + '.tmp';
        await fs.writeFile(tempFile, JSON.stringify(data, null, 2));
        await fs.rename(tempFile, DATA_FILE);
        
        lastSaveTime = Date.now();
        console.log(`💾 Data saved: ${totalClicks} total clicks`);
    } catch (error) {
        console.error('❌ Failed to save data:', error);
    }
}

// 정기적 데이터 저장 (5초마다)
setInterval(async () => {
    if (Date.now() - lastSaveTime > 5000) {
        await saveData();
    }
}, 5000);

// 국가 코드를 한국어 이름으로 변환하는 매핑
const countryNames = {
    'KR': '대한민국',
    'US': '미국',
    'JP': '일본',
    'CN': '중국',
    'GB': '영국',
    'DE': '독일',
    'FR': '프랑스',
    'CA': '캐나다',
    'AU': '호주',
    'BR': '브라질',
    'IN': '인도',
    'RU': '러시아',
    'IT': '이탈리아',
    'ES': '스페인',
    'NL': '네덜란드',
    'SE': '스웨덴',
    'NO': '노르웨이',
    'DK': '덴마크',
    'FI': '핀란드',
    'PL': '폴란드',
    'TR': '터키',
    'TH': '태국',
    'VN': '베트남',
    'SG': '싱가포르',
    'MY': '말레이시아',
    'ID': '인도네시아',
    'PH': '필리핀',
    'TW': '대만',
    'HK': '홍콩',
    'MX': '멕시코',
    'AR': '아르헨티나',
    'CL': '칠레',
    'CO': '콜롬비아',
    'PE': '페루',
    'ZA': '남아프리카공화국',
    'EG': '이집트',
    'IL': '이스라엘',
    'AE': '아랍에미리트',
    'SA': '사우디아라비아',
    'IR': '이란',
    'PK': '파키스탄',
    'BD': '방글라데시',
    'LK': '스리랑카',
    'NP': '네팔',
    'MM': '미얀마',
    'KH': '캄보디아',
    'LA': '라오스',
    'BN': '브루나이',
    'MN': '몽골',
    'KZ': '카자흐스탄',
    'UZ': '우즈베키스탄',
    'KG': '키르기스스탄',
    'TJ': '타지키스탄',
    'TM': '투르크메니스탄',
    'AF': '아프가니스탄',
    'IQ': '이라크',
    'SY': '시리아',
    'JO': '요르단',
    'LB': '레바논',
    'YE': '예멘',
    'OM': '오만',
    'QA': '카타르',
    'KW': '쿠웨이트',
    'BH': '바레인',
    'GE': '조지아',
    'AM': '아르메니아',
    'AZ': '아제르바이잔',
    'BY': '벨라루스',
    'UA': '우크라이나',
    'MD': '몰도바',
    'RO': '루마니아',
    'BG': '불가리아',
    'GR': '그리스',
    'CY': '키프로스',
    'MT': '몰타',
    'AL': '알바니아',
    'MK': '북마케도니아',
    'ME': '몬테네그로',
    'RS': '세르비아',
    'BA': '보스니아 헤르체고비나',
    'HR': '크로아티아',
    'SI': '슬로베니아',
    'SK': '슬로바키아',
    'CZ': '체코',
    'HU': '헝가리',
    'AT': '오스트리아',
    'CH': '스위스',
    'LI': '리히텐슈타인',
    'LU': '룩셈부르크',
    'BE': '벨기에',
    'PT': '포르투갈',
    'IE': '아일랜드',
    'IS': '아이슬란드',
    'EE': '에스토니아',
    'LV': '라트비아',
    'LT': '리투아니아'
};

// 국가 국기 이모지 매핑
const countryFlags = {
    'KR': '🇰🇷',
    'US': '🇺🇸',
    'JP': '🇯🇵',
    'CN': '🇨🇳',
    'GB': '🇬🇧',
    'DE': '🇩🇪',
    'FR': '🇫🇷',
    'CA': '🇨🇦',
    'AU': '🇦🇺',
    'BR': '🇧🇷',
    'IN': '🇮🇳',
    'RU': '🇷🇺',
    'IT': '🇮🇹',
    'ES': '🇪🇸',
    'NL': '🇳🇱',
    'SE': '🇸🇪',
    'NO': '🇳🇴',
    'DK': '🇩🇰',
    'FI': '🇫🇮',
    'PL': '🇵🇱',
    'TR': '🇹🇷',
    'TH': '🇹🇭',
    'VN': '🇻🇳',
    'SG': '🇸🇬',
    'MY': '🇲🇾',
    'ID': '🇮🇩',
    'PH': '🇵🇭',
    'TW': '🇹🇼',
    'HK': '🇭🇰',
    'MX': '🇲🇽',
    'AR': '🇦🇷',
    'CL': '🇨🇱',
    'CO': '🇨🇴',
    'PE': '🇵🇪',
    'ZA': '🇿🇦',
    'EG': '🇪🇬',
    'IL': '🇮🇱',
    'AE': '🇦🇪',
    'SA': '🇸🇦',
    'IR': '🇮🇷',
    'PK': '🇵🇰',
    'BD': '🇧🇩',
    'LK': '🇱🇰',
    'NP': '🇳🇵',
    'MM': '🇲🇲',
    'KH': '🇰🇭',
    'LA': '🇱🇦',
    'BN': '🇧🇳',
    'MN': '🇲🇳',
    'KZ': '🇰🇿',
    'UZ': '🇺🇿',
    'KG': '🇰🇬',
    'TJ': '🇹🇯',
    'TM': '🇹🇲',
    'AF': '🇦🇫',
    'IQ': '🇮🇶',
    'SY': '🇸🇾',
    'JO': '🇯🇴',
    'LB': '🇱🇧',
    'YE': '🇾🇪',
    'OM': '🇴🇲',
    'QA': '🇶🇦',
    'KW': '🇰🇼',
    'BH': '🇧🇭',
    'GE': '🇬🇪',
    'AM': '🇦🇲',
    'AZ': '🇦🇿',
    'BY': '🇧🇾',
    'UA': '🇺🇦',
    'MD': '🇲🇩',
    'RO': '🇷🇴',
    'BG': '🇧🇬',
    'GR': '🇬🇷',
    'CY': '🇨🇾',
    'MT': '🇲🇹',
    'AL': '🇦🇱',
    'MK': '🇲🇰',
    'ME': '🇲🇪',
    'RS': '🇷🇸',
    'BA': '🇧🇦',
    'HR': '🇭🇷',
    'SI': '🇸🇮',
    'SK': '🇸🇰',
    'CZ': '🇨🇿',
    'HU': '🇭🇺',
    'AT': '🇦🇹',
    'CH': '🇨🇭',
    'LI': '🇱🇮',
    'LU': '🇱🇺',
    'BE': '🇧🇪',
    'PT': '🇵🇹',
    'IE': '🇮🇪',
    'IS': '🇮🇸',
    'EE': '🇪🇪',
    'LV': '🇱🇻',
    'LT': '🇱🇹'
};

// 국가별 언어 매핑
const countryLanguages = {
    'KR': 'ko',
    'US': 'en',
    'JP': 'ja',
    'CN': 'zh',
    'GB': 'en',
    'DE': 'de',
    'FR': 'fr',
    'CA': 'en',
    'AU': 'en',
    'BR': 'pt',
    'IN': 'en',
    'RU': 'ru',
    'IT': 'it',
    'ES': 'es',
    'NL': 'nl',
    'SE': 'sv',
    'NO': 'no',
    'DK': 'da',
    'FI': 'fi',
    'PL': 'pl',
    'TR': 'tr',
    'TH': 'th',
    'VN': 'vi',
    'SG': 'en',
    'MY': 'ms',
    'ID': 'id',
    'PH': 'en',
    'TW': 'zh',
    'HK': 'zh',
    'MX': 'es',
    'AR': 'es',
    'CL': 'es',
    'CO': 'es',
    'PE': 'es',
    'ZA': 'en',
    'EG': 'ar',
    'IL': 'he',
    'AE': 'ar',
    'SA': 'ar',
    'IR': 'fa',
    'PK': 'ur',
    'BD': 'bn',
    'LK': 'si',
    'NP': 'ne',
    'MM': 'my',
    'KH': 'km',
    'LA': 'lo',
    'BN': 'ms',
    'MN': 'mn',
    'KZ': 'kk',
    'UZ': 'uz',
    'KG': 'ky',
    'TJ': 'tg',
    'TM': 'tk',
    'AF': 'ps',
    'IQ': 'ar',
    'SY': 'ar',
    'JO': 'ar',
    'LB': 'ar',
    'YE': 'ar',
    'OM': 'ar',
    'QA': 'ar',
    'KW': 'ar',
    'BH': 'ar',
    'GE': 'ka',
    'AM': 'hy',
    'AZ': 'az',
    'BY': 'be',
    'UA': 'uk',
    'MD': 'ro',
    'RO': 'ro',
    'BG': 'bg',
    'GR': 'el',
    'CY': 'el',
    'MT': 'mt',
    'AL': 'sq',
    'MK': 'mk',
    'ME': 'sr',
    'RS': 'sr',
    'BA': 'bs',
    'HR': 'hr',
    'SI': 'sl',
    'SK': 'sk',
    'CZ': 'cs',
    'HU': 'hu',
    'AT': 'de',
    'CH': 'de',
    'LI': 'de',
    'LU': 'fr',
    'BE': 'nl',
    'PT': 'pt',
    'IE': 'en',
    'IS': 'is',
    'EE': 'et',
    'LV': 'lv',
    'LT': 'lt'
};

// IP에서 국가 코드를 가져오는 함수 (여러 API 사용으로 안정성 확보)
async function getCountryFromIP(ip) {
    // 로컬 테스트를 위한 기본값
    if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
        return 'KR'; // 로컬 테스트시 한국으로 설정
    }

    const apis = [
        `http://ip-api.com/json/${ip}?fields=countryCode`,
        `https://ipapi.co/${ip}/country_code/`,
        `https://api.country.is/${ip}`
    ];

    for (const apiUrl of apis) {
        try {
            console.log(`Trying API: ${apiUrl}`);
            const response = await axios.get(apiUrl, { timeout: 5000 });
            
            let countryCode = null;
            
            if (apiUrl.includes('ip-api.com')) {
                countryCode = response.data.countryCode;
            } else if (apiUrl.includes('ipapi.co')) {
                countryCode = response.data;
            } else if (apiUrl.includes('country.is')) {
                countryCode = response.data.country;
            }
            
            if (countryCode && countryCode.length === 2) {
                console.log(`Country detected: ${countryCode} for IP: ${ip}`);
                return countryCode.toUpperCase();
            }
        } catch (error) {
            console.log(`API ${apiUrl} failed:`, error.message);
            continue;
        }
    }
    
    // 모든 API가 실패하면 기본값 반환
    console.log(`All APIs failed for IP: ${ip}, using default KR`);
    return 'KR';
}

// 클릭 처리 API
app.post('/api/click', async (req, res) => {
    try {
        // 요청 검증
        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({
                success: false,
                error: 'Invalid request body'
            });
        }

        // 실제 클라이언트 IP 가져오기 (더 안전한 방식)
        const clientIP = (
            req.headers['x-forwarded-for'] || 
            req.headers['x-real-ip'] || 
            req.connection?.remoteAddress || 
            req.socket?.remoteAddress ||
            req.ip ||
            'unknown'
        ).split(',')[0].trim();
        
        console.log(`📍 Click from IP: ${clientIP}`);
        
        // IP 검증
        if (!clientIP || clientIP === 'unknown') {
            console.log('⚠️ Invalid IP, using default country');
        }
        
        // IP에서 국가 코드 가져오기
        const countryCode = await getCountryFromIP(clientIP);
        
        // 국가 코드 검증
        if (!countryCode || typeof countryCode !== 'string' || countryCode.length !== 2) {
            throw new Error('Invalid country code received');
        }
        
        // 안전한 클릭 처리
        const result = await processClick(countryCode.toUpperCase());
        
        console.log(`✅ Click recorded: ${countryCode} (${result.countryClicks} total for country, ${result.totalClicks} global)`);
        
        // 응답 데이터 검증
        const responseData = {
            success: true,
            country: countryCode,
            countryName: countryNames[countryCode] || countryCode,
            countryFlag: countryFlags[countryCode] || '🏳',
            language: countryLanguages[countryCode] || 'en',
            clicks: result.countryClicks,
            totalClicks: result.totalClicks
        };
        
        res.json(responseData);
        
    } catch (error) {
        console.error('❌ Click processing error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process click',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// 랭킹 캐시 (성능 향상을 위해)
let rankingCache = null;
let rankingCacheTime = 0;
const CACHE_DURATION = 10000; // 10초 캐시

// 안전한 랭킹 계산 함수
function calculateRankings() {
    try {
        // 데이터 검증
        if (!countryClicks || typeof countryClicks !== 'object') {
            return [];
        }
        
        // 국가별 클릭 수를 배열로 변환하고 정렬
        const rankings = Object.entries(countryClicks)
            .filter(([countryCode, clicks]) => {
                // 유효한 데이터만 포함
                return countryCode && 
                       typeof countryCode === 'string' && 
                       countryCode.length === 2 &&
                       typeof clicks === 'number' && 
                       clicks >= 0;
            })
            .map(([countryCode, clicks]) => ({
                country: countryCode,
                countryName: countryNames[countryCode] || countryCode,
                countryFlag: countryFlags[countryCode] || '🏳',
                clicks: Math.floor(clicks) // 정수로 보장
            }))
            .sort((a, b) => b.clicks - a.clicks)
            .slice(0, 10); // 상위 10개국만
        
        return rankings;
    } catch (error) {
        console.error('❌ Error calculating rankings:', error);
        return [];
    }
}

// 랭킹 조회 API
app.get('/api/ranking', (req, res) => {
    try {
        // 캐시 확인
        const now = Date.now();
        if (rankingCache && (now - rankingCacheTime) < CACHE_DURATION) {
            return res.json(rankingCache);
        }
        
        // 데이터 무결성 검증
        let calculatedTotal = 0;
        const validCountries = {};
        
        for (const [country, clicks] of Object.entries(countryClicks)) {
            if (typeof clicks === 'number' && clicks >= 0) {
                validCountries[country] = Math.floor(clicks);
                calculatedTotal += validCountries[country];
            }
        }
        
        // 무결성 문제 발견 시 수정
        if (calculatedTotal !== totalClicks) {
            console.log(`🔧 Data integrity issue detected. Calculated: ${calculatedTotal}, Stored: ${totalClicks}. Fixing...`);
            countryClicks = validCountries;
            totalClicks = calculatedTotal;
            setImmediate(() => saveData());
        }
        
        const rankings = calculateRankings();
        const participatingCountries = Object.keys(countryClicks).length;
        
        // 응답 데이터 구성
        const responseData = {
            success: true,
            totalClicks: Math.floor(totalClicks),
            participatingCountries: Math.max(0, participatingCountries),
            rankings: rankings,
            lastUpdate: new Date().toISOString(),
            dataVersion: '1.0'
        };
        
        // 캐시 업데이트
        rankingCache = responseData;
        rankingCacheTime = now;
        
        res.json(responseData);
        
    } catch (error) {
        console.error('❌ Ranking fetch error:', error);
        
        // 오류 시 기본 응답
        res.status(500).json({
            success: false,
            error: 'Failed to fetch rankings',
            totalClicks: 0,
            participatingCountries: 0,
            rankings: [],
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// 메인 페이지 제공
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 서버 시작
async function startServer() {
    try {
        // 데이터 로드
        await loadData();
        
        app.listen(PORT, () => {
            console.log(`🚀 OIIA OIIA CAT Server running on port ${PORT}`);
            console.log(`🌍 Country ranking system active`);
            console.log(`📊 Total clicks: ${totalClicks}`);
            console.log(`🏆 Countries participating: ${Object.keys(countryClicks).length}`);
            console.log(`💾 Data persistence: Enabled`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// 안전한 서버 종료
async function gracefulShutdown() {
    console.log('🔄 Server shutting down gracefully...');
    
    try {
        // 마지막 데이터 저장
        await saveData();
        console.log('✅ Final data save completed');
        
        // 진행 중인 클릭 처리 완료 대기
        let waitCount = 0;
        while (isProcessingClick && waitCount < 50) { // 최대 5초 대기
            await new Promise(resolve => setTimeout(resolve, 100));
            waitCount++;
        }
        
        if (isProcessingClick) {
            console.log('⚠️ Some clicks may not have been processed');
        }
        
        console.log('👋 Server shutdown complete');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
    }
}

// 프로세스 종료 시 정리
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    gracefulShutdown();
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown();
});

// 서버 시작
startServer(); 