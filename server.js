const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// 국가별 클릭 데이터 저장소 (메모리 기반)
let countryClicks = {};
let totalClicks = 0;

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
        // 실제 클라이언트 IP 가져오기
        const clientIP = req.headers['x-forwarded-for'] || 
                        req.headers['x-real-ip'] || 
                        req.connection.remoteAddress || 
                        req.socket.remoteAddress ||
                        (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
                        req.ip;
        
        console.log(`Click from IP: ${clientIP}`);
        
        // IP에서 국가 코드 가져오기
        const countryCode = await getCountryFromIP(clientIP);
        
        // 클릭 수 증가
        if (!countryClicks[countryCode]) {
            countryClicks[countryCode] = 0;
        }
        countryClicks[countryCode]++;
        totalClicks++;
        
        console.log(`Click recorded: ${countryCode} (${countryClicks[countryCode]} total)`);
        
        res.json({
            success: true,
            country: countryCode,
            countryName: countryNames[countryCode] || countryCode,
            countryFlag: countryFlags[countryCode] || '🏳',
            clicks: countryClicks[countryCode],
            totalClicks: totalClicks
        });
    } catch (error) {
        console.error('Click processing error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process click'
        });
    }
});

// 랭킹 조회 API
app.get('/api/ranking', (req, res) => {
    try {
        // 국가별 클릭 수를 배열로 변환하고 정렬
        const rankings = Object.entries(countryClicks)
            .map(([countryCode, clicks]) => ({
                country: countryCode,
                countryName: countryNames[countryCode] || countryCode,
                countryFlag: countryFlags[countryCode] || '🏳',
                clicks: clicks
            }))
            .sort((a, b) => b.clicks - a.clicks)
            .slice(0, 10); // 상위 10개국만
        
        const participatingCountries = Object.keys(countryClicks).length;
        
        res.json({
            success: true,
            totalClicks: totalClicks,
            participatingCountries: participatingCountries,
            rankings: rankings
        });
    } catch (error) {
        console.error('Ranking fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch rankings'
        });
    }
});

// 메인 페이지 제공
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 서버 시작
app.listen(PORT, () => {
    console.log(`🚀 OIIA OIIA CAT Server running on port ${PORT}`);
    console.log(`🌍 Country ranking system active`);
    console.log(`📊 Total clicks: ${totalClicks}`);
    console.log(`🏆 Countries participating: ${Object.keys(countryClicks).length}`);
});

// 프로세스 종료 시 정리
process.on('SIGTERM', () => {
    console.log('Server shutting down...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('Server shutting down...');
    process.exit(0);
}); 