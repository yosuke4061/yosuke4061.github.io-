import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DragControls } from 'three/addons/controls/DragControls.js';
import { GUI } from 'dat.gui';
import Stats from 'three/addons/libs/stats.module.js';
let scene, camera, renderer, controls, stats;

let grass;

function createTerrainAndAddGrass() {
    // 地形のジオメトリを作成
    const terrainGeometry = new THREE.PlaneGeometry(800, 800, 64, 64);
    // テクスチャを読み込む
    const textureLoader = new THREE.TextureLoader();
    const terrainTexture = textureLoader.load('terrain1.jpg', (texture) => {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        const scale = 200 / Math.max(texture.image.width, texture.image.height);
        texture.repeat.set(texture.image.width * scale, texture.image.height * scale);
    });
    // 地形のマテリアルを作成
    const terrainMaterial = new THREE.MeshStandardMaterial({
        map: terrainTexture,
        wireframe: false
    });
    // 地形のメッシュを作成
    const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    scene.add(terrain);

    // 草の追加
    const PLANE_WIDTH = 800;
    const PLANE_HEIGHT = 800;
    const BLADE_COUNT = 50000;
    const BLADE_HEIGHT = 10;
    const BLADE_HEIGHT_VARIATION = 15.0;
    const BLADE_WIDTH = 5.0;
    const random = linearCongruentialGenerator(123456789);

    const positions = [];
    const colors = [];
    const indices = [];
    let index = 0;

    for (let i = 0; i < BLADE_COUNT; i++) {
        const x = random() * PLANE_WIDTH - PLANE_WIDTH / 2;
        const y = random() * PLANE_HEIGHT - PLANE_HEIGHT / 2;
        const height = BLADE_HEIGHT + random() * BLADE_HEIGHT_VARIATION;
        const sway = random() * 0.1;
        const swayPhase = random() * Math.PI * 2;

        const baseX1 = x - BLADE_WIDTH / 2;
        const baseX2 = x + BLADE_WIDTH / 2;
        const baseY = -5;
        const baseZ = y;
        const midX = x + sway * 5 * Math.sin(swayPhase);
        const midY = height * 0.3;
        const midZ = y + sway * 5 * Math.cos(swayPhase);
        const tipX = x;
        const tipY = height;
        const tipZ = y;

        positions.push(baseX1, baseY, baseZ, midX, midY, midZ, tipX, tipY, tipZ);
        positions.push(baseX2, baseY, baseZ, midX, midY, midZ, tipX, tipY, tipZ);

        // 緑色の濃淡をよりダイナミックにランダムに設定
        const redIntensity = 0.05 * random(); // 赤は非常に控えめに
        const greenIntensity = 0.3 + 0.7 * random(); // 緑は広い範囲でランダムに
        const blueIntensity = 0.05 * random(); // 青も非常に控えめに
        colors.push(redIntensity, greenIntensity, blueIntensity, redIntensity, greenIntensity, blueIntensity, redIntensity, greenIntensity, blueIntensity);
        colors.push(redIntensity, greenIntensity, blueIntensity, redIntensity, greenIntensity, blueIntensity, redIntensity, greenIntensity, blueIntensity);

        indices.push(index, index + 1, index + 2);
        indices.push(index + 3, index + 4, index + 5);
        index += 6;
    }

    const grassGeometry = new THREE.BufferGeometry();
    grassGeometry.setIndex(indices);
    grassGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    grassGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const vertexShaderSource = `
    uniform float time;
    varying vec3 vColor;
    
    void main() {
        vColor = color;
        vec3 pos = position;
        float angle = sin(time + position.x * 0.5) * 0.1;
        pos.x += angle * (sin(time) * 2.0);
        pos.z += angle * (cos(time) * 2.0);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
    `;

    const fragmentShaderSource = `
    varying vec3 vColor;
    uniform float lightIntensity;

    void main() {
        vec3 light = vec3(lightIntensity, lightIntensity, lightIntensity);
        gl_FragColor = vec4(vColor * light, 1.0);
    }
    `;

    const grassMaterial = new THREE.ShaderMaterial({
        vertexShader: vertexShaderSource,
        fragmentShader: fragmentShaderSource,
        uniforms: {
            lightIntensity: { value: 1.0 },
            time: { value: 0 }
        },
        vertexColors: true,
        side: THREE.DoubleSide
    });

    grass = new THREE.Mesh(grassGeometry, grassMaterial);
    grass.rotation.x = Math.PI / 2;
    terrain.add(grass);

    function linearCongruentialGenerator(seed) {
        const a = 1664525;
        const c = 1013904223;
        const m = 4294967296; // 2^32
        let last = seed;
        return function() {
            last = (a * last + c) % m;
            return last / m;
        };
    }
    
    function animateGrass() {
        const time = performance.now() / 2500;
        const positions = grass.geometry.attributes.position.array;
        const swayAmplitude = 6.0;

        for (let i = 0; i < positions.length; i += 9) {
            const initialX = positions[i];
            const initialZ = positions[i + 2];

            const swayX = swayAmplitude * (Math.sin(time + initialX) + Math.sin(2 * time + initialX / 2) / 2);
            const swayZ = swayAmplitude * (Math.cos(time + initialZ) + Math.cos(2 * time + initialZ / 2) / 2);

            positions[i + 3] = initialX + swayX;
            positions[i + 5] = initialZ + swayZ;
            positions[i + 6] = initialX + swayX;
            positions[i + 8] = initialZ + swayZ;
        }

        grass.geometry.attributes.position.needsUpdate = true;
    }

    addAnimationCallback(animateGrass);
}

