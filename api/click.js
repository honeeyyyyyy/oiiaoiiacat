// Vercel 서버리스 함수로 클릭 처리
export default async function handler(req, res) {
    // CORS 헤더 추가
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        // IP 주소 가져오기
        const forwarded = req.headers['x-forwarded-for'];
        const ip = forwarded ? forwarded.split(',')[0] : req.connection?.remoteAddress || '127.0.0.1';
        
        // 국가 코드 감지
        const countryCode = await getCountryFromIP(ip);
        
        // 간단한 인메모리 저장소 (실제로는 데이터베이스 사용 권장)
        // Vercel에서는 파일 시스템이 읽기 전용이므로 외부 데이터베이스나 KV 스토어 필요
        const response = {
            success: true,
            countryCode,
            ip: ip.substring(0, 8) + '***', // IP 마스킹
            timestamp: new Date().toISOString()
        };
        
        console.log(`🖱️ 클릭: ${countryCode} from ${ip}`);
        
        res.status(200).json(response);
        
    } catch (error) {
        console.error('❌ 클릭 처리 실패:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

// IP를 통한 국가 감지 함수
async function getCountryFromIP(ip) {
    try {
        if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
            return 'KR';
        }
        
        const response = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode`);
        const data = await response.json();
        return data.countryCode || 'UNKNOWN';
    } catch (error) {
        console.error('❌ 국가 감지 실패:', error);
        return 'UNKNOWN';
    }
} 