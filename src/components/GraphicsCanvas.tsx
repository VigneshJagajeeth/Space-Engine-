import React, { useRef, useEffect, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, Environment, Stars, useTexture, MeshTransmissionMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { Matrix4x4 } from '../lib/matrix4';

interface GraphicsCanvasProps {
    matrix: Matrix4x4;
    started: boolean;
    tx: number; ty: number; tz: number;
    rotX: number; rotY: number; rotZ: number;
    isLightOff?: boolean;
}

// A dynamic rocky Asteroid
const Asteroid = ({ matrix, started }: { matrix: Matrix4x4, started: boolean }) => {
    const groupRef = useRef<THREE.Group>(null);
    const [rockTexture, normalTexture] = useTexture([
        'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/moon_1024.jpg',
        'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/waternormals.jpg'
    ]);

    useEffect(() => {
        if (normalTexture) {
            normalTexture.wrapS = normalTexture.wrapT = THREE.RepeatWrapping;
            normalTexture.repeat.set(3, 3);
        }
    }, [normalTexture]);
    
    const animPos = useRef(new THREE.Vector3(0, -20, -50));
    const animScale = useRef(0.001);

    // Generate an imperfect, rocky geometry with optimal performance/detail ratio
    const geometry = useMemo(() => {
        const geo = new THREE.IcosahedronGeometry(1.5, 64);
        const posAttribute = geo.attributes.position;
        const v = new THREE.Vector3();
        for(let i = 0; i < posAttribute.count; i++){
            v.fromBufferAttribute(posAttribute, i);
            
            // Generate multiple layers of noise for a subtle, less wavy asteroid shape
            const noise1 = Math.sin(v.x * 3) * Math.cos(v.y * 3) * Math.sin(v.z * 3) * 0.1;
            const noise2 = Math.sin(v.x * 8) * Math.sin(v.y * 8 + v.z) * 0.05;
            
            // Uneven scaling to make it less spherical and more oblong/rocky
            v.normalize().multiplyScalar(1.5 + noise1 + noise2);
            v.x *= 1.3;
            v.y *= 0.8;
            v.z *= 1.1;
            posAttribute.setXYZ(i, v.x, v.y, v.z);
        }
        geo.computeVertexNormals();
        return geo;
    }, []);

    useFrame((state, delta) => {
        if (!groupRef.current) return;

        // Use frame-rate independent exponential smoothing to prevent overshoot on lag spikes
        const safeDelta = Math.min(delta, 0.1);
        const dampAlphaIn = 1 - Math.exp(-5 * safeDelta);
        const dampAlphaOut = 1 - Math.exp(-8 * safeDelta);

        if (started) {
            animScale.current = THREE.MathUtils.lerp(animScale.current, 1, dampAlphaIn);
            animPos.current.lerp(new THREE.Vector3(0, 0, 0), dampAlphaIn);
        } else {
            animScale.current = THREE.MathUtils.lerp(animScale.current, 0.001, dampAlphaOut);
            animPos.current.lerp(new THREE.Vector3(0, -50, -100), dampAlphaOut);
        }

        const m = new THREE.Matrix4();
        m.set(
            matrix[0][0], matrix[0][1], matrix[0][2], matrix[0][3],
            matrix[1][0], matrix[1][1], matrix[1][2], matrix[1][3],
            matrix[2][0], matrix[2][1], matrix[2][2], matrix[2][3],
            matrix[3][0], matrix[3][1], matrix[3][2], matrix[3][3]
        );
        groupRef.current.matrixAutoUpdate = false;
        
        // Add a slight base rotation for dramatic effect
        const baseRot = new THREE.Matrix4().makeRotationY(state.clock.elapsedTime * 0.2);
        m.multiply(baseRot);
        
        // Apply entry zoom/float animation
        const animM = new THREE.Matrix4().compose(
            animPos.current,
            new THREE.Quaternion(),
            new THREE.Vector3(animScale.current, animScale.current, animScale.current)
        );
        m.premultiply(animM);

        groupRef.current.matrix.copy(m);
    });

    return (
        <group ref={groupRef}>
            {/* The rocky inner core */}
            <mesh geometry={geometry} castShadow receiveShadow>
                <meshStandardMaterial 
                    map={rockTexture}
                    normalMap={normalTexture}
                    normalScale={new THREE.Vector2(0.5, 0.5)}
                    bumpMap={rockTexture}
                    bumpScale={0.05}
                    color="#555555" 
                    roughness={0.8} 
                    metalness={0.3} 
                    envMapIntensity={0.3}
                />
            </mesh>

            {/* Custom stylized local axes indicating transformations happen relative to the asteroid */}
            <group>
                <mesh rotation={[0, 0, -Math.PI / 2]} position={[2.2, 0, 0]}>
                    <cylinderGeometry args={[0.02, 0.02, 4]} />
                    <meshBasicMaterial color="#ef4444" transparent opacity={0.6} />
                </mesh>
                <mesh position={[0, 2.2, 0]}>
                    <cylinderGeometry args={[0.02, 0.02, 4]} />
                    <meshBasicMaterial color="#22c55e" transparent opacity={0.6} />
                </mesh>
                <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 2.2]}>
                    <cylinderGeometry args={[0.02, 0.02, 4]} />
                    <meshBasicMaterial color="#38bdf8" transparent opacity={0.6} />
                </mesh>
            </group>
        </group>
    );
};