function init() {
    // カメラの作成: 視野角75度、アスペクト比はウィンドウの幅/高さ、視野の範囲は0.1から1000
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 10); // カメラの位置を設定
    camera.lookAt(new THREE.Vector3(0, 0, 0)); // カメラの視点を原点に設定

    // レンダラーの作成: アンチエイリアスを有効にしてクオリティを向上
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight); // レンダラーのサイズをウィンドウに合わせる
    document.body.appendChild(renderer.domElement); // レンダラーをDOMに追加


    setupScene(); // シーンの設定
 
    // 非同期処理を管理する配列: シーンとコントロールの設定を非同期で行う
    let asyncInitTasks = [
        () => new Promise(resolve => {
            setupControls(); // コントロールの設定
            resolve();
        }),
        () => new Promise(resolve => {
            createTerrainAndAddGrass(); // コントロールの設定
            resolve();
        })
        // 他の非同期処理を追加する場合はここに関数を追加
    ];

    // スタートボタンの設定: クリック時に非同期処理を実行し、アニメーションを開始
    let startButton = document.getElementById('startButton');
    startButton.addEventListener('click', () => {
        startButton.style.display = 'none'; // スタートボタンを非表示にする
        document.getElementById('loadingIndicator').style.display = 'block'; // ローディングインジケーターを表示

        // 非同期処理の実行: 全てのタスクが完了したらアニメーションを開始
        Promise.all(asyncInitTasks.map(task => task())).then(() => {
            startAnimation(); // アニメーションの開始
            document.getElementById('loadingIndicator').style.display = 'none'; // ローディングインジケーターを非表示にする
        });
    });

    // ウィンドウリサイズイベントの設定: ウィンドウサイズが変更された時にカメラとレンダラーを更新
    window.addEventListener('resize', onWindowResize, false);
}

function startAnimation() {
    // グリッドヘルパーを作成し、シーンに追加します。これにより、座標軸が見やすくなります。
    const gridHelper = new THREE.GridHelper(100, 100); // 100x100のグリッド
    scene.add(gridHelper);

    // XYZ軸を示す矢印ヘルパーを作成し、シーンに追加します。これにより、方向が分かりやすくなります。
    const axesHelper = new THREE.AxesHelper(10); // 各軸の長さは10
    scene.add(axesHelper);

    // Statsオブジェクトを作成し、パフォーマンスの統計情報を画面に表示します。
    stats = new Stats();
    stats.domElement.style.position = 'absolute'; // スタイルを絶対位置指定に設定
    stats.domElement.style.top = '0px'; // 上端からの位置
    stats.domElement.style.right = '0px'; // 右端からの位置
    stats.domElement.style.left = 'auto'; // 左端の位置指定を自動に設定
    document.body.appendChild(stats.dom); // DOMに統計情報を追加

    //カメラ位置を調整するGUIコントローラー
    const gui = new GUI();
    gui.domElement.style.position = 'absolute'; // 絶対位置指定
    gui.domElement.style.right = '0px'; // 右端からの位置
    gui.domElement.style.top = '10px'; // 上から15pxの位置に設定

    const camFolder = gui.addFolder('Camera Position');
    camFolder.add(camera.position, 'x', -100, 100).step(0.1).name('X Position');
    camFolder.add(camera.position, 'y', -100, 100).step(0.1).name('Y Position');
    camFolder.add(camera.position, 'z', -100, 100).step(0.1).name('Z Position');
    camFolder.open(); // GUIを開いた状態で表示

    animate(); // アニメーションループを開始します。これにより、シーンが動的に更新され続けます。
}

