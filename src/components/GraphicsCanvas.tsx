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
    isLightOff?: boolean;
    hideUI?: boolean;
    activeModel?: string;
}

const useDragRotation = () => {
    const dragRot = useRef(new THREE.Quaternion());
    const isDragging = useRef(false);
    const prevMouse = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const handleDown = (e: MouseEvent) => {
            isDragging.current = true;
            prevMouse.current = { x: e.clientX, y: e.clientY };
        };
        const handleUp = () => {
            isDragging.current = false;
        };
        const handleMove = (e: MouseEvent) => {
            if (!isDragging.current) return;
            const dx = e.clientX - prevMouse.current.x;
            const dy = e.clientY - prevMouse.current.y;
            prevMouse.current = { x: e.clientX, y: e.clientY };

            const q = new THREE.Quaternion();
            q.setFromEuler(new THREE.Euler(-dy * 0.005, dx * 0.005, 0, 'XYZ'));
            dragRot.current.multiplyQuaternions(q, dragRot.current);
            dragRot.current.normalize();
        };

        window.addEventListener('mousedown', handleDown);
        window.addEventListener('mouseup', handleUp);
        window.addEventListener('mousemove', handleMove);

        return () => {
            window.removeEventListener('mousedown', handleDown);
            window.removeEventListener('mouseup', handleUp);
            window.removeEventListener('mousemove', handleMove);
        };
    }, []);

    return { dragRot, isDragging };
};

const useGlobalMouse = () => {
    const mouse = useRef(new THREE.Vector2(0, 0));
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
            mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);
    return mouse;
};

// A dynamic rocky Asteroid
const Asteroid = ({ matrix, started, hideUI }: { matrix: Matrix4x4, started: boolean, hideUI?: boolean }) => {
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

    const { dragRot, isDragging } = useDragRotation();

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
        
        // Smoothly return to identity if not dragging
        if (!isDragging.current) {
            dragRot.current.slerp(new THREE.Quaternion(), dampAlphaOut * 0.5);
        }

        // Add User Drag Rotation
        const dragM = new THREE.Matrix4().makeRotationFromQuaternion(dragRot.current);
        m.multiply(dragM);
        
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
            {!hideUI && (
                <group>
                    <mesh rotation={[0, 0, -Math.PI / 2]} position={[1.4, 0, 0]}>
                        <cylinderGeometry args={[0.015, 0.015, 2.5]} />
                        <meshBasicMaterial color="#ef4444" transparent opacity={0.6} />
                    </mesh>
                    <mesh position={[0, 1.4, 0]}>
                        <cylinderGeometry args={[0.015, 0.015, 2.5]} />
                        <meshBasicMaterial color="#22c55e" transparent opacity={0.6} />
                    </mesh>
                    <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 1.4]}>
                        <cylinderGeometry args={[0.015, 0.015, 2.5]} />
                        <meshBasicMaterial color="#38bdf8" transparent opacity={0.6} />
                    </mesh>
                </group>
            )}
        </group>
    );
};

