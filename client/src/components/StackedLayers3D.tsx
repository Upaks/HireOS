import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

// Create horizontal stripe texture for top surface (memoized)
const createStripeTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  
  // Dark grey base (#1a1a1a)
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, 512, 512);
  
  // Horizontal stripes (lighter grey lines)
  ctx.strokeStyle = '#2a2a2a';
  ctx.lineWidth = 2;
  for (let i = 0; i < 512; i += 8) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
};

// Individual Layer Component
function Layer({ 
  position, 
  size, 
  height, 
  isTop = false, 
  isBottom = false,
  showDetails = false 
}: { 
  position: [number, number, number];
  size: number;
  height: number;
  isTop?: boolean;
  isBottom?: boolean;
  showDetails?: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Memoize materials
  const materials = useMemo(() => {
    const stripeTexture = createStripeTexture();
    
    // Material for top surface (with stripes)
    const topMaterial = new THREE.MeshStandardMaterial({
      color: '#1a1a1a',
      map: stripeTexture,
      roughness: 0.7,
      metalness: 0.1,
    });

    // Material for side surfaces (smooth dark grey)
    const sideMaterial = new THREE.MeshStandardMaterial({
      color: '#1a1a1a',
      roughness: 0.6,
      metalness: 0.1,
    });
    
    // Material for layer separation lines
    const lineMaterial = new THREE.MeshStandardMaterial({
      color: '#4a4a4a',
      emissive: '#2a2a2a',
      emissiveIntensity: 0.3,
    });
    
    return { topMaterial, sideMaterial, lineMaterial };
  }, []);

  return (
    <group position={position}>
      {/* Main box - use separate materials for each face */}
      {/* Using roundedBoxGeometry for slightly rounded corners (if available) or regular box */}
      <mesh ref={meshRef} castShadow receiveShadow>
        <boxGeometry args={[size, height, size]} />
        <meshStandardMaterial 
          color="#1a1a1a" 
          roughness={0.6}
          metalness={0.1}
          flatShading={false}
        />
      </mesh>
      
      {/* Top surface with stripe texture (only for top layer) */}
      {isTop && (
        <mesh position={[0, height / 2 + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[size, size]} />
          <primitive object={materials.topMaterial} attach="material" />
        </mesh>
      )}
      
      {/* Corner screws/fasteners (only on top and bottom layers) */}
      {(isTop || isBottom) && (
        <>
          {[
            [-size / 2 + 0.12, height / 2 + 0.01, -size / 2 + 0.12],
            [size / 2 - 0.12, height / 2 + 0.01, -size / 2 + 0.12],
            [-size / 2 + 0.12, height / 2 + 0.01, size / 2 - 0.12],
            [size / 2 - 0.12, height / 2 + 0.01, size / 2 - 0.12],
          ].map((pos, i) => (
            <group key={i} position={pos as [number, number, number]}>
              {/* Screw head - light grey circle */}
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.06, 0.06, 0.02, 16]} />
                <meshStandardMaterial color="#e5e5e5" metalness={0.3} roughness={0.4} />
              </mesh>
              {/* Screw X pattern - dark X on light background */}
              <mesh rotation={[-Math.PI / 2, 0, Math.PI / 4]} position={[0, 0.011, 0]}>
                <boxGeometry args={[0.08, 0.015, 0.01]} />
                <meshStandardMaterial color="#1a1a1a" />
              </mesh>
              <mesh rotation={[-Math.PI / 2, 0, -Math.PI / 4]} position={[0, 0.011, 0]}>
                <boxGeometry args={[0.08, 0.015, 0.01]} />
                <meshStandardMaterial color="#1a1a1a" />
              </mesh>
            </group>
          ))}
        </>
      )}
      
      {/* Central emblem (only on top layer) */}
      {isTop && (
        <group position={[0, height / 2 + 0.02, 0]}>
          {/* Outer dotted circle (subtle grey ring) */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.28, 0.30, 32]} />
            <meshStandardMaterial 
              color="#4a4a4a" 
              transparent 
              opacity={0.5}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* White circle */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.22, 32]} />
            <meshStandardMaterial color="#ffffff" side={THREE.DoubleSide} />
          </mesh>
          {/* Black X symbol */}
          <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
            <mesh>
              <boxGeometry args={[0.16, 0.04, 0.02]} />
              <meshStandardMaterial color="#000000" />
            </mesh>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <boxGeometry args={[0.16, 0.04, 0.02]} />
              <meshStandardMaterial color="#000000" />
            </mesh>
          </group>
        </group>
      )}
      
      {/* Layer separation lines (visible on front and right faces for all layers except top) */}
      {!isTop && (
        <>
          {/* Front face separation line */}
          <mesh position={[0, height / 2, size / 2 + 0.001]} rotation={[0, 0, 0]}>
            <boxGeometry args={[size, 0.015, 0.01]} />
            <primitive object={materials.lineMaterial} attach="material" />
          </mesh>
          {/* Right face separation line */}
          <mesh position={[size / 2 + 0.001, height / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
            <boxGeometry args={[size, 0.015, 0.01]} />
            <primitive object={materials.lineMaterial} attach="material" />
          </mesh>
        </>
      )}
    </group>
  );
}

