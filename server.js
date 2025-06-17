require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const geoip = require('geoip-lite');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB 연결 설정
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000
        });
        console.log('MongoDB 연결 성공!');
    } catch (err) {
        console.error('MongoDB 연결 실패:', err.message);
        // 5초 후 재시도
        setTimeout(connectDB, 5000);
    }
};

// MongoDB 연결 이벤트 리스너
mongoose.connection.on('connected', () => {
    console.log('Mongoose가 MongoDB에 연결되었습니다.');
});

mongoose.connection.on('error', (err) => {
    console.error('MongoDB 연결 에러:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB 연결이 끊어졌습니다. 재연결을 시도합니다...');
    connectDB();
});

// 스키마 정의
const CountrySchema = new mongoose.Schema({
    countryCode: { type: String, required: true, unique: true },
    countryName: { type: String, required: true },
    totalSpins: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
});

const Country = mongoose.model('Country', CountrySchema);

// 속도 제한 설정 (1분당 60회)
const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60
});

app.use('/api', limiter);

// API 엔드포인트
app.post('/api/spin', async (req, res) => {
    try {
        const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const geo = geoip.lookup(ip);
        
        if (!geo) {
            return res.status(400).json({ error: '위치를 찾을 수 없습니다.' });
        }

        // 국가 이름 매핑
        const countryNames = {
            'KR': '대한민국',
            'US': '미국',
            'JP': '일본',
            'CN': '중국',
            'GB': '영국',
            'FR': '프랑스',
            'DE': '독일',
            'IT': '이탈리아',
            'ES': '스페인',
            'CA': '캐나다'
        };

        const countryName = countryNames[geo.country] || geo.country;

        const country = await Country.findOneAndUpdate(
            { countryCode: geo.country },
            { 
                $inc: { totalSpins: 1 },
                $set: { 
                    countryName: countryName,
                    lastUpdated: new Date()
                }
            },
            { upsert: true, new: true }
        );

        res.json({ success: true, country });
    } catch (error) {
        console.error('스핀 업데이트 에러:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

app.get('/api/rankings', async (req, res) => {
    try {
        // 상위 10개국 랭킹
        const rankings = await Country.find()
            .sort('-totalSpins')
            .limit(10)
            .select('countryCode countryName totalSpins lastUpdated');
        
        // 전세계 총 스핀 수 계산
        const totalResult = await Country.aggregate([
            { $group: { _id: null, totalSpins: { $sum: '$totalSpins' } } }
        ]);
        const worldTotalSpins = totalResult.length > 0 ? totalResult[0].totalSpins : 0;
        
        // 상위 10개국의 총 스핀 수 계산
        const totalSpinsTop10 = rankings.reduce((sum, country) => sum + country.totalSpins, 0);
        
        // 참여 국가 수
        const totalCountries = await Country.countDocuments();
        
        res.json({
            rankings,
            worldTotalSpins,        // 전세계 총 클릭 수
            totalSpinsTop10,        // 상위 10개국 총 클릭 수
            totalCountries,         // 참여 국가 수
            lastUpdated: new Date()
        });
    } catch (error) {
        console.error('순위 조회 에러:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 서버 시작
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
    });
}).catch(err => {
    console.error('서버 시작 실패:', err);
}); 