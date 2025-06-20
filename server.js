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
        const client = new MongoClient(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        await client.connect();
        console.log('MongoDB에 성공적으로 연결되었습니다.');
        
        db = client.db(DB_NAME);
        clicksCollection = db.collection(COLLECTION_NAME);
        
        // 컬렉션 인덱스 생성
        await clicksCollection.createIndex({ country: 1 });
        await clicksCollection.createIndex({ timestamp: 1 });
        
    } catch (error) {
        console.error('MongoDB 연결 실패:', error);
        process.exit(1);
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

// 클릭 기록 API
app.post('/api/click', async (req, res) => {
    try {
        // 클라이언트 IP 주소 가져오기
        const clientIP = req.headers['x-forwarded-for'] || 
                        req.headers['x-real-ip'] || 
                        req.connection.remoteAddress || 
                        req.socket.remoteAddress ||
                        (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
                        '127.0.0.1';

        // IP에서 국가 정보 추출
        const geo = geoip.lookup(clientIP);
        const country = geo ? geo.country : 'Unknown';
        
        console.log(`클릭 기록: IP=${clientIP}, Country=${country}`);
        
        // MongoDB에 클릭 데이터 저장
        const clickData = {
            country: country,
            ip: clientIP,
            timestamp: new Date(),
            userAgent: req.headers['user-agent'] || 'Unknown'
        };
        
        await clicksCollection.insertOne(clickData);
        
        res.json({ 
            success: true, 
            country: country,
            message: '클릭이 기록되었습니다.' 
        });
        
    } catch (error) {
        console.error('클릭 저장 오류:', error);
        res.status(500).json({ 
            success: false, 
            error: '클릭 저장에 실패했습니다.' 
        });
    }
});

// 랭킹 조회 API
app.get('/api/rankings', async (req, res) => {
    try {
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
        res.status(500).json({ 
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

// 404 처리
app.use((req, res) => {
    res.status(404).send('페이지를 찾을 수 없습니다.');
});

// 에러 처리
app.use((error, req, res, next) => {
    console.error('서버 에러:', error);
    res.status(500).send('서버 내부 오류가 발생했습니다.');
});

// 서버 시작
async function startServer() {
    try {
        await connectToDatabase();
        
        app.listen(PORT, () => {
            console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
            console.log(`로컬 주소: http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('서버 시작 실패:', error);
        process.exit(1);
    }
}

// 우아한 종료 처리
process.on('SIGINT', async () => {
    console.log('\n서버를 종료합니다...');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n서버를 종료합니다...');
    process.exit(0);
});

startServer(); 