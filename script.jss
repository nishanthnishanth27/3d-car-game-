/**
 * ============================================
 * 3D RACING GAME - MAIN GAME ENGINE
 * Built with Three.js (3D) and Cannon.js (Physics)
 * By Nishanth KN
 * ============================================
 */

// ============================================
// SCENE SETUP & INITIALIZATION
// ============================================

let scene, camera, renderer;
let world; // Cannon.js physics world
let gameRunning = false;
let lapStartTime = 0;
let currentLapTime = 0;
let lapCount = 0;
let finishLineCrossed = false;

// Game Settings
const gameSettings = {
    audioEnabled: true,
    graphicsQuality: 'high',
    volume: 70,
};

// Initialize the game
function initGame() {
    // THREE.JS SCENE SETUP
    // Create the main scene, camera, and renderer
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1f4a);
    scene.fog = new THREE.Fog(0x1a1f4a, 500, 1000);

    // Camera Setup
    // Positioned behind the car for optimal view
    camera = new THREE.PerspectiveCamera(
        75, 
        window.innerWidth / window.innerHeight, 
        0.1, 
        2000
    );
    camera.position.set(0, 15, -30);
    camera.lookAt(0, 0, 0);

    // Renderer Configuration
    renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        powerPreference: 'high-performance' 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = gameSettings.graphicsQuality === 'high';
    renderer.shadowMap.type = THREE.PCFShadowShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    document.getElementById('gameContainer').appendChild(renderer.domElement);

    // CANNON.JS PHYSICS WORLD SETUP
    // Initialize physics engine with gravity
    world = new CANNON.World();
    world.gravity.set(0, -20, 0); // Gravity pointing downward
    world.defaultContactMaterial.friction = 0.4;
    world.defaultContactMaterial.restitution = 0.3;

    // Create ground physics material with custom friction
    const groundMaterial = new CANNON.Material('ground');
    const groundContact = new CANNON.ContactMaterial(groundMaterial, groundMaterial);
    groundContact.friction = 0.8;
    groundContact.restitution = 0.2;
    world.addContactMaterial(groundContact);

    // Build scene elements
    createLights();
    createGround();
    createRaceTrack();
    createFinishLine();
    createRaceCar();
    createEnvironment();

    // Event listeners
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Settings event listeners
    document.getElementById('settingsBtn').addEventListener('click', openSettings);
    document.getElementById('closeSettings').addEventListener('click', closeSettings);
    document.getElementById('applySettingsBtn').addEventListener('click', applySettings);
    document.getElementById('resetGameBtn').addEventListener('click', resetGame);
    document.getElementById('audioToggle').addEventListener('change', updateAudioStatus);
    document.getElementById('volumeSlider').addEventListener('input', updateVolumeDisplay);
    document.getElementById('graphicsSelect').addEventListener('change', updateGraphics);

    // Tutorial screen
    document.getElementById('startGameBtn').addEventListener('click', startGame);

    // Finish line button
    document.getElementById('continueBtn').addEventListener('click', continueLap);

    // Start game loop
    gameRunning = true;
    lapStartTime = Date.now();
    animate();
}

// ============================================
// LIGHTING SETUP
// ============================================

function createLights() {
    // Ambient light for overall illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Directional light (sun) with shadows
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(100, 100, 50);
    directionalLight.castShadow = gameSettings.graphicsQuality === 'high';
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.left = -200;
    directionalLight.shadow.camera.right = 200;
    directionalLight.shadow.camera.top = 200;
    directionalLight.shadow.camera.bottom = -200;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 500;
    scene.add(directionalLight);

    // Point light for atmospheric glow
    const pointLight = new THREE.PointLight(0x00d4ff, 0.5);
    pointLight.position.set(0, 30, 0);
    scene.add(pointLight);
}

// ============================================
// GROUND & TRACK CREATION
// ============================================

function createGround() {
    // Create ground mesh
    const groundGeometry = new THREE.PlaneGeometry(400, 400);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x2a5f4a });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = gameSettings.graphicsQuality === 'high';
    scene.add(ground);

    // Create ground physics body
    const groundShape = new CANNON.Plane();
    const groundBody = new CANNON.Body({
        mass: 0, // Static body
        shape: groundShape,
        material: new CANNON.Material('ground')
    });
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    world.addBody(groundBody);
}

