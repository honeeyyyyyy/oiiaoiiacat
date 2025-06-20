require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const geoip = require('geoip-lite');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB 연결 설정
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://honeeyyyy:qwer1234@cluster0.1ff5kkx.mongodb.net/';
const DB_NAME = 'oiiaoiiacat';
const COLLECTION_NAME = 'clicks';

let db;
let clicksCollection;
let isConnected = false;

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 캐시 무효화 미들웨어
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
    next();
});

// 캐시 방지 헤더
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

// 속도 제한 설정 (1분당 60회)
const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60
});

app.use('/api', limiter);

// MongoDB 연결
async function connectToDatabase() {
    try {
        if (isConnected && db) {
            return;
        }
        
        const client = new MongoClient(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        
        await client.connect();
        console.log('MongoDB에 성공적으로 연결되었습니다.');
        
        db = client.db(DB_NAME);
        clicksCollection = db.collection(COLLECTION_NAME);
        isConnected = true;
        
        // 컬렉션 인덱스 생성 (조건부)
        try {
            await clicksCollection.createIndex({ country: 1 });
            await clicksCollection.createIndex({ timestamp: 1 });
        } catch (indexError) {
            console.log('인덱스 생성 건너뜀:', indexError.message);
        }
        
    } catch (error) {
        console.error('MongoDB 연결 실패:', error);
        isConnected = false;
        // 연결 실패 시에도 서버가 계속 동작하도록 함
    }
}

// 스키마 정의
const CountrySchema = new mongoose.Schema({
    countryCode: { type: String, required: true, unique: true },
    countryName: { type: String, required: true },
    totalSpins: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
});

const Country = mongoose.model('Country', CountrySchema);

// 헬스 체크 엔드포인트
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        version: '9.0.final',
        mongodb: isConnected ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

// 클릭 기록 API
app.post('/api/click', async (req, res) => {
    try {
        // MongoDB 연결 확인
        if (!isConnected) {
            await connectToDatabase();
        }
        
        // 클라이언트 IP 주소 가져오기
        let clientIP = req.headers['x-forwarded-for'] || 
                      req.headers['x-real-ip'] || 
                      req.connection.remoteAddress || 
                      req.socket.remoteAddress ||
                      (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
                      '127.0.0.1';

        // IPv6 형태의 로컬 IP 처리
        if (clientIP === '::1' || clientIP === '::ffff:127.0.0.1') {
            clientIP = '127.0.0.1';
        }

        // IP에서 국가 정보 추출
        const geo = geoip.lookup(clientIP);
        const country = geo ? geo.country : 'Unknown';
        
        console.log(`클릭 기록: IP=${clientIP}, Country=${country}`);
        
        // MongoDB에 클릭 데이터 저장 (연결이 있을 때만)
        if (isConnected && clicksCollection) {
            const clickData = {
                country: country,
                ip: clientIP,
                timestamp: new Date(),
                userAgent: req.headers['user-agent'] || 'Unknown',
                version: req.body.version || '9.0.final'
            };
            
            await clicksCollection.insertOne(clickData);
        }
        
        res.json({ 
            success: true, 
            country: country,
            message: '클릭이 기록되었습니다.',
            dbStatus: isConnected ? 'connected' : 'disconnected'
        });
        
    } catch (error) {
        console.error('클릭 저장 오류:', error);
        res.status(200).json({ 
            success: false, 
            error: '클릭 저장에 실패했습니다.',
            country: 'Unknown',
            message: '게임은 계속 플레이할 수 있습니다.'
        });
    }
});

// 랭킹 조회 API
app.get('/api/rankings', async (req, res) => {
    try {
        // MongoDB 연결 확인
        if (!isConnected) {
            await connectToDatabase();
        }
        
        if (!isConnected || !clicksCollection) {
            // DB 연결이 없어도 기본 응답 제공
            return res.json({
                success: false,
                rankings: [],
                totalClicks: 0,
                totalCountries: 0,
                message: 'DB 연결 문제로 랭킹을 불러올 수 없습니다.'
            });
        }
        
        // 국가별 클릭 수 집계
        const rankings = await clicksCollection.aggregate([
            {
                $group: {
                    _id: '$country',
                    clicks: { $sum: 1 }
                }
            },
            {
                $sort: { clicks: -1 }
            },
            {
                $limit: 10
            }
        ]).toArray();

        // 전체 통계
        const totalClicks = await clicksCollection.countDocuments();
        const totalCountries = await clicksCollection.distinct('country');

        res.json({
            success: true,
            rankings: rankings,
            totalClicks: totalClicks,
            totalCountries: totalCountries.length
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

// 서버리스 환경에서는 연결을 미리 설정
connectToDatabase().catch(err => {
    console.error('초기 DB 연결 실패:', err);
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