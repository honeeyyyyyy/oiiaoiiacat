const cat = document.getElementById('cat');
const scoreElement = document.getElementById('score');
const spinSound = document.getElementById('spinSound');

let score = 0;
let canSpin = true;

function updateScore() {
    score++;
    scoreElement.textContent = score;
    
    // 로컬 스토리지에 점수 저장
    localStorage.setItem('oiiaCatScore', score);
}

function spinCat() {
    if (!canSpin) return;
    
    canSpin = false;
    cat.classList.add('spinning');
    spinSound.currentTime = 0;
    spinSound.play();
    updateScore();

    // 애니메이션이 끝나면 다시 클릭 가능하게 설정
    setTimeout(() => {
        cat.classList.remove('spinning');
        canSpin = true;
    }, 500);
}

// 저장된 점수 불러오기
window.addEventListener('load', () => {
    const savedScore = localStorage.getItem('oiiaCatScore');
    if (savedScore) {
        score = parseInt(savedScore);
        scoreElement.textContent = score;
    }
});

// 클릭 이벤트 리스너 추가
cat.addEventListener('click', spinCat);

// 모바일 터치 이벤트 추가
cat.addEventListener('touchstart', (e) => {
    e.preventDefault();
    spinCat();
}); 