function createRaceTrack() {
    // Create a racing circuit with curves
    // Simple oval track

    // Track outer boundary (visual only)
    const trackOuterGeometry = new THREE.BufferGeometry();
    const trackOuterPoints = [];
    const trackRadius = 80;
    const straightLength = 60;

    // Create oval shape points
    for (let i = 0; i <= 100; i++) {
        const angle = (i / 100) * Math.PI * 2;
        const x = Math.cos(angle) * trackRadius;
        const z = Math.sin(angle) * (trackRadius / 2) + (i < 50 ? straightLength / 2 : -straightLength / 2);
        trackOuterPoints.push(new THREE.Vector3(x, 0.01, z));
    }

    // Create track visual (stripe pattern)
    const trackMaterial = new THREE.MeshLambertMaterial({ color: 0x222233 });
    const trackShape = new THREE.LatheGeometry(trackOuterPoints.map(p => new THREE.Vector2(0, p.z)), 1);
    
    // Simpler track visualization - create a path
    const trackGeometry = new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 0.01, 60),
            new THREE.Vector3(80, 0.01, 30),
            new THREE.Vector3(80, 0.01, -30),
            new THREE.Vector3(0, 0.01, -60),
            new THREE.Vector3(-80, 0.01, -30),
            new THREE.Vector3(-80, 0.01, 30),
            new THREE.Vector3(0, 0.01, 60)
        ]),
        64,
        25,
        8,
        false
    );
    
    const track = new THREE.Mesh(trackGeometry, trackMaterial);
    track.castShadow = gameSettings.graphicsQuality === 'high';
    track.receiveShadow = gameSettings.graphicsQuality === 'high';
    scene.add(track);

    // Add track boundaries (visual barriers)
    const boundaryMaterial = new THREE.MeshLambertMaterial({ color: 0xff4444 });
    const boundaryGeometry = new THREE.CylinderGeometry(1, 1, 10, 8);

    // Left boundary
    const leftBoundaryGroup = new THREE.Group();
    for (let i = 0; i < 20; i++) {
        const angle = (i / 20) * Math.PI * 2;
        const boundaryMesh = new THREE.Mesh(boundaryGeometry, boundaryMaterial);
        boundaryMesh.position.set(
            Math.cos(angle) * 100,
            5,
            Math.sin(angle) * 50
        );
        boundaryMesh.scale.set(3, 2, 2);
        leftBoundaryGroup.add(boundaryMesh);
    }
    scene.add(leftBoundaryGroup);
}

function createFinishLine() {
    // Create finish line marker at start position
    const finishLineGeometry = new THREE.PlaneGeometry(40, 2);
    const finishLineMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffffff,
        side: THREE.DoubleSide
    });
    const finishLine = new THREE.Mesh(finishLineGeometry, finishLineMaterial);
    finishLine.position.set(0, 0.5, 60);
    finishLine.rotation.x = -Math.PI / 2;
    finishLine.userData.isFinishLine = true;
    scene.add(finishLine);

    // Add checkered pattern to finish line
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
    finishLine.material.needsUpdate = true;
}

function createEnvironment() {
    // Add some trees/scenery around the track for depth
    const treeGeometry = new THREE.ConeGeometry(10, 30, 8);
    const treeMaterial = new THREE.MeshLambertMaterial({ color: 0x2a5f4a });

    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const tree = new THREE.Mesh(treeGeometry, treeMaterial);
        tree.position.set(
            Math.cos(angle) * 130,
            15,
            Math.sin(angle) * 70
        );
        tree.castShadow = gameSettings.graphicsQuality === 'high';
        scene.add(tree);
    }
}

// ============================================
// RACE CAR CREATION & PHYSICS
// ============================================

const carState = {
    mesh: null,
    body: null,
    velocity: new CANNON.Vec3(0, 0, 0),
    speed: 0,
    acceleration: 0,
    currentSteer: 0,
    steering: 0,
    isAccelerating: false,
    isBraking: false,
    isHandbraking: false,
    maxSpeed: 150, // km/h equivalent
    acceleration_rate: 0.5,
    brake_rate: 0.3,
    turn_speed: 0.1,
    friction: 0.95
};

