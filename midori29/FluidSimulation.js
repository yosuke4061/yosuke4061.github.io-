import * as THREE from 'three';

export class FluidSimulation {
    constructor(scene, options) {
        this.scene = scene;
        this.particleSystem = new THREE.Group();
        this.particles = [];
        this.options = options;
        this.gravity = new THREE.Vector3(0, -1, 0); // 地球の重力加速度に近い値に設定
        this.bounds = 300; // 境界の大きさ
        this.deltaTime = 1 / 60; // 60fpsを想定したデルタタイム

        this.initParticles();
    }

    initParticles() {
        const geometry = new THREE.SphereGeometry(this.options.particleSize, 16, 16);
        const material = new THREE.MeshBasicMaterial({ color: this.options.particleColor });

        for (let i = 0; i < this.options.particleCount; i++) {
            const particle = new THREE.Mesh(geometry, material);
            particle.position.x = Math.random() * 150 - 50;
            particle.position.y = Math.random() * 150 + 100;
            particle.position.z = Math.random() * 150 - 50;
            particle.userData.velocity = new THREE.Vector3(0, 0, 0);
            particle.userData.mass = 1; // 各粒子に質量を設定
            this.particleSystem.add(particle);
            this.particles.push(particle);
        }
        this.scene.add(this.particleSystem);
    }

    applyForces() {
        this.particles.forEach(particle => {
            const acceleration = this.gravity.clone().multiplyScalar(this.deltaTime / particle.userData.mass);
            particle.userData.velocity.add(acceleration);
        });
    }

    update() {
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

                    let restitution = 3;//反発係数
                    let impulseMagnitude = -(1 + restitution) * velocityAlongNormal / (1 / particle.userData.mass + 1 / otherParticle.userData.mass);
                    let impulse = normal.multiplyScalar(impulseMagnitude);

                    particle.userData.velocity.add(impulse.clone().multiplyScalar(1 / particle.userData.mass));
                    otherParticle.userData.velocity.sub(impulse.clone().multiplyScalar(1 / otherParticle.userData.mass));
                }
            }
        });

        this.applyForces();
    }

    checkBounds(particle) {
        ['x', 'y', 'z'].forEach(axis => {
            if (particle.position[axis] > this.bounds) {
                particle.position[axis] = this.bounds;
                particle.userData.velocity[axis] *= -0.5;
            } else if (particle.position[axis] < 0 && axis === 'y') {
                particle.position[axis] = 0;
                particle.userData.velocity[axis] *= -0.5;
            } else if (particle.position[axis] < -this.bounds) {
                particle.position[axis] = -this.bounds;
                particle.userData.velocity[axis] *= -0.5;
            }
        });
    }
}

