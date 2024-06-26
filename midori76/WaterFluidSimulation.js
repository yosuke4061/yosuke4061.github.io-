/*
コンストラクタ 1
scene: THREE.jsのシーンオブジェクト。インスタンス作成時に外部から渡される。
particleSystem: THREE.Group オブジェクト。すべてのパーティクルを保持。
particles: パーティクルオブジェクトの配列。
options: パーティクル設定オブジェクト。以下のプロパティを含む:
particleCount: パーティクルの総数。
particleSize: パーティクルのサイズ。
particleColor: パーティクルの色。
cohesionDistance: 粒子が結合する距離の係数。
gravity: 重力設定。THREE.Vector3 オブジェクト。デフォルトは地球の重力加速度。
bounds: X軸とZ軸の境界の大きさ。
heightBounds: Y軸の境界の大きさ。
deltaTime: フレームレートの逆数（秒単位の時間ステップ）。
initParticles
geometry: THREE.SphereGeometry オブジェクト。パーティクルの形状設定用。
material: THREE.ShaderMaterial オブジェクト。パーティクルの材質設定用。
startHeight: パーティクルが生成される開始高さ。
count: 生成されたパーティクルの数をカウントする変数。
calculateDensityAndPressure
kernelRadius: カーネル関数の半径。粒子間の相互作用の影響範囲を決定。
calculateForces
pressureForce: 圧力による力を計算するための THREE.Vector3 オブジェクト。
viscosityForce: 粘性による力を計算するための THREE.Vector3 オブジェクト。
applySurfaceTension
surfaceTensionCoefficient: 表面張力の係数。粒子間の表面張力の影響を調整。
applyViscosity
viscosity: 粘性係数。粒子間の粘性の強さを調整。
applyCohesion
cohesionStrength: 凝集力の強度。粒子間の引力の強さを調整。
applyRepulsion
repulsionStrength: 反発力の強度。
idealDistance: 粒子間の理想的な距離。
update
activationProbability: 粒子をアクティブにする確率。
initialVelocityY: アクティブ化時の初期Y方向速度。
restitutionCoefficient: 反発係数。

*/

import * as THREE from 'three';

export class WaterFluidSimulation {
    constructor(scene) {
        this.scene = scene; // THREE.jsのシーンオブジェクト
    
        this.particleSystem = new THREE.Group(); // パーティクルシステムのグループ
        this.particles = []; // パーティクルオブジェクトを格納する配列
        this.options = {
            particleCount: 100, // パーティクルの総数
            particleSize: 5, // パーティクルのサイズ
            particleColor: 0x00ff00, // パーティクルの色（緑）
            cohesionDistance: 1.1, // 粒子の体積の1.1倍の距離まで結合できる
            kernelRadius: 45 // ここで kernelRadius を設定 (particleSize の3倍)
 
        };
        this.gravity = new THREE.Vector3(0, -9.8, 0); // 重力の設定（地球の重力加速度に近似）
        this.bounds = 50; // X軸とZ軸の境界の大きさ
        this.heightBounds = 1500; // Y軸の境界の大きさを別に設定
        this.deltaTime = 1 / 60; // フレームレートの逆数（秒単位の時間ステップ）
    
        // シェーダーマテリアルの設定
        this.shaderMaterial = new THREE.ShaderMaterial({
            vertexShader: `
                varying vec3 vNormal;
                varying vec3 vViewPosition;
                void main() {
                    vNormal = normalMatrix * normal; // 法線ベクトルの変換
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); // モデルビュー変換を適用
                    vViewPosition = -mvPosition.xyz; // 視点位置の計算
                    gl_Position = projectionMatrix * mvPosition; // 最終的な頂点の位置
                }
            `,
            fragmentShader: `
                varying vec3 vNormal;
                varying vec3 vViewPosition;
                uniform vec3 color; // ユニフォーム変数として色を受け取る
                void main() {
                    vec3 normalizedNormal = normalize(vNormal); // 法線の正規化
                    vec3 lightDirection = normalize(vec3(0.5, 0.5, 1.0)); // 簡単な光源方向
                    float lightIntensity = max(dot(normalizedNormal, lightDirection), 0.0); // 光の強度計算
                    vec3 diffuse = color * lightIntensity; // 拡散反射光の計算
                    gl_FragColor = vec4(diffuse, 1.0); // フラグメントの色
                }
            `,
            uniforms: {
                color: { value: new THREE.Color(this.options.particleColor) } // パーティクルの色を設定
            },
            transparent: true, // 透明度を有効化
            depthWrite: false // 深度バッファへの書き込みを無効化
        });
    
        this.initParticles(); // パーティクルの初期化関数を呼び出し
    }