function createRaceCar() {
    // Create car mesh (simple box shape)
    const carGeometry = new THREE.BoxGeometry(2, 1.5, 4);
    const carMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xff0000,
        metalness: 0.6,
        roughness: 0.3
    });
    carState.mesh = new THREE.Mesh(carGeometry, carMaterial);
    carState.mesh.position.set(0, 1, 50);
    carState.mesh.castShadow = gameSettings.graphicsQuality === 'high';
    carState.mesh.receiveShadow = gameSettings.graphicsQuality === 'high';
    scene.add(carState.mesh);

    // Create car physics body using Cannon.js
    // Car body shape (box)
    const carShape = new CANNON.Box(new CANNON.Vec3(1, 0.75, 2));
    carState.body = new CANNON.Body({
        mass: 1, // Dynamic body
        shape: carShape,
        linearDamping: 0.3,
        angularDamping: 0.5
    });
    carState.body.position.set(0, 1, 50);
    world.addBody(carState.body);

    // Add wheels (visual only - simplified suspension)
    const wheelGeometry = new THREE.CylinderGeometry(0.6, 0.6, 0.4, 16);
    const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });

    const wheelPositions = [
        new THREE.Vector3(-1, 0.3, 1),
        new THREE.Vector3(1, 0.3, 1),
        new THREE.Vector3(-1, 0.3, -1),
        new THREE.Vector3(1, 0.3, -1)
    ];

    wheelPositions.forEach(pos => {
        const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.copy(pos);
        carState.mesh.add(wheel);
    });
}

// ============================================
// INPUT HANDLING
// ============================================

const keys = {};

