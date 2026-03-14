const canvas = document.getElementById('bg-snake');
const ctx = canvas.getContext('2d');

let GRID_SIZE = 20;
let cols, rows;
let isMobile = false;

let snake = [];
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };
let food = { x: 0, y: 0 };
let restrictedZones = [];
let foodInaccessibleTime = 0;
let timeSinceLastFood = 60000;

let lastTime = 0;
let accumulatedTime = 0;
const TICK_RATE = 150; // ms per grid movement (speed)
let uiElements = [];

window.addEventListener('DOMContentLoaded', () => {
    uiElements = document.querySelectorAll('.card, nav, img, .social-icon, h1, h2, h3, h4, p, blockquote, .btn');
});

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    cols = Math.floor(canvas.width / GRID_SIZE);
    rows = Math.floor(canvas.height / GRID_SIZE);
    isMobile = window.matchMedia("(max-width: 768px)").matches || navigator.maxTouchPoints > 0;
}

window.addEventListener('resize', resize);

function updateRestrictedZones() {
    restrictedZones = [];
    if (!uiElements || uiElements.length === 0) {
        uiElements = document.querySelectorAll('.card, nav, img, .social-icon, h1, h2, h3, h4, p, blockquote, .btn');
    }
    
    uiElements.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        
        restrictedZones.push({
            x1: Math.floor(rect.left / GRID_SIZE),
            y1: Math.floor(rect.top / GRID_SIZE),
            x2: Math.floor(rect.right / GRID_SIZE),
            y2: Math.floor(rect.bottom / GRID_SIZE)
        });
    });
}

function isRestricted(x, y) {
    for (let zone of restrictedZones) {
        if (x >= zone.x1 && x <= zone.x2 && y >= zone.y1 && y <= zone.y2) {
            return true;
        }
    }
    return false;
}

function getSafeDirections(x, y) {
    const dirs = [
        { x: 0, y: -1 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: -1, y: 0 }
    ];
    return dirs.filter(d => {
        if (d.x === -direction.x && d.y === -direction.y) return false;
        
        let nx = x + d.x;
        let ny = y + d.y;
        if (nx < 0) nx = cols - 1;
        if (nx >= cols) nx = 0;
        if (ny < 0) ny = rows - 1;
        if (ny >= rows) ny = 0;
        
        for (let i = 0; i < snake.length - 1; i++) {
            if (snake[i].x === nx && snake[i].y === ny) return false;
        }
        
        return true;
    });
}

function getPathToFood() {
    const queue = [];
    const visited = new Set();
    const startObj = { x: snake[0].x, y: snake[0].y, path: [] };
    
    queue.push(startObj);
    visited.add(`${startObj.x},${startObj.y}`);
    
    const dirs = [
        { x: 0, y: -1 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: -1, y: 0 }
    ];
    
    const MAX_ITERATIONS = 2000;
    let iterations = 0;
    
    while (queue.length > 0) {
        iterations++;
        if (iterations > MAX_ITERATIONS) return null;
        
        const curr = queue.shift();
        if (curr.x === food.x && curr.y === food.y) {
            return curr.path[0];
        }
        
        for (let d of dirs) {
            const nx = curr.x + d.x;
            const ny = curr.y + d.y;
            
            let wx = nx;
            let wy = ny;
            if (wx < 0) wx = cols - 1;
            if (wx >= cols) wx = 0;
            if (wy < 0) wy = rows - 1;
            if (wy >= rows) wy = 0;
            
            const key = `${wx},${wy}`;
            
            if (!visited.has(key)) {
                let onSnake = false;
                for (let i = 0; i < snake.length - 1; i++) {
                    if (snake[i].x === wx && snake[i].y === wy) {
                        onSnake = true;
                        break;
                    }
                }
                
                if (!onSnake) {
                    visited.add(key);
                    queue.push({ x: wx, y: wy, path: [...curr.path, d] });
                }
            }
        }
    }
    return null;
}

function resetGame() {
    snake = [];
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    
    let safeX = Math.floor(cols / 2);
    let safeY = Math.floor(rows / 2);
    let attempts = 0;
    
    updateRestrictedZones();
    while (isRestricted(safeX, safeY) && attempts < 100) {
        safeX = Math.floor(Math.random() * cols);
        safeY = Math.floor(Math.random() * rows);
        attempts++;
    }
    
    for (let i = 0; i < 5; i++) {
        snake.push({ x: safeX, y: safeY });
    }
    
    spawnFood();
}

function spawnFood() {
    let safeX, safeY;
    let attempts = 0;
    let safe = false;
    
    updateRestrictedZones();
    while (!safe && attempts < 1000) {
        safeX = Math.floor(Math.random() * cols);
        safeY = Math.floor(Math.random() * rows);
        attempts++;
        
        if (isRestricted(safeX, safeY)) continue;
        
        let onSnake = false;
        for (let s of snake) {
            if (s.x === safeX && s.y === safeY) {
                onSnake = true;
                break;
            }
        }
        
        if (!onSnake) safe = true;
    }
    
    if (safe) {
        food = { x: safeX, y: safeY };
    } else {
        food = { x: 0, y: 0 }; 
    }
    foodInaccessibleTime = 0;
}

