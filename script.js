/**
 * ============================================
 * 3D RACING GAME - MAIN GAME ENGINE (FIXED)
 * Built with Three.js (3D) and Cannon.js (Physics)
 * By Nishanth KN - Working Version
 * ============================================
 */

// Global Variables
let scene, camera, renderer;
let world; // Cannon.js physics world
let gameRunning = false;
let gameInitialized = false;
let lapStartTime = 0;
let currentLapTime = 0;
let lapCount = 0;
let finishLineCrossed = false;

// Touch input for mobile
let touchInputLeft = false;
let touchInputRight = false;
let touchInputAccel = false;
let touchInputBrake = false;

// Game Settings
const gameSettings = {
    audioEnabled: true,
    graphicsQuality: 'high',
    volume: 70,
};

// Car Physics State
const carState = {
    mesh: null,
    body: null,
    speed: 0,
    acceleration: 0,
    steering: 0,
    isAccelerating: false,
    isBraking: false,
    isHandbraking: false,
    maxSpeed: 150,
    acceleration_rate: 0.5,
    brake_rate: 0.3,
    turn_speed: 0.1,
    friction: 0.95
};

// ============================================
// INITIALIZATION FUNCTION
// ============================================

function initGame() {
    console.log('🎮 [GAME] Initializing 3D Racing Game...');
    
    // Check libraries
    if (typeof THREE === 'undefined') {
        console.error('❌ Three.js not loaded!');
        showErrorMessage('Three.js library not found. Check internet connection.');
        return;
    }
    
    const CannonLib = typeof CANNON !== 'undefined' ? CANNON : null;
    if (!CannonLib) {
        console.error('❌ Cannon.js not loaded!');
        console.log('Available window objects:', Object.keys(window).filter(k => k.includes('cannon') || k.includes('Cannon')));
        showErrorMessage('Cannon.js library not found. Check internet connection.');
        return;
    }
    
    // Make CANNON global if using different import
    if (typeof CANNON === 'undefined' && CannonLib) {
        window.CANNON = CannonLib;
    }
    
    try {
        // SCENE SETUP
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1f4a);
        scene.fog = new THREE.Fog(0x1a1f4a, 500, 1000);
        console.log('✓ Scene created');

        // CAMERA SETUP
        const width = window.innerWidth;
        const height = window.innerHeight;
        camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 2000);
        camera.position.set(0, 15, -30);
        camera.lookAt(0, 0, 0);
        console.log('✓ Camera configured');

        // RENDERER SETUP
        renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            powerPreference: 'high-performance',
            alpha: true
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFShadowShadowMap;
        renderer.setClearColor(0x1a1f4a, 1);
        
        const container = document.getElementById('gameContainer');
        if (!container) {
            console.error('❌ Game container not found!');
            return;
        }
        
        container.innerHTML = '';
        container.appendChild(renderer.domElement);
        console.log('✓ Renderer initialized');

        // PHYSICS WORLD SETUP
        world = new CANNON.World();
        world.gravity.set(0, -20, 0);
        world.defaultContactMaterial.friction = 0.4;
        console.log('✓ Physics world created');

        // CREATE GAME OBJECTS
        createLights();
        createGround();
        createRaceTrack();
        createFinishLine();
        createRaceCar();
        createEnvironment();
        console.log('✓ All game objects created');

        // EVENT LISTENERS
        window.addEventListener('resize', onWindowResize);
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        window.addEventListener('touchstart', onTouchStart, false);
        window.addEventListener('touchmove', onTouchMove, false);
        window.addEventListener('touchend', onTouchEnd, false);

        // UI LISTENERS
        document.getElementById('settingsBtn').addEventListener('click', openSettings);
        document.getElementById('closeSettings').addEventListener('click', closeSettings);
        document.getElementById('applySettingsBtn').addEventListener('click', applySettings);
        document.getElementById('resetGameBtn').addEventListener('click', resetGame);
        document.getElementById('startGameBtn').addEventListener('click', startGame);
        document.getElementById('continueBtn').addEventListener('click', continueLap);
        document.getElementById('audioToggle').addEventListener('change', updateAudioStatus);
        document.getElementById('volumeSlider').addEventListener('input', updateVolumeDisplay);

        gameInitialized = true;
        console.log('✅ [GAME] Initialization complete! Ready to race!');
        
    } catch (error) {
        console.error('❌ Error during initialization:', error);
        showErrorMessage('Game initialization failed: ' + error.message);
    }
}