function onKeyDown(event) {
    keys[event.key.toLowerCase()] = true;

    switch(event.key.toLowerCase()) {
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
    keys[event.key.toLowerCase()] = false;

    switch(event.key.toLowerCase()) {
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

// ============================================
// CAR PHYSICS & MOVEMENT
// ============================================

function updateCarPhysics() {
    // Steering input
    carState.steering = 0;
    if (keys['a'] || keys['arrowleft']) {
        carState.steering = carState.turn_speed;
    }
    if (keys['d'] || keys['arrowright']) {
        carState.steering = -carState.turn_speed;
    }

    // Apply steering to car rotation
    const currentQuat = carState.body.quaternion;
    const steerAxis = new CANNON.Vec3(0, 1, 0);
    const steerQuaternion = new CANNON.Quaternion();
    steerQuaternion.setFromAxisAngle(steerAxis, carState.steering);
    
    const newQuat = carState.body.quaternion.mult(steerQuaternion);
    carState.body.quaternion = newQuat;

    // Get car forward direction
    const forward = new THREE.Vector3(0, 0, 1);
    forward.applyQuaternion(carState.mesh.quaternion);

    // Acceleration/Braking
    if (carState.isAccelerating) {
        carState.acceleration = Math.min(carState.acceleration + carState.acceleration_rate, carState.maxSpeed);
    } else if (carState.isBraking) {
        carState.acceleration = Math.max(carState.acceleration - carState.brake_rate * 2, -carState.maxSpeed * 0.5);
    } else {
        // Natural friction deceleration
        carState.acceleration *= carState.friction;
    }

    // Handbrake/Drift logic (increases friction for dramatic turn)
    const effectiveAccel = carState.isHandbraking ? carState.acceleration * 0.6 : carState.acceleration;

    // Apply velocity to car body
    carState.body.velocity.x = forward.x * effectiveAccel * 0.2;
    carState.body.velocity.z = forward.z * effectiveAccel * 0.2;

    // Update mesh position and rotation from physics
    carState.mesh.position.copy(carState.body.position);
    carState.mesh.quaternion.copy(carState.body.quaternion);

    // Calculate speed in km/h (for display)
    carState.speed = carState.acceleration;

    // Clamp car below ground to prevent falling
    if (carState.body.position.y < -50) {
        carState.body.position.set(0, 1, 50);
        carState.body.velocity.set(0, 0, 0);
        carState.acceleration = 0;
    }
}

// ============================================
// FINISH LINE DETECTION
// ============================================

function checkFinishLine() {
    const finishLineZ = 60;
    const tolerance = 5;

    // Simple Z-position check
    if (Math.abs(carState.body.position.z - finishLineZ) < tolerance) {
        if (!finishLineCrossed) {
            finishLineCrossed = true;
            onFinishLineCrossed();
        }
    } else if (Math.abs(carState.body.position.z - finishLineZ) > tolerance * 2) {
        finishLineCrossed = false;
    }
}

function onFinishLineCrossed() {
    if (!gameRunning) return;

    currentLapTime = (Date.now() - lapStartTime) / 1000;
    lapCount++;

    // Format time
    const minutes = Math.floor(currentLapTime / 60);
    const seconds = Math.floor(currentLapTime % 60);
    const milliseconds = Math.floor((currentLapTime * 1000) % 1000);
    const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(milliseconds).padStart(3, '0')}`;

    // Show finish popup
    document.getElementById('finishTime').textContent = `Lap Time: ${timeString}`;
    document.getElementById('finishPopup').classList.remove('hidden');

    // Play sound if enabled
    if (gameSettings.audioEnabled) {
        playFinishSound();
    }
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
    // Update speed display (convert to km/h)
    const displaySpeed = Math.abs(Math.round(carState.speed));
    document.getElementById('speedValue').textContent = displaySpeed;

    // Update lap timer
    if (gameRunning) {
        currentLapTime = (Date.now() - lapStartTime) / 1000;
        const minutes = Math.floor(currentLapTime / 60);
        const seconds = Math.floor(currentLapTime % 60);
        const milliseconds = Math.floor((currentLapTime * 1000) % 1000);
        const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(milliseconds).padStart(3, '0')}`;
        document.getElementById('timerValue').textContent = timeString;
    }
}

// ============================================
// CAMERA FOLLOW SYSTEM
// ============================================

function updateCamera() {
    // Dynamic camera following car
    const cameraDistance = 30;
    const cameraHeight = 12;
    
    // Get car forward direction
    const forward = new THREE.Vector3(0, 0, 1);
    forward.applyQuaternion(carState.mesh.quaternion);

    // Position camera behind car
    const targetPos = new THREE.Vector3(
        carState.mesh.position.x - forward.x * cameraDistance,
        carState.mesh.position.y + cameraHeight,
        carState.mesh.position.z - forward.z * cameraDistance
    );

    // Smooth camera movement
    camera.position.lerp(targetPos, 0.1);
    camera.lookAt(carState.mesh.position.x, carState.mesh.position.y + 2, carState.mesh.position.z);
}

// ============================================
// SETTINGS & MENU FUNCTIONS
// ============================================

function openSettings() {
    document.getElementById('settingsModal').classList.remove('hidden');
}

function closeSettings() {
    document.getElementById('settingsModal').classList.add('hidden');
}

function applySettings() {
    gameSettings.audioEnabled = document.getElementById('audioToggle').checked;
    gameSettings.graphicsQuality = document.getElementById('graphicsSelect').value;
    gameSettings.volume = parseInt(document.getElementById('volumeSlider').value);
    
    // Update graphics if quality changed
    updateGraphicsQuality();
    
    closeSettings();
}

function updateAudioStatus() {
    const status = document.getElementById('audioToggle').checked ? 'ON' : 'OFF';
    document.getElementById('audioStatus').textContent = status;
}

function updateVolumeDisplay() {
    const volume = document.getElementById('volumeSlider').value;
    document.getElementById('volumeValue').textContent = volume + '%';
}

function updateGraphics() {
    // Placeholder - would update render settings
}

function updateGraphicsQuality() {
    if (gameSettings.graphicsQuality === 'low') {
        renderer.shadowMap.enabled = false;
    } else {
        renderer.shadowMap.enabled = true;
    }
}

function resetGame() {
    // Reset car position and physics
    carState.body.position.set(0, 1, 50);
    carState.body.velocity.set(0, 0, 0);
    carState.body.quaternion.set(0, 0, 0, 1);
    carState.acceleration = 0;
    carState.speed = 0;
    
    lapCount = 0;
    lapStartTime = Date.now();
    document.getElementById('lapValue').textContent = '0';
    
    closeSettings();
}

function startGame() {
    document.getElementById('tutorialOverlay').classList.add('hidden');
    gameRunning = true;
    lapStartTime = Date.now();
}

// ============================================
// SOUND EFFECTS (Placeholder)
// ============================================

function playFinishSound() {
    // Placeholder for finish line sound
    // In production, would use Web Audio API or load audio files
    console.log('Finish line sound (muted)');
}

// ======================
// ANIMATION LOOP
// ============================================

function animate() {
    requestAnimationFrame(animate);

    if (gameRunning) {
        // Update physics
        world.step(1 / 60); // 60 FPS physics step
        
        // Update game
        updateCarPhysics();
        checkFinishLine();
        updateHUD();
        updateCamera();
    }

    // Render scene
    renderer.render(scene, camera);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
}

// ============================================
// INITIALIZE GAME ON PAGE LOAD
// ============================================

window.addEventListener('load', () => {
    initGame();
});