    initParticles() {
        let startHeight = this.heightBounds - this.heightBounds; // 高さの初期値を設定
        let count = 0; // 生成されたパーティクルの数をカウント
        let delay = 0; // 初期遅延時間
    
        const generateParticle = () => {
            if (count >= this.options.particleCount) {
                return; // 生成上限に達したら生成を停止
            }
    
            // パーティクルのサイズをランダムに設定
            let randomSize = this.options.particleSize * (0.5 + Math.random()); // 最小サイズを particleSize の 50% とし、そこからランダムに増加
            const geometry = new THREE.SphereGeometry(randomSize, 16, 16); // ジオメトリの生成時にサイズを指定

            // 赤系の色でランダムに濃淡をつける。色相を少し変更して多様性を持たせる
            const hue = 0 + Math.random() * 40; // 0から40の範囲で色相を変更
            const saturation = 50 + Math.random() * 50; // 彩度は50%から100%の範囲
            const lightness = 30 + Math.random() * 40; // 明度は30%から70%の範囲
            const randomRed = new THREE.Color(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
            const material = this.shaderMaterial.clone();
            material.uniforms.color.value = randomRed;

            const particle = new THREE.Mesh(geometry, material);
            particle.position.x = (Math.random() - 0.5) * (this.bounds - randomSize * 2);
            particle.position.y = startHeight; // 粒子が生成される高さを設定
            particle.position.z = (Math.random() - 0.5) * (this.bounds - randomSize * 2);
            particle.userData.velocity = new THREE.Vector3(0, -0.01, 0); // 落下速度を設定
            particle.userData.mass = 1; // 粒子の質量
            particle.userData.isActive = true; // 初期状態でアクティブに設定
            particle.userData.lifetime = 5; // 粒子の生存時間を10秒に設定
    
            this.particleSystem.add(particle);
            this.particles.push(particle);
    
            count++; // 生成されたパーティクルの数を更新
            delay += 50; // 次の粒子生成までの遅延を増やす
            setTimeout(generateParticle, delay); // 次のパーティクル生成をスケジュール
        };
    
        generateParticle(); // 最初のパーティクル生成を開始
    
        this.scene.add(this.particleSystem);
    }
    
    calculateDensityAndPressure() {
        // カーネル半径を設定します。この値は粒子間の相互作用を計算する際の影響範囲を決定します。
        this.options.kernelRadius = this.particleSize*3; // カーネル半径は通常、粒子のサイズの数倍に設定されます。

        // 各粒子に対して密度と圧力を計算します
        this.particles.forEach(particle => {
            let density = 0; // 密度の初期値を0に設定

            // 他の全粒子との距離を計算して、カーネル半径内の粒子から密度を加算
            this.particles.forEach(otherParticle => {
                let r = particle.position.distanceTo(otherParticle.position); // 粒子間の距離
                if (r < this.options.kernelRadius) { // カーネル半径内の場合
                    // 密度計算式（カーネル関数を使用）
                    density += this.options.mass * this.kernelFunction(r, this.options.kernelRadius);
                }
            });

            // 計算された密度を元に圧力を計算
            particle.userData.density = density; // 粒子の密度を更新
            particle.userData.pressure = this.options.stiffness * (density - this.options.restDensity); // 圧力計算式
        });
    }

    // カーネル関数の例（ポリ6カーネル）
    kernelFunction(r, h) {
        if (r < 0 || r > h) return 0; // 範囲外の場合は0を返す
        const factor = 315 / (64 * Math.PI * Math.pow(h, 9));
        return factor * Math.pow(h * h - r * r, 3);
    }
    
    calculateForces() {
        const interactionRadius = this.particleSize*3; // interactionRadius を kernelRadius に設定
        let pressureForce = new THREE.Vector3();
        let viscosityForce = new THREE.Vector3();
        let grad = new THREE.Vector3();
        let velocityDiff = new THREE.Vector3();
    
        this.particles.forEach(particle => {
            pressureForce.set(0, 0, 0);
            viscosityForce.set(0, 0, 0);
    
            this.particles.forEach(otherParticle => {
                let r = particle.position.distanceTo(otherParticle.position);
                if (r < interactionRadius && r > 0) { // 距離が 0 より大きく interactionRadius 以下の場合のみ計算
                    const factor = -945 / (32 * Math.PI * Math.pow(this.options.kernelRadius, 9));
                    const r2 = r * r;
                    const h2 = this.options.kernelRadius * this.options.kernelRadius;
                    const coefficient = factor * (h2 - r2) * (3 * h2 - 7 * r2);
                    let direction = new THREE.Vector3().subVectors(particle.position, otherParticle.position).normalize();
                    grad.copy(direction.multiplyScalar(coefficient));
    
                    pressureForce.add(grad.multiplyScalar(-this.options.mass * (particle.userData.pressure + otherParticle.userData.pressure) / (2 * otherParticle.userData.density)));
    
                    velocityDiff.copy(otherParticle.userData.velocity).sub(particle.userData.velocity);
                    viscosityForce.add(velocityDiff.multiplyScalar(this.options.viscosity * this.options.mass / otherParticle.userData.density));
                }
            });
    
            let totalForce = new THREE.Vector3().addVectors(pressureForce, viscosityForce).add(this.gravity);
            particle.userData.velocity.add(totalForce.multiplyScalar(this.deltaTime / particle.userData.mass));
        });
    }

    applySurfaceTension() {
        // 表面張力の係数を設定します。この値を調整することで、粒子間の表面張力の影響を変更できます。
        const surfaceTensionCoefficient = 0.2; // 表面張力の値を高めに設定

        // 全ての粒子に対して表面張力を計算し適用します。
        this.particles.forEach((particle, index) => {
            let surfaceForce = new THREE.Vector3(0, 0, 0); // 表面張力のベクトルを初期化

            // 他の全粒子との相互作用を計算
            this.particles.forEach((otherParticle) => {
                if (particle !== otherParticle) { // 自分自身とは計算しない
                    let distance = particle.position.distanceTo(otherParticle.position); // 粒子間の距離を計算
                    // 距離が粒子サイズの2倍以下の場合、表面張力を計算
                    if (distance < this.options.particleSize * 2) {
                        let forceDirection = particle.position.clone().sub(otherParticle.position).normalize(); // 力の方向を計算
                        surfaceForce.add(forceDirection.multiplyScalar(surfaceTensionCoefficient)); // 表面張力を加算
                    }
                }
            });

            // 計算された表面張力を粒子の速度に適用
            particle.userData.velocity.add(surfaceForce.multiplyScalar(this.deltaTime / particle.userData.mass));
        });
    }

    applyForces() {
        // すべての粒子に対して力を適用します
        this.particles.forEach(particle => {
            // 重力による加速度を計算します
            const acceleration = this.gravity.clone().multiplyScalar(this.deltaTime / particle.userData.mass);
            // 粒子の速度に加速度を加算します
            particle.userData.velocity.add(acceleration);
        });
    }
    
    applyViscosity() {
        // 粘性係数を設定します。この値を調整することで、粒子間の粘性の強さを変更できます。
        const viscosity = 0.5; // 粘性係数をオプションから取得またはデフォルト値を使用

        // 全粒子に対して粘性力を計算し適用します。
        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                let particleI = this.particles[i];
                let particleJ = this.particles[j];

                // 二粒子間の距離ベクトルを計算します。
                let distanceVector = particleJ.position.clone().sub(particleI.position);
                let distance = distanceVector.length();

                // 距離が粒子サイズの2倍以下の場合、粘性力を計算します。
                if (distance < this.options.particleSize * 2) {
                    // 速度差を計算します。
                    let velocityDifference = particleI.userData.velocity.clone().sub(particleJ.userData.velocity);

                    // 粘性力を計算します。
                    let force = distanceVector.normalize().multiplyScalar(velocityDifference.dot(distanceVector) / distance * viscosity);

                    // 粘性力を粒子の速度に適用します。
                    particleI.userData.velocity.add(force.clone().multiplyScalar(1 / particleI.userData.mass));
                    particleJ.userData.velocity.sub(force.clone().multiplyScalar(1 / particleJ.userData.mass));
                }
            }
        }
    }
    applyCohesion() {
        // 凝集力の強度を設定します。この値を調整することで、粒子間の引力の強さを変更できます。
        const cohesionStrength = 0.05; // 凝集力の強度

        // 全粒子に対して凝集力を計算し適用します。
        this.particles.forEach((particle, index) => {
            let cohesionForce = new THREE.Vector3(0, 0, 0); // 凝集力のベクトルを初期化
            let neighborCount = 0; // 近隣の粒子数をカウント

            // 他の全粒子との相互作用を計算
            this.particles.forEach((otherParticle) => {
                if (particle !== otherParticle) { // 自分自身とは計算しない
                    let distance = particle.position.distanceTo(otherParticle.position); // 粒子間の距離を計算
                    let cohesionRange = this.options.particleSize * this.options.cohesionDistance; // 凝集力の作用範囲

                    // 凝集力の範囲内の場合、凝集力を計算
                    if (distance < cohesionRange) {
                        cohesionForce.add(otherParticle.position.clone().sub(particle.position)); // 力の方向を計算
                        neighborCount++; // 近隣粒子数をインクリメント
                    }
                }
            });

            // 近隣粒子が存在する場合、凝集力を粒子の速度に適用
            if (neighborCount > 0) {
                cohesionForce.divideScalar(neighborCount); // 平均の力を計算
                cohesionForce.normalize(); // 力のベクトルを正規化
                cohesionForce.multiplyScalar(cohesionStrength); // 凝集力の強度を乗算
                particle.userData.velocity.add(cohesionForce); // 粒子の速度に凝集力を加算
            }
        });
    }

    /*applyRepulsion()
    目的: 粒子間に反発力を適用し、粒子が互いに近づきすぎるのを防ぐことです。このメソッドは、粒子間の理想的な距離を保つために設計されています。
    計算: 粒子間の距離が一定範囲内にある場合に、反発力を計算して適用します。この力は、粒子が互いに離れるように作用します。 */
    applyRepulsion() {
        // 反発力の強度と理想的な距離を設定可能なオプションとして追加
        const repulsionStrength = 0.05; // 反発力の強度
        const idealDistance = this.options.particleSize * 3; // 理想的な距離

        // 全粒子に対して反発力を計算し適用
        this.particles.forEach((particle, index) => {
            let repulsionForce = new THREE.Vector3(0, 0, 0); // 反発力の初期ベクトル

            // 他の全粒子との相互作用を計算
            this.particles.forEach((otherParticle) => {
                if (particle !== otherParticle) { // 自分自身とは計算しない
                    let distance = particle.position.distanceTo(otherParticle.position); // 粒子間の距離を計算
                    // 理想的な距離より小さく、0より大きい場合に反発力を計算
                    if (distance < idealDistance && distance > 0) {
                        let forceDirection = particle.position.clone().sub(otherParticle.position).normalize(); // 力の方向を計算
                        repulsionForce.add(forceDirection.multiplyScalar(repulsionStrength * (idealDistance - distance))); // 反発力を加算
                    }
                }
            });

            // 計算された反発力を粒子の速度に適用
            particle.userData.velocity.add(repulsionForce);
        });
    }

    update() {
        // 設定可能なパラメータ
        const activationProbability = 0.01; // 粒子をアクティブにする確率
        const initialVelocityY = 5; // アクティブ化時の初期Y方向速度
        const restitutionCoefficient = 0.05; // 反発係数
    
        // 力の適用
        this.applyViscosity(); // 粘性力
        this.applyForces(); // その他の力
        this.applyCohesion(); // 凝集力
        this.applyRepulsion(); // 反発力
        this.applySurfaceTension(); // 表面張力
        this.calculateDensityAndPressure(); // 密度と圧力の計算
        this.calculateForces(); // 力の計算
    
        // 粒子の状態更新
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let particle = this.particles[i];
            particle.userData.lifetime -= this.deltaTime; // ライフタイムを減少
    
            if (particle.userData.lifetime <= 0) {
                this.particleSystem.remove(particle);
                this.particles.splice(i, 1);
                continue;
            }
    
            // 粒子をランダムにアクティブ化
            if (!particle.userData.isActive && Math.random() < activationProbability) {
                particle.userData.isActive = true;
                particle.userData.velocity.y = -Math.random() * initialVelocityY;
            }
    
            // アクティブな粒子の位置更新
            if (particle.userData.isActive) {
                particle.position.add(particle.userData.velocity.clone().multiplyScalar(this.deltaTime));
                this.checkBounds(particle);
            }
        }
    
        // 粒子の総数が指定数未満の場合、新しい粒子を生成
        if (this.particles.length < this.options.particleCount) {
            this.initParticles();
        }
    
        // 粒子間の衝突処理
        this.particles.forEach((particle, index) => {
            const velocityEffect = particle.userData.velocity.clone().multiplyScalar(this.deltaTime);
            particle.position.add(velocityEffect);
            this.checkBounds(particle);
    
            for (let i = index + 1; i < this.particles.length; i++) {
                let otherParticle = this.particles[i];
                let distance = particle.position.distanceTo(otherParticle.position);
                let sumRadius = this.options.particleSize * 2;
    
                if (distance < sumRadius) {
                    let normal = new THREE.Vector3().subVectors(particle.position, otherParticle.position).normalize();
                    let relativeVelocity = particle.userData.velocity.clone().sub(otherParticle.userData.velocity);
                    let velocityAlongNormal = relativeVelocity.dot(normal);
                    if (velocityAlongNormal > 0) continue;
    
                    let impulseMagnitude = -(1 + restitutionCoefficient) * velocityAlongNormal / (1 / particle.userData.mass + 1 / otherParticle.userData.mass);
                    let impulse = normal.multiplyScalar(impulseMagnitude);
    
                    particle.userData.velocity.add(impulse.clone().multiplyScalar(1 / particle.userData.mass));
                    otherParticle.userData.velocity.sub(impulse.clone().multiplyScalar(1 / otherParticle.userData.mass));
                }
            }
        });
    }      

    
    checkBounds(particle) {
        // 円錐の頂点座標
        const coneTip = new THREE.Vector3(0, -300, 0);
        // 円錐の底面の半径
        const baseRadius = this.bounds;
        // 円錐の高さ
        const coneHeight = 1000;
    
        // 粒子の位置から円錐の頂点までのベクトル
        const vectorFromTip = new THREE.Vector3(particle.position.x - coneTip.x, particle.position.y - coneTip.y, particle.position.z - coneTip.z);
    
        // 粒子が円錐の内部にあるかどうかをチェック
        const distanceFromAxis = Math.sqrt(particle.position.x ** 2 + particle.position.z ** 2);
        const maxRadiusAtY = (coneHeight + particle.position.y - coneTip.y) / coneHeight * baseRadius;
    
        if (distanceFromAxis > maxRadiusAtY) {
            // 粒子が円錐の外側にある場合、円錐の表面に沿って位置を調整
            const scale = maxRadiusAtY / distanceFromAxis;
            particle.position.x *= scale;
            particle.position.z *= scale;
        }
    
        // Y軸の境界チェック
        if (particle.position.y > this.heightBounds - this.options.particleSize) {
            particle.position.y = this.heightBounds - this.options.particleSize;
            particle.userData.velocity.y *= -0.5; // 反射
        } else if (particle.position.y < coneTip.y) {
            particle.position.y = coneTip.y;
            particle.userData.velocity.y *= -0.5; // 反射
        }
    }
}

