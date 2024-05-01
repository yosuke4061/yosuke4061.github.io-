let scene, camera, renderer, controls, startButton,stats;

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const gridHelper = new THREE.GridHelper(100, 100);
    scene.add(gridHelper);

    const light = new THREE.PointLight(0xffffff, 1, 100);
    light.position.set(10, 10, 10);
    scene.add(light);

    startButton = document.getElementById('startButton');
    startButton.addEventListener('click', () => {
        startButton.style.display = 'none';
        setTimeout(startAnimation, 3000);
    });

    window.addEventListener('resize', onWindowResize, false);


    setupControls();

    addEnhancedSmokeEffect();
}




function setupControls() {
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = true;
    controls.maxPolarAngle = Math.PI / 2;
    controls.minPolarAngle = -Math.PI / 4;
    controls.maxAzimuthAngle = Math.PI / 4;
    controls.minAzimuthAngle = -Math.PI / 4;
    controls.enablePan = true;
    
    // デバイスの種類に基づいてパラメータを調整
    if (/Mobi|Android/i.test(navigator.userAgent)) {
        // スマートフォン用の設定
        controls.panSpeed = 0.3; // パンの速度を低く設定
        controls.touchDampingFactor = 0.2; // タッチ操作時のダンピング係数を高く設定
    } else {
        // PC用の設定
        controls.panSpeed = 0.5; // パンの速度を標準に設定
        controls.touchDampingFactor = 0.1; // タッチ操作時のダンピング係数を標準に設定
    }
}

function addEnhancedSmokeEffect() {
    const particles = 10000; // パーティクルの数を増やす
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];
    const color = new THREE.Color();

    for (let i = 0; i < particles; i++) {
        const x = Math.random() * 2000 - 1000;
        const y = Math.random() * 2000 - 1000;
        const z = Math.random() * 2000 - 1000;
        positions.push(x, y, z);

        // 完全にランダムな色を設定
        color.setRGB(Math.random(), Math.random(), Math.random());
        colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 1.5,
        vertexColors: true,
        transparent: true,
        opacity: 0.5,
        sizeAttenuation: true
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);
}



function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function startAnimation() {
    animate();
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

init();