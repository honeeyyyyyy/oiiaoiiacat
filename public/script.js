const catStatic = document.getElementById('cat-static');
const catSpin = document.getElementById('cat-spin');
const scoreElement = document.getElementById('score');
const spinSound = document.getElementById('spinSound');
const rankingsList = document.getElementById('rankingsList');
const catContainer = document.querySelector('.cat-container');

let score = 0;
let isSpinning = false;

// 효과음 설정
spinSound.loop = true;  // 루프 모드 설정
spinSound.volume = 1.0; // 볼륨 설정

// 국가 이름 매핑
const countryNames = {
    'KR': '대한민국',
    'US': '미국',
    'JP': '일본',
    'CN': '중국',
    // 필요한 만큼 추가
};

async function updateScore() {
    score++;
    scoreElement.textContent = score;
    localStorage.setItem('oiiaCatScore', score);

    try {
        const response = await fetch('/api/spin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            updateRankings();
        }
    } catch (error) {
        console.error('점수 업데이트 실패:', error);
    }
}

async function updateRankings() {
    try {
        const response = await fetch('/api/rankings');
        const data = await response.json();
        const { rankings, worldTotalSpins, totalSpinsTop10, totalCountries } = data;
        
        // 랭킹 목록 업데이트
        rankingsList.innerHTML = `
            <div class="ranking-header">
                <h3>🌍 전세계 랭킹</h3>
            </div>
            <div class="ranking-total">
                <div class="total-item">
                    <span>전세계 총 클릭 수</span>
                    <span class="total-spins">${worldTotalSpins.toLocaleString()}</span>
                </div>
                <div class="total-item">
                    <span>참여 국가 수</span>
                    <span class="total-countries">${totalCountries}개국</span>
                </div>
            </div>
            <div class="ranking-list">
                ${rankings.map((country, index) => `
                    <div class="ranking-item">
                        <span class="ranking-position">${index + 1}</span>
                        <span class="ranking-country">${country.countryName}</span>
                        <span class="ranking-spins">${country.totalSpins.toLocaleString()}</span>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        console.error('순위 업데이트 실패:', error);
    }
}

function startSpinning(e) {
    if (e) e.preventDefault(); // 기본 동작 방지
    if (isSpinning) return;
    
    isSpinning = true;
    catStatic.classList.remove('active');
    catSpin.classList.add('active');
    
    // 효과음 즉시 재생
    try {
        spinSound.currentTime = 0;
        spinSound.play();
    } catch (err) {
        console.log('효과음 재생 실패:', err);
    }
    
    updateScore();
}

function stopSpinning(e) {
    if (e) e.preventDefault(); // 기본 동작 방지
    if (!isSpinning) return;
    
    isSpinning = false;
    catSpin.classList.remove('active');
    catStatic.classList.add('active');
    
    // 효과음 즉시 중지
    spinSound.pause();
    spinSound.currentTime = 0;
}

// 초기 데이터 로드
window.addEventListener('load', () => {
    const savedScore = localStorage.getItem('oiiaCatScore');
    if (savedScore) {
        score = parseInt(savedScore);
        scoreElement.textContent = score;
    }
    updateRankings();
    
    // 초기 상태 설정
    catStatic.classList.add('active');
    catSpin.classList.remove('active');
});

// 마우스 이벤트
catContainer.addEventListener('mousedown', startSpinning);
catContainer.addEventListener('mouseup', stopSpinning);
catContainer.addEventListener('mouseleave', stopSpinning);

// 터치 이벤트
catContainer.addEventListener('touchstart', startSpinning);
catContainer.addEventListener('touchend', stopSpinning);
catContainer.addEventListener('touchcancel', stopSpinning);

// 스페이스바 이벤트
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        startSpinning();
    }
});

document.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        stopSpinning();
    }
});

// 페이지 벗어날 때 정리
window.addEventListener('beforeunload', stopSpinning);

// 주기적으로 순위 업데이트 (1분마다)
setInterval(updateRankings, 60000); 