// Earth Model with Day/Night Cycle Shader
const Earth = ({ matrix, started, hideUI, isLightOff }: { matrix: Matrix4x4, started: boolean, hideUI?: boolean, isLightOff?: boolean }) => {
    const groupRef = useRef<THREE.Group>(null);
    const materialRef = useRef<THREE.MeshStandardMaterial>(null);
    
    const [dayTexture, bumpTexture, nightTexture] = useTexture([
        'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
        'https://unpkg.com/three-globe/example/img/earth-topology.png',
        'https://unpkg.com/three-globe/example/img/earth-night.jpg'
    ]);

    const animPos = useRef(new THREE.Vector3(0, -20, -50));
    const animScale = useRef(0.001);
    const { dragRot, isDragging } = useDragRotation();
    const globalMouse = useGlobalMouse();

    const geometry = useMemo(() => new THREE.SphereGeometry(1.5, 64, 64), []);

    useFrame((state, delta) => {
        if (!groupRef.current) return;

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
        
        const baseRot = new THREE.Matrix4().makeRotationY(state.clock.elapsedTime * 0.1);
        m.multiply(baseRot);
        
        if (!isDragging.current) {
            dragRot.current.slerp(new THREE.Quaternion(), dampAlphaOut * 0.5);
        }

        const dragM = new THREE.Matrix4().makeRotationFromQuaternion(dragRot.current);
        m.multiply(dragM);

        const animM = new THREE.Matrix4().compose(
            animPos.current,
            new THREE.Quaternion(),
            new THREE.Vector3(animScale.current, animScale.current, animScale.current)
        );
        m.premultiply(animM);

        groupRef.current.matrix.copy(m);

        // Update Shader Uniforms for Pointer Light
        if (materialRef.current && materialRef.current.userData.shader) {
            const vec = new THREE.Vector3(globalMouse.current.x, globalMouse.current.y, 0.5);
            vec.unproject(state.camera);
            vec.sub(state.camera.position).normalize();
            const distance = (4 - state.camera.position.z) / vec.z;
            const pos = state.camera.position.clone().add(vec.multiplyScalar(distance));
            materialRef.current.userData.shader.uniforms.sunPositionWorld.value.copy(pos);
            materialRef.current.userData.shader.uniforms.uIsLightOff.value = isLightOff ? 1.0 : 0.0;
        }
    });

    const handleBeforeCompile = (shader: THREE.Shader) => {
        shader.uniforms.tNight = { value: nightTexture };
        shader.uniforms.sunPositionWorld = { value: new THREE.Vector3(0, 0, 5) };
        shader.uniforms.uIsLightOff = { value: isLightOff ? 1.0 : 0.0 };
        materialRef.current!.userData.shader = shader;

        shader.vertexShader = shader.vertexShader.replace(
            '#include <common>',
            `#include <common>
             uniform vec3 sunPositionWorld;
             varying vec3 vSunPositionView;
             varying vec3 vViewPos;
             varying vec2 vCustomUv;`
        ).replace(
            '#include <worldpos_vertex>',
            `#include <worldpos_vertex>
             vSunPositionView = (viewMatrix * vec4(sunPositionWorld, 1.0)).xyz;
             vViewPos = -mvPosition.xyz;
             vCustomUv = uv;`
        );

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <common>',
            `#include <common>
             uniform sampler2D tNight;
             uniform float uIsLightOff;
             varying vec3 vSunPositionView;
             varying vec3 vViewPos;
             varying vec2 vCustomUv;`
        ).replace(
            '#include <emissivemap_fragment>',
            `#include <emissivemap_fragment>
             vec4 nightColor = texture2D(tNight, vCustomUv);
             vec3 lightDirView = normalize(vSunPositionView + vViewPos);
             
             // Smoothstep the night map based on view space normal and light direction
             float intensityCustom = dot(normal, lightDirView);
             float nightMixCustom = 1.0 - smoothstep(-0.2, 0.1, intensityCustom);
             
             // If light is turned off, force the entire planet into night mode
             nightMixCustom = mix(nightMixCustom, 1.0, uIsLightOff);
             
             // Hide the day texture completely on the night side
             diffuseColor.rgb *= (1.0 - nightMixCustom);

             // Multiply night map to make it brighter without artificial ambient glow
             vec3 finalNightColor = nightColor.rgb * 5.0;
             totalEmissiveRadiance += finalNightColor * nightMixCustom;`
        );
    };

    return (
        <group ref={groupRef}>
            <mesh geometry={geometry} castShadow receiveShadow>
                <meshStandardMaterial 
                    ref={materialRef}
                    map={dayTexture}
                    bumpMap={bumpTexture}
                    bumpScale={0.02}
                    roughness={1.0} 
                    metalness={0.0}
                    envMapIntensity={0}
                    onBeforeCompile={handleBeforeCompile}
                />
            </mesh>

            {!hideUI && (
                <group>
                    <mesh rotation={[0, 0, -Math.PI / 2]} position={[1.4, 0, 0]}>
                        <cylinderGeometry args={[0.015, 0.015, 2.5]} />
                        <meshBasicMaterial color="#ef4444" transparent opacity={0.6} />
                    </mesh>
                    <mesh position={[0, 1.4, 0]}>
                        <cylinderGeometry args={[0.015, 0.015, 2.5]} />
                        <meshBasicMaterial color="#22c55e" transparent opacity={0.6} />
                    </mesh>
                    <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 1.4]}>
                        <cylinderGeometry args={[0.015, 0.015, 2.5]} />
                        <meshBasicMaterial color="#38bdf8" transparent opacity={0.6} />
                    </mesh>
                </group>
            )}
        </group>
    );
};

// Interactive Light tracking the mouse pointer perfectly over the 3D canvas
const PointerLight = ({ active }: { active: boolean }) => {
    const groupRef = useRef<THREE.Group>(null);
    const light1Ref = useRef<THREE.PointLight>(null);
    const light2Ref = useRef<THREE.PointLight>(null);
    const globalMouse = useGlobalMouse();

    useFrame((state, delta) => {
        if (groupRef.current) {
            // Convert normalized window pointer coordinates to a world position
            const vec = new THREE.Vector3(globalMouse.current.x, globalMouse.current.y, 0.5);
            vec.unproject(state.camera);
            
            // Direction from camera to the unprojected point
            vec.sub(state.camera.position).normalize();
            
            // Calculate distance to intersect the plane where Z = 4
            const distance = (4 - state.camera.position.z) / vec.z;
            
            // Calculate real-world position exactly beneath the mouse at Z=4
            const pos = state.camera.position.clone().add(vec.multiplyScalar(distance));
            
            const safeDelta = Math.min(delta, 0.1);
            const dampAlpha = 1 - Math.exp(-8 * safeDelta);

            // Instantly update the light towards the target position to perfectly match the shader
            groupRef.current.position.copy(pos);

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

// Smoothly transitioning ambient light
const Starlights = ({ active, activeModel }: { active: boolean, activeModel?: string }) => {
    const ambLight = useRef<THREE.AmbientLight>(null);

    useFrame((_, delta) => {
        const safeDelta = Math.min(delta, 0.1);
        const dampAlpha = 1 - Math.exp(-3 * safeDelta); // Slower fade for starlight

        if (ambLight.current) {
            const targetAmb = active ? 0.15 : 0.05;
            ambLight.current.intensity = THREE.MathUtils.lerp(ambLight.current.intensity, targetAmb, dampAlpha);
        }
    });

    return (
        <group>
            <ambientLight ref={ambLight} intensity={0.05} color="#ffffff" />
        </group>
    );
};

export const GraphicsCanvas: React.FC<GraphicsCanvasProps> = ({ matrix, started, tx, ty, tz, rotX, rotY, rotZ, isLightOff, hideUI, activeModel }) => {
    return (
        <div className="absolute inset-0 w-full h-full">
            <Canvas shadows camera={{ position: [0, 0, 10], fov: 45 }} dpr={[1, 1.5]}>
                <Starlights active={isLightOff || false} activeModel={activeModel} />
                <PointerLight active={!isLightOff} />
                
                <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
                    <Suspense fallback={null}>
                        {activeModel === 'earth' ? (
                            <Earth matrix={matrix} started={started} hideUI={hideUI} isLightOff={isLightOff} />
                        ) : (
                            <Asteroid matrix={matrix} started={started} hideUI={hideUI} />
                        )}
                    </Suspense>
                </Float>

                <Environment preset="city" />
            </Canvas>
        </div>
    );
};