// Interactive Light tracking the mouse pointer perfectly over the 3D canvas
const PointerLight = ({ active }: { active: boolean }) => {
    const groupRef = useRef<THREE.Group>(null);
    const light1Ref = useRef<THREE.PointLight>(null);
    const light2Ref = useRef<THREE.PointLight>(null);
    const globalMouse = useRef(new THREE.Vector2(0, 0));

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            // Map screen coordinates to NDC (-1 to +1)
            globalMouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
            globalMouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);
    
    useFrame(({ camera }, delta) => {
        if (groupRef.current) {
            // Convert normalized window pointer coordinates to a world position
            const vec = new THREE.Vector3(globalMouse.current.x, globalMouse.current.y, 0.5);
            vec.unproject(camera);
            
            // Direction from camera to the unprojected point
            vec.sub(camera.position).normalize();
            
            // Calculate distance to intersect the plane where Z = 4
            const distance = (4 - camera.position.z) / vec.z;
            
            // Calculate real-world position exactly beneath the mouse at Z=4
            const pos = camera.position.clone().add(vec.multiplyScalar(distance));
            
            // Smoothly interpolate the light towards the target position
            const safeDelta = Math.min(delta, 0.1);
            const dampAlpha = 1 - Math.exp(-8 * safeDelta);
            groupRef.current.position.lerp(pos, dampAlpha);

            // Smoothly interpolate light intensity
            if (light1Ref.current) {
                light1Ref.current.intensity = THREE.MathUtils.lerp(light1Ref.current.intensity, active ? 300 : 0, dampAlpha);
            }
            if (light2Ref.current) {
                light2Ref.current.intensity = THREE.MathUtils.lerp(light2Ref.current.intensity, active ? 150 : 0, dampAlpha);
            }
        }
    });

    return (
        <group ref={groupRef}>
            {/* Main lighting emitted by the sun, dimmed down so rock is not blown out */}
            <pointLight ref={light1Ref} castShadow color="#ffddaa" intensity={300} distance={50} decay={1.5} shadow-mapSize={[1024, 1024]} shadow-bias={-0.001} />
            <pointLight ref={light2Ref} castShadow color="#ffffff" intensity={150} distance={20} decay={2} shadow-mapSize={[1024, 1024]} shadow-bias={-0.001} />
        </group>
    );
};

// Smoothly transitioning ambient and directional lights
const Starlights = ({ active }: { active: boolean }) => {
    const dirLight1 = useRef<THREE.DirectionalLight>(null);
    const dirLight2 = useRef<THREE.DirectionalLight>(null);
    const ambLight = useRef<THREE.AmbientLight>(null);

    useFrame((_, delta) => {
        const safeDelta = Math.min(delta, 0.1);
        const dampAlpha = 1 - Math.exp(-3 * safeDelta); // Slower fade for starlight

        if (dirLight1.current) {
            dirLight1.current.intensity = THREE.MathUtils.lerp(dirLight1.current.intensity, active ? 0.5 : 0, dampAlpha);
        }
        if (dirLight2.current) {
            dirLight2.current.intensity = THREE.MathUtils.lerp(dirLight2.current.intensity, active ? 0.3 : 0, dampAlpha);
        }
        if (ambLight.current) {
            ambLight.current.intensity = THREE.MathUtils.lerp(ambLight.current.intensity, active ? 0.15 : 0.05, dampAlpha);
        }
    });

    return (
        <group>
            <directionalLight ref={dirLight1} color="#a3e6ff" intensity={0} position={[10, 5, -10]} castShadow shadow-bias={-0.001} />
            <directionalLight ref={dirLight2} color="#ffccaa" intensity={0} position={[-10, -5, 10]} />
            <ambientLight ref={ambLight} intensity={0.05} color="#ffffff" />
        </group>
    );
};

export const GraphicsCanvas: React.FC<GraphicsCanvasProps> = ({ matrix, started, tx, ty, tz, rotX, rotY, rotZ, isLightOff }) => {
    return (
        <div className="absolute inset-0 w-full h-full">
            <Canvas shadows camera={{ position: [0, 0, 10], fov: 45 }} dpr={[1, 1.5]}>
                <Starlights active={isLightOff || false} />
                <PointerLight active={!isLightOff} />
                
                {/* Immersive 3D Galaxy Field */}
                {/* Background stars removed from here to keep them full screen */}

                <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
                    <Suspense fallback={null}>
                        <Asteroid matrix={matrix} started={started} />
                    </Suspense>
                </Float>

                {/* Subtle Environment reflections for realistic RTX-style PBR material response */}
                <Environment preset="city" />
            </Canvas>
        </div>
    );
};