// ============================================
// CREATE GAME OBJECTS
// ============================================

function createLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(100, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.left = -200;
    directionalLight.shadow.camera.right = 200;
    directionalLight.shadow.camera.top = 200;
    directionalLight.shadow.camera.bottom = -200;
    scene.add(directionalLight);
    
    const pointLight = new THREE.PointLight(0x00d4ff, 0.5);
    pointLight.position.set(0, 30, 0);
    scene.add(pointLight);
    
    console.log('  → Lights created');
}

function createGround() {
    // Mesh
    const groundGeom = new THREE.PlaneGeometry(400, 400);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x2a5f4a });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    
    // Physics
    const groundShape = new CANNON.Plane();
    const groundBody = new CANNON.Body({ mass: 0, shape: groundShape });
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    world.addBody(groundBody);
    
    console.log('  → Ground created');
}

function createRaceTrack() {
    // Create oval track using TubeGeometry
    const trackCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.1, 60),
        new THREE.Vector3(80, 0.1, 30),
        new THREE.Vector3(80, 0.1, -30),
        new THREE.Vector3(0, 0.1, -60),
        new THREE.Vector3(-80, 0.1, -30),
        new THREE.Vector3(-80, 0.1, 30),
        new THREE.Vector3(0, 0.1, 60)
    ]);
    
    const trackGeom = new THREE.TubeGeometry(trackCurve, 64, 25, 8, false);
    const trackMat = new THREE.MeshLambertMaterial({ color: 0x222233 });
    const track = new THREE.Mesh(trackGeom, trackMat);
    track.castShadow = true;
    track.receiveShadow = true;
    scene.add(track);
    
    console.log('  → Race track created');
}

function createFinishLine() {
    const finishGeom = new THREE.PlaneGeometry(40, 2);
    const finishMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const finishLine = new THREE.Mesh(finishGeom, finishMat);
    finishLine.position.set(0, 0.5, 60);
    finishLine.rotation.x = -Math.PI / 2;
    finishLine.userData.isFinishLine = true;
    scene.add(finishLine);
    
    // Checkered pattern
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 20;
    const ctx = canvas.getContext('2d');
    for (let i = 0; i < 20; i++) {
        for (let j = 0; j < 2; j++) {
            ctx.fillStyle = (i + j) % 2 === 0 ? '#000000' : '#ffffff';
            ctx.fillRect(i * 20, j * 10, 20, 10);
        }
    }
    const texture = new THREE.CanvasTexture(canvas);
    finishLine.material.map = texture;
    
    console.log('  → Finish line created');
}

function createRaceCar() {
    // Mesh
    const carGeom = new THREE.BoxGeometry(2, 1.5, 4);
    const carMat = new THREE.MeshStandardMaterial({ 
        color: 0xff0000,
        metalness: 0.6,
        roughness: 0.3
    });
    carState.mesh = new THREE.Mesh(carGeom, carMat);
    carState.mesh.position.set(0, 1, 50);
    carState.mesh.castShadow = true;
    carState.mesh.receiveShadow = true;
    scene.add(carState.mesh);
    
    // Physics Body
    const carShape = new CANNON.Box(new CANNON.Vec3(1, 0.75, 2));
    carState.body = new CANNON.Body({
        mass: 1,
        shape: carShape,
        linearDamping: 0.3,
        angularDamping: 0.5
    });
    carState.body.position.set(0, 1, 50);
    world.addBody(carState.body);
    
    // Wheels
    const wheelGeom = new THREE.CylinderGeometry(0.6, 0.6, 0.4, 16);
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const wheelPositions = [
        new THREE.Vector3(-1, 0.3, 1),
        new THREE.Vector3(1, 0.3, 1),
        new THREE.Vector3(-1, 0.3, -1),
        new THREE.Vector3(1, 0.3, -1)
    ];
    
    wheelPositions.forEach(pos => {
        const wheel = new THREE.Mesh(wheelGeom, wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.copy(pos);
        carState.mesh.add(wheel);
    });
    
    console.log('  → Race car created');
}

function createEnvironment() {
    const treeGeom = new THREE.ConeGeometry(10, 30, 8);
    const treeMat = new THREE.MeshLambertMaterial({ color: 0x2a5f4a });
    
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const tree = new THREE.Mesh(treeGeom, treeMat);
        tree.position.set(
            Math.cos(angle) * 130,
            15,
            Math.sin(angle) * 70
        );
        tree.castShadow = true;
        scene.add(tree);
    }
    
    console.log('  → Environment created');
}