function setupScene() {
    // シーン設定用の定数
    const SCENE_SETTINGS = {
        backgroundColor: 0xffffff,  // 背景色を白に設定
        fogColor: 0x000000,         // 霧の色を黒に設定
        fogNear: 1,                 // 霧の開始距離
        fogFar: 300,                // 霧の終了距離
        ambientLightColor: 0xFFFFFF // 環境光の色を白に設定
    };

    // シーンの初期化
    scene = new THREE.Scene();
    scene.background = new THREE.Color(SCENE_SETTINGS.backgroundColor); // 背景色の設定
    scene.fog = new THREE.Fog(SCENE_SETTINGS.fogColor, SCENE_SETTINGS.fogNear, SCENE_SETTINGS.fogFar); // 霧の設定

    // 環境光の追加
    const ambientLight = new THREE.AmbientLight(SCENE_SETTINGS.ambientLightColor, 0.5); // 環境光を追加し、光の強度を0.5に設定
    scene.add(ambientLight);

    // 平行光源の追加と設定
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8); // 白色の平行光源を追加し、光の強度を0.8に設定
    directionalLight.position.set(0, 300, 500); // 光源の位置を設定
    directionalLight.castShadow = true; // 影の生成を有効にする
    scene.add(directionalLight);

    // スポットライトの追加
    const spotLight = new THREE.SpotLight(0xffffff, 0.7, 1000, Math.PI / 4, 0.5, 2); // 白色のスポットライトを追加し、光の強度を0.7に設定
    spotLight.position.set(100, 300, 100); // スポットライトの位置を設定
    spotLight.castShadow = true; // 影の生成を有効にする
    scene.add(spotLight);

    // ポイントライトの追加
    const pointLight = new THREE.PointLight(0xffffff, 0.5, 500); // 白色のポイントライトを追加し、光の強度を0.5に設定
    pointLight.position.set(-100, 200, -100); // ポイントライトの位置を設定
    scene.add(pointLight);

    // シャドウマップの設定
    renderer.shadowMap.enabled = true; // シャドウマップを有効にする
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // シャドウマップのタイプをPCFソフトシャドウマップに設定
    directionalLight.shadow.mapSize.width = 2048; // 平行光源のシャドウマップの幅を2048に設定
    directionalLight.shadow.mapSize.height = 2048; // 平行光源のシャドウマップの高さを2048に設定
    spotLight.shadow.mapSize.width = 2048; // スポットライトのシャドウマップの幅を2048に設定
    spotLight.shadow.mapSize.height = 2048; // スポットライトのシャドウマップの高さを2048に設定
}

function setupControls() {
    // OrbitControlsのインスタンスを作成し、カメラとレンダラーのDOM要素を関連付けます。
    controls = new OrbitControls(camera, renderer.domElement);

    // コントロールのダンピング（慣性）を有効にします。
    controls.enableDamping = true;
    controls.dampingFactor = 0.05; // ダンピングの強度を設定します。

    // スクリーン空間でのパン操作を有効にします。
    controls.screenSpacePanning = true;

    // ポーラ角（上下の回転制限）を設定します。
    controls.maxPolarAngle = Math.PI; // 最大180度
    controls.minPolarAngle = 0; // 最小0度

    // アジマス角（左右の回転制限）を設定します。
    controls.maxAzimuthAngle = Math.PI; // 最大180度
    controls.minAzimuthAngle = -Math.PI; // 最小-180度

    // パン操作を有効にします。
    controls.enablePan = true;

    // スマートフォンでの二点タッチによるパン操作を有効にします。
    controls.enableTouchPan = true;

    // デバイスがモバイルかどうかでパン速度とタッチ時のダンピングを調整します。
    if (/Mobi|Android/i.test(navigator.userAgent)) {
        controls.panSpeed = 0.3; // モバイルデバイスのパン速度
        controls.touchDampingFactor = 0.2; // モバイルデバイスのタッチダンピング
    } else {
        controls.panSpeed = 0.5; // 非モバイルデバイスのパン速度
        controls.touchDampingFactor = 0.1; // 非モバイルデバイスのタッチダンピング
    }
}
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// アニメーションコールバックを管理する配列
let animationCallbacks = [];

// アニメーションコールバックを追加する関数
// @param {Function} callback - アニメーション中に実行されるコールバック関数
function addAnimationCallback(callback) {
    animationCallbacks.push(callback); // 配列にコールバックを追加
}

// アニメーションを管理する関数
function animate() {
    requestAnimationFrame(animate); // 次の描画タイミングでanimate関数を再度呼び出す
    controls.update(); // カメラコントロールを更新

    // 登録されたすべてのアニメーションコールバックを実行
    animationCallbacks.forEach(callback => {
        callback(); // 各コールバック関数を実行
    });

    renderer.render(scene, camera); // シーンとカメラを使ってレンダリング
    stats.update(); // パフォーマンス統計を更新
}

// 使い方:
// アニメーションループに新しい動作を追加したい場合は、addAnimationCallbackを使用してください。
// 例: addAnimationCallback(() => { console.log("アニメーションフレーム!"); });

init();