function updateGame() {
    updateRestrictedZones();
    
    if (isMobile) {
        let nextStep = null;
        if (timeSinceLastFood >= 60000) {
            nextStep = getPathToFood();
        } else {
            timeSinceLastFood += TICK_RATE;
        }

        if (nextStep) {
            nextDirection = nextStep;
            foodInaccessibleTime = 0;
        } else {
            if (timeSinceLastFood >= 60000) {
                foodInaccessibleTime += TICK_RATE;
                if (foodInaccessibleTime >= 60000) {
                    spawnFood();
                    foodInaccessibleTime = 0;
                }
            }
            
            const safeDirs = getSafeDirections(snake[0].x, snake[0].y);
            if (safeDirs.length > 0) {
                const currentSafe = safeDirs.find(d => d.x === direction.x && d.y === direction.y);
                // 10% chance to naturally change direction when wandering
                if (currentSafe && Math.random() > 0.1) {
                    nextDirection = currentSafe;
                } else {
                    nextDirection = safeDirs[Math.floor(Math.random() * safeDirs.length)];
                }
            } else {
                resetGame();
                return;
            }
        }
    }
    
    if (nextDirection.x !== 0 && direction.x !== 0 && nextDirection.x === -direction.x) {
        nextDirection = direction;
    }
    if (nextDirection.y !== 0 && direction.y !== 0 && nextDirection.y === -direction.y) {
        nextDirection = direction;
    }
    
    direction = nextDirection;
    
    let head = snake[0];
    let nx = head.x + direction.x;
    let ny = head.y + direction.y;
    
    if (nx < 0) nx = cols - 1;
    if (nx >= cols) nx = 0;
    if (ny < 0) ny = rows - 1;
    if (ny >= rows) ny = 0;
    
    for (let i = 0; i < snake.length; i++) {
        if (snake[i].x === nx && snake[i].y === ny) {
            resetGame();
            return;
        }
    }
    
    let newHead = { x: nx, y: ny };
    snake.unshift(newHead);
    
    if (nx === food.x && ny === food.y) {
        spawnFood();
        timeSinceLastFood = 0;
    } else {
        snake.pop();
    }
}

function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    let padding = 2;
    
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#f43f5e';
    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(food.x * GRID_SIZE + padding, food.y * GRID_SIZE + padding, GRID_SIZE - padding * 2, GRID_SIZE - padding * 2);
    
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#10b981';
    
    for (let i = 0; i < snake.length; i++) {
        let segment = snake[i];
        
        ctx.fillStyle = i === 0 ? '#34d399' : '#10b981';
        
        ctx.fillRect(segment.x * GRID_SIZE + padding, segment.y * GRID_SIZE + padding, GRID_SIZE - padding * 2, GRID_SIZE - padding * 2);
        
        if (i === 0) {
            ctx.shadowBlur = 0; 
            ctx.fillStyle = '#ffffff'; 
            
            let eyeSize = 3;
            let eyeX1, eyeY1, eyeX2, eyeY2;
            const sX = segment.x * GRID_SIZE;
            const sY = segment.y * GRID_SIZE;
            
            if (direction.x === 1) {
                eyeX1 = sX + GRID_SIZE - padding - eyeSize - 2;
                eyeY1 = sY + padding + 2;
                eyeX2 = eyeX1;
                eyeY2 = sY + GRID_SIZE - padding - eyeSize - 2;
            } else if (direction.x === -1) {
                eyeX1 = sX + padding + 2;
                eyeY1 = sY + padding + 2;
                eyeX2 = eyeX1;
                eyeY2 = sY + GRID_SIZE - padding - eyeSize - 2;
            } else if (direction.y === -1) {
                eyeX1 = sX + padding + 2;
                eyeY1 = sY + padding + 2;
                eyeX2 = sX + GRID_SIZE - padding - eyeSize - 2;
                eyeY2 = eyeY1;
            } else {
                eyeX1 = sX + padding + 2;
                eyeY1 = sY + GRID_SIZE - padding - eyeSize - 2;
                eyeX2 = sX + GRID_SIZE - padding - eyeSize - 2;
                eyeY2 = eyeY1;
            }
            
            ctx.fillRect(eyeX1, eyeY1, eyeSize, eyeSize);
            ctx.fillRect(eyeX2, eyeY2, eyeSize, eyeSize);
            
            ctx.shadowBlur = 15; 
            ctx.shadowColor = '#10b981';
        }
    }
    
    ctx.shadowBlur = 0;
}

function loop(timestamp) {
    if (document.visibilityState !== 'visible') {
        lastTime = timestamp;
        requestAnimationFrame(loop);
        return;
    }

    if (!lastTime) lastTime = timestamp;
    const dt = timestamp - lastTime;
    lastTime = timestamp;
    
    accumulatedTime += dt;
    
    if (accumulatedTime >= TICK_RATE) {
        if (accumulatedTime > TICK_RATE * 5) accumulatedTime = TICK_RATE;
        accumulatedTime -= TICK_RATE;
        updateGame();
    }
    
    drawGame();
    requestAnimationFrame(loop);
}

window.addEventListener('keydown', (e) => {
    if (isMobile) return; 
    
    switch (e.key.toLowerCase()) {
        case 'w':
            if (direction.y !== 1) nextDirection = { x: 0, y: -1 };
            break;
        case 's':
            if (direction.y !== -1) nextDirection = { x: 0, y: 1 };
            break;
        case 'a':
            if (direction.x !== 1) nextDirection = { x: -1, y: 0 };
            break;
        case 'd':
            if (direction.x !== -1) nextDirection = { x: 1, y: 0 };
            break;
    }
});

resize();
resetGame();
requestAnimationFrame(loop);
