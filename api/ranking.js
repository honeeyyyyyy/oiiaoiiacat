// Vercel 서버리스 함수로 랭킹 조회
export default async function handler(req, res) {
    // CORS 헤더 추가
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        // 국가별 정보
        const countryInfo = {
            'KR': { name: '한국', flag: '🇰🇷' },
            'US': { name: '미국', flag: '🇺🇸' },
            'JP': { name: '일본', flag: '🇯🇵' },
            'DE': { name: '독일', flag: '🇩🇪' },
            'CN': { name: '중국', flag: '🇨🇳' },
            'GB': { name: '영국', flag: '🇬🇧' },
            'FR': { name: '프랑스', flag: '🇫🇷' },
            'CA': { name: '캐나다', flag: '🇨🇦' },
            'AU': { name: '호주', flag: '🇦🇺' },
            'BR': { name: '브라질', flag: '🇧🇷' },
            'UNKNOWN': { name: '기타', flag: '🌍' }
        };
        
        // 시뮬레이션 데이터 (실제로는 데이터베이스에서 가져와야 함)
        const currentTime = Date.now();
        const baseClicks = 50000;
        
        // 시간 기반으로 자연스럽게 증가하는 클릭수
        const totalClicks = baseClicks + Math.floor(currentTime / 10000) + Math.floor(Math.random() * 100);
        
        // 국가별 랭킹 데이터 생성
        const countries = [
            { code: 'KR', ratio: 0.35 },
            { code: 'US', ratio: 0.25 },
            { code: 'JP', ratio: 0.15 },
            { code: 'DE', ratio: 0.10 },
            { code: 'CN', ratio: 0.08 },
            { code: 'GB', ratio: 0.04 },
            { code: 'FR', ratio: 0.03 }
        ].map(country => ({
            code: country.code,
            name: countryInfo[country.code]?.name || 'Unknown',
            flag: countryInfo[country.code]?.flag || '🌍',
            clicks: Math.floor(totalClicks * country.ratio) + Math.floor(Math.random() * 1000)
        })).sort((a, b) => b.clicks - a.clicks);
        
        const ranking = {
            totalClicks,
            countries,
            timestamp: new Date().toISOString(),
            version: '6.0'
        };
        
        console.log(`📊 랭킹 요청: 총 ${totalClicks.toLocaleString()} 클릭`);
        
        res.status(200).json(ranking);
        
    } catch (error) {
        console.error('❌ 랭킹 조회 실패:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
} 