// ============================================
// INPUT HANDLING
// ============================================

const keys = {};

function onKeyDown(event) {
    const key = event.key.toLowerCase();
    keys[key] = true;
    
    switch(key) {
        case 'w':
        case 'arrowup':
            carState.isAccelerating = true;
            break;
        case 's':
        case 'arrowdown':
            carState.isBraking = true;
            break;
        case ' ':
            carState.isHandbraking = true;
            break;
    }
}

function onKeyUp(event) {
    const key = event.key.toLowerCase();
    keys[key] = false;
    
    switch(key) {
        case 'w':
        case 'arrowup':
            carState.isAccelerating = false;
            break;
        case 's':
        case 'arrowdown':
            carState.isBraking = false;
            break;
        case ' ':
            carState.isHandbraking = false;
            break;
    }
}

// Touch input (for mobile)
function onTouchStart(e) {
    const touches = e.touches;
    for (let touch of touches) {
        const x = touch.clientX;
        const y = touch.clientY;
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        // Left side: steer left, accelerate
        if (x < width / 3) {
            touchInputLeft = true;
            carState.isAccelerating = true;
        }
        // Right side: steer right, brake
        if (x > (width * 2) / 3) {
            touchInputRight = true;
            carState.isBraking = true;
        }
        // Bottom: handbrake
        if (y > height * 0.8) {
            carState.isHandbraking = true;
        }
    }
}

function onTouchMove(e) {
    // Can be used for more precise steering
}

function onTouchEnd(e) {
    touchInputLeft = false;
    touchInputRight = false;
    carState.isAccelerating = false;
    carState.isBraking = false;
    carState.isHandbraking = false;
}

// ============================================
// CAR PHYSICS & MOVEMENT
// ============================================

function updateCarPhysics() {
    // Steering
    carState.steering = 0;
    if (keys['a'] || keys['arrowleft'] || touchInputLeft) {
        carState.steering = carState.turn_speed;
    }
    if (keys['d'] || keys['arrowright'] || touchInputRight) {
        carState.steering = -carState.turn_speed;
    }
    
    // Apply steering rotation
    const steerAxis = new CANNON.Vec3(0, 1, 0);
    const steerQuat = new CANNON.Quaternion();
    steerQuat.setFromAxisAngle(steerAxis, carState.steering);
    carState.body.quaternion = carState.body.quaternion.mult(steerQuat);
    
    // Get forward direction
    const forward = new THREE.Vector3(0, 0, 1);
    forward.applyQuaternion(carState.mesh.quaternion);
    
    // Acceleration/Braking
    if (carState.isAccelerating) {
        carState.acceleration = Math.min(
            carState.acceleration + carState.acceleration_rate,
            carState.maxSpeed
        );
    } else if (carState.isBraking) {
        carState.acceleration = Math.max(
            carState.acceleration - carState.brake_rate * 2,
            -carState.maxSpeed * 0.5
        );
    } else {
        carState.acceleration *= carState.friction;
    }
    
    // Apply handbrake friction
    const effectiveAccel = carState.isHandbraking ? 
        carState.acceleration * 0.6 : 
        carState.acceleration;
    
    // Update body velocity
    carState.body.velocity.x = forward.x * effectiveAccel * 0.2;
    carState.body.velocity.z = forward.z * effectiveAccel * 0.2;
    
    // Update mesh from physics
    carState.mesh.position.copy(carState.body.position);
    carState.mesh.quaternion.copy(carState.body.quaternion);
    
    // Update displayed speed
    carState.speed = carState.acceleration;
    
    // Prevent falling through world
    if (carState.body.position.y < -50) {
        carState.body.position.set(0, 1, 50);
        carState.body.velocity.set(0, 0, 0);
        carState.acceleration = 0;
    }
}

// ============================================
// FINISH LINE & LAP SYSTEM
// ============================================

function checkFinishLine() {
    const finishZ = 60;
    const tolerance = 5;
    
    if (Math.abs(carState.body.position.z - finishZ) < tolerance) {
        if (!finishLineCrossed) {
            finishLineCrossed = true;
            onFinishLineCrossed();
        }
    } else if (Math.abs(carState.body.position.z - finishZ) > tolerance * 2) {
        finishLineCrossed = false;
    }
}

