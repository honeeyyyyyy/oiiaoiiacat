const catStatic = document.getElementById('cat-static');
const catSpin = document.getElementById('cat-spin');
const scoreElement = document.getElementById('score');
const spinSound = document.getElementById('spinSound');

let score = 0;
let canSpin = true;
let isSpinning = false;

// GIF 지속 시간 (밀리초)
const SPIN_DURATION = 1500;

function updateScore() {
    score++;
    scoreElement.textContent = score;
    
    // 로컬 스토리지에 점수 저장
    localStorage.setItem('oiiaCatScore', score);
}

function spinCat() {
    if (!canSpin || isSpinning) return;
    
    isSpinning = true;
    canSpin = false;
    
    // GIF 전환
    catStatic.classList.remove('active');
    catSpin.classList.add('active');
    
    // 사운드 재생
    spinSound.currentTime = 0;
    spinSound.play();

    // GIF 애니메이션이 끝나면 실행
    setTimeout(() => {
        // 정적 이미지로 돌아가기
        catStatic.classList.add('active');
        catSpin.classList.remove('active');
        
        // 점수 업데이트
        updateScore();
        
        // 상태 초기화
        isSpinning = false;
        canSpin = true;
    }, SPIN_DURATION);
}

// 저장된 점수 불러오기
window.addEventListener('load', () => {
    const savedScore = localStorage.getItem('oiiaCatScore');
    if (savedScore) {
        score = parseInt(savedScore);
        scoreElement.textContent = score;
    }
});

// 키보드 이벤트 리스너
document.addEventListener('keydown', (e) => {
    // 특수 키 제외 (Alt, Ctrl, Shift, Tab, Meta/Windows 키 등)
    if (!e.altKey && !e.ctrlKey && !e.shiftKey && !e.metaKey &&
        !['Tab', 'Escape', 'CapsLock', 'NumLock', 'ScrollLock', 'ContextMenu'].includes(e.key)) {
        spinCat();
    }
});

// 클릭 이벤트 리스너
document.querySelector('.cat-container').addEventListener('click', spinCat);

// 모바일 터치 이벤트
document.querySelector('.cat-container').addEventListener('touchstart', (e) => {
    e.preventDefault();
    spinCat();
}); 