// Main Stacked Layers Component
function StackedLayersModel({ 
  showDetails = false,
  scrollProgress = 0 
}: { 
  showDetails?: boolean;
  scrollProgress?: number; // 0 = closed (stacked), 1 = fully open
}) {
  const groupRef = useRef<THREE.Group>(null);
  
  // Subtle rotation animation (optional - can be disabled)
  useFrame((state) => {
    if (groupRef.current) {
      // Very subtle rotation for visual interest
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.15) * 0.05;
    }
  });

  const baseSize = 6; // Increased width for bigger cards
  const topLayerHeight = 0.25;
  const middleLayerHeight = 0.12; // Thinner middle layers
  const bottomLayerHeight = 0.25;
  const closedSpacing = 0.1; // Spacing when closed - enough to see all 5 layers
  
  // Create 5 stacked layers matching the image
  // Layers open ONE BY ONE as user scrolls
  // Each layer has its own scroll progress threshold for opening
  // Top 4 layers converge at the top, bottom layer stays at bottom
  // MUCH WIDER spacing to see all angles - similar to second image
  const topConvergenceY = 4.5; // Y position where top 4 layers meet at the top (much higher)
  const bottomLayerY = -3.0; // Bottom layer moves much further down
  
  // Stagger the opening: each layer starts opening at different scroll progress
  // Layer 1 (bottom) opens first, then 2, 3, 4, 5 (top) opens last
  const getLayerProgress = (layerIndex: number, scrollProgress: number) => {
    // Each layer starts opening when previous layer is 20% open
    const startThreshold = layerIndex * 0.15; // 0, 0.15, 0.30, 0.45, 0.60
    const endThreshold = startThreshold + 0.25; // Each layer takes 25% of scroll to fully open
    
    if (scrollProgress < startThreshold) return 0; // Not started
    if (scrollProgress > endThreshold) return 1; // Fully open
    
    // Interpolate between start and end
    return (scrollProgress - startThreshold) / (endThreshold - startThreshold);
  };
  
  const layers = [
    { 
      height: bottomLayerHeight, 
      isBottom: true,
      closedY: -closedSpacing * 2, // Bottom layer: -0.2 when closed
      openY: bottomLayerY, // Bottom layer moves down, stays at bottom
      layerIndex: 0
    },
    { 
      height: middleLayerHeight,
      closedY: -closedSpacing, // Second layer: -0.1 when closed
      openY: topConvergenceY, // Second layer moves up to top
      layerIndex: 1
    },
    { 
      height: middleLayerHeight,
      closedY: 0, // Third layer: 0 when closed (center)
      openY: topConvergenceY, // Third layer moves up to top
      layerIndex: 2
    },
    { 
      height: middleLayerHeight,
      closedY: closedSpacing, // Fourth layer: 0.1 when closed
      openY: topConvergenceY, // Fourth layer moves up to top
      layerIndex: 3
    },
    { 
      height: topLayerHeight, 
      isTop: true,
      closedY: closedSpacing * 2, // Top layer: 0.2 when closed
      openY: topConvergenceY, // Top layer moves up to top (meets with others)
      layerIndex: 4
    },
  ];
  
  // Calculate actual Y positions based on individual layer progress
  const layerPositions = layers.map(layer => {
    const layerProgress = getLayerProgress(layer.layerIndex, scrollProgress);
    const y = layer.closedY + (layer.openY - layer.closedY) * layerProgress;
    return { ...layer, y };
  });

  return (
    <group ref={groupRef}>
      {/* Ambient light for overall illumination */}
      <ambientLight intensity={0.5} />
      
      {/* Main directional light (top-right) */}
      <directionalLight 
        position={[5, 8, 5]} 
        intensity={0.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      
      {/* Fill light (bottom-left) for softer shadows */}
      <directionalLight 
        position={[-5, 2, -5]} 
        intensity={0.3}
      />
      
      {/* Render layers from bottom to top */}
      {layerPositions.map((layer, index) => (
        <Layer
          key={index}
          position={[0, layer.y, 0]}
          size={baseSize}
          height={layer.height}
          isTop={layer.isTop || false}
          isBottom={layer.isBottom || false}
          showDetails={showDetails && !layer.isTop}
        />
      ))}
    </group>
  );
}

// Main Component with Canvas
export default function StackedLayers3D({ 
  showDetails = false,
  className = "",
  interactive = false,
  scrollProgress = 0
}: { 
  showDetails?: boolean;
  className?: string;
  interactive?: boolean;
  scrollProgress?: number; // 0 = closed, 1 = fully open
}) {
  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        shadows
        gl={{ 
          antialias: true, 
          alpha: true,
          powerPreference: "high-performance"
        }}
        dpr={[1, 2]} // Device pixel ratio for better quality
      >
        {/* Isometric camera setup - positioned for isometric view */}
        {/* Isometric angle: looking down at ~60deg, rotated ~45deg */}
        {/* Adjusted camera to see wider spacing better */}
        <PerspectiveCamera
          makeDefault
          position={[5.5, 5.5, 5.5]}
          fov={50}
        />
        
        {/* Controls - can be interactive or fixed */}
        {interactive ? (
          <OrbitControls
            enableZoom={true}
            enablePan={false}
            enableRotate={true}
            minPolarAngle={Math.PI / 3.5}
            maxPolarAngle={Math.PI / 2.1}
            minAzimuthAngle={-Math.PI / 3}
            maxAzimuthAngle={Math.PI / 3}
            target={[0, 0, 0]}
            dampingFactor={0.1}
          />
        ) : (
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            enableRotate={false}
            target={[0, 0, 0]}
          />
        )}
        
        {/* 3D Model */}
        <StackedLayersModel showDetails={showDetails} scrollProgress={scrollProgress} />
        
        {/* Invisible ground plane for shadows */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
          <planeGeometry args={[20, 20]} />
          <meshStandardMaterial color="#0a0a0a" transparent opacity={0} />
        </mesh>
      </Canvas>
    </div>
  );
}