function onFinishLineCrossed() {
    if (!gameRunning) return;
    
    currentLapTime = (Date.now() - lapStartTime) / 1000;
    lapCount++;
    
    const minutes = Math.floor(currentLapTime / 60);
    const seconds = Math.floor(currentLapTime % 60);
    const ms = Math.floor((currentLapTime * 1000) % 1000);
    const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(ms).padStart(3, '0')}`;
    
    document.getElementById('finishTime').textContent = `Lap Time: ${timeStr}`;
    document.getElementById('finishPopup').classList.remove('hidden');
    
    console.log('✓ Lap completed! Time:', timeStr);
}

function continueLap() {
    document.getElementById('finishPopup').classList.add('hidden');
    lapStartTime = Date.now();
    document.getElementById('lapValue').textContent = lapCount;
}

// ============================================
// HUD UPDATE
// ============================================

function updateHUD() {
    const displaySpeed = Math.abs(Math.round(carState.speed));
    document.getElementById('speedValue').textContent = displaySpeed;
    
    if (gameRunning) {
        currentLapTime = (Date.now() - lapStartTime) / 1000;
        const minutes = Math.floor(currentLapTime / 60);
        const seconds = Math.floor(currentLapTime % 60);
        const ms = Math.floor((currentLapTime * 1000) % 1000);
        const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(ms).padStart(3, '0')}`;
        document.getElementById('timerValue').textContent = timeStr;
    }
}

// ============================================
// CAMERA SYSTEM
// ============================================

function updateCamera() {
    const cameraDistance = 30;
    const cameraHeight = 12;
    
    const forward = new THREE.Vector3(0, 0, 1);
    forward.applyQuaternion(carState.mesh.quaternion);
    
    const targetPos = new THREE.Vector3(
        carState.mesh.position.x - forward.x * cameraDistance,
        carState.mesh.position.y + cameraHeight,
        carState.mesh.position.z - forward.z * cameraDistance
    );
    
    camera.position.lerp(targetPos, 0.1);
    camera.lookAt(
        carState.mesh.position.x,
        carState.mesh.position.y + 2,
        carState.mesh.position.z
    );
}

// ============================================
// UI & SETTINGS FUNCTIONS
// ============================================

function openSettings() {
    document.getElementById('settingsModal').classList.remove('hidden');
}

function closeSettings() {
    document.getElementById('settingsModal').classList.add('hidden');
}

function applySettings() {
    gameSettings.audioEnabled = document.getElementById('audioToggle').checked;
    gameSettings.volume = parseInt(document.getElementById('volumeSlider').value);
    closeSettings();
}

function updateAudioStatus() {
    const status = document.getElementById('audioToggle').checked ? 'ON' : 'OFF';
    document.getElementById('audioStatus').textContent = status;
}

function updateVolumeDisplay() {
    const vol = document.getElementById('volumeSlider').value;
    document.getElementById('volumeValue').textContent = vol + '%';
}

function resetGame() {
    carState.body.position.set(0, 1, 50);
    carState.body.velocity.set(0, 0, 0);
    carState.acceleration = 0;
    carState.speed = 0;
    lapCount = 0;
    lapStartTime = Date.now();
    document.getElementById('lapValue').textContent = '0';
    closeSettings();
}

function startGame() {
    console.log('🏁 [GAME] Race started!');
    document.getElementById('tutorialOverlay').classList.add('hidden');
    gameRunning = true;
    lapStartTime = Date.now();
}

function showErrorMessage(msg) {
    const err = document.createElement('div');
    err.style.cssText = `
        position: fixed; top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(255, 68, 68, 0.95);
        color: white; padding: 30px; border-radius: 10px;
        font-family: Arial; font-size: 16px; text-align: center;
        z-index: 9999; max-width: 80%;
    `;
    err.textContent = msg;
    document.body.appendChild(err);
}

function onWindowResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
}

// ============================================
// ANIMATION LOOP
// ============================================

function animate() {
    requestAnimationFrame(animate);
    
    if (gameInitialized && gameRunning) {
        world.step(1 / 60);
        updateCarPhysics();
        checkFinishLine();
        updateHUD();
        updateCamera();
    }
    
    if (gameInitialized && renderer) {
        renderer.render(scene, camera);
    }
}

// ============================================
// STARTUP
// ============================================

console.log('📜 Game script loaded!');

window.addEventListener('load', () => {
    console.log('⏳ Page loaded, initializing game...');
    setTimeout(() => {
        initGame();
    }, 100);
});

window.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM ready');
});

