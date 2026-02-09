import React, { useRef, useEffect, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
import './App.css';

const COUNT = 12000;

// --- MATNNI HISOBLASH (ZICHLIK YUQORI) ---
const createTextPoints = (text) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 600;
  canvas.height = 300;
  
  ctx.fillStyle = '#FFFFFF'; 
  ctx.font = '900 120px Arial'; 
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const points = [];

  for (let y = 0; y < canvas.height; y += 3) { 
    for (let x = 0; x < canvas.width; x += 3) {
      const index = (y * canvas.width + x) * 4;
      const alpha = data[index + 3];

      if (alpha > 128) {
        const pX = (x / canvas.width - 0.5) * 14; 
        const pY = -(y / canvas.height - 0.5) * 7;
        const pZ = (Math.random() - 0.5) * 1.0; 
        points.push(pX, pY, pZ);
      }
    }
  }
  return points;
};

// --- SHAKLLAR ---
const generateShape = (shape, customTextPoints = null) => {
  const pos = new Float32Array(COUNT * 3);

  for (let i = 0; i < COUNT; i++) {
    const i3 = i * 3;
    let x, y, z;

    if (shape === 'TEXT' && customTextPoints && customTextPoints.length > 0) {
      if (i3 < customTextPoints.length) {
        x = customTextPoints[i3];
        y = customTextPoints[i3 + 1];
        z = customTextPoints[i3 + 2];
      } else {
        const angle = Math.random() * Math.PI * 2;
        const radius = 5 + Math.random() * 8; 
        const spiral = 3; 
        x = Math.cos(angle * spiral) * radius;
        y = (Math.random() - 0.5) * 6; 
        z = Math.sin(angle * spiral) * radius;
      }
    } else if (shape === 'HEART') {
      const t = Math.random() * Math.PI * 2;
      x = 0.25 * (16 * Math.pow(Math.sin(t), 3));
      y = 0.25 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      z = (Math.random() - 0.5) * 2;
      y += 0.5; 
    } else if (shape === 'GALAXY') { 
      const angle = Math.random() * Math.PI * 2;
      const radius = 1 + Math.random() * 4;
      const spiral = 2; 
      x = Math.cos(angle * spiral) * radius;
      y = (Math.random() - 0.5) * 1;
      z = Math.sin(angle * spiral) * radius;
    } else { 
      // EARTH
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const r = 4.0 + (Math.random() - 0.5) * 0.1; 
      x = r * Math.sin(phi) * Math.cos(theta);
      y = r * Math.sin(phi) * Math.sin(theta);
      z = r * Math.cos(phi);
    }
    pos[i3] = x; pos[i3+1] = y; pos[i3+2] = z;
  }
  return pos;
};

function CameraController({ targetZoom }) {
  const { camera } = useThree();
  useFrame(() => {
    camera.position.z += (targetZoom - camera.position.z) * 0.1;
  });
  return null;
}

function Particles({ handPos, mousePos, shape, customTextPoints }) {
  const ref = useRef();
  const targetData = useMemo(() => generateShape(shape, customTextPoints), [shape, customTextPoints]);
  const prevInteractionPos = useRef(null);
  const velocities = useMemo(() => new Float32Array(COUNT * 3), []);
  
  const shouldExplode = useMemo(() => {
    const arr = new Float32Array(COUNT);
    for(let i=0; i<COUNT; i++) arr[i] = Math.random() > 0.5 ? 1 : 0;
    return arr;
  }, []);

  const initialPos = useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    const earthData = generateShape('EARTH');
    for (let i = 0; i < COUNT; i++) pos[i] = earthData[i];
    return pos;
  }, []);

  useFrame((state) => {
    if (!ref.current) return;
    const geo = ref.current.geometry.attributes.position;
    
    let moveX = 0;
    let moveY = 0;

    const currentInput = (handPos && handPos.x !== undefined) ? handPos : mousePos;

    if (currentInput && currentInput.x !== undefined) {
      if (prevInteractionPos.current) {
        moveX = (currentInput.x - prevInteractionPos.current.x) * 30;
        moveY = (currentInput.y - prevInteractionPos.current.y) * 30;
        ref.current.rotation.y += moveX * 0.005;
        ref.current.rotation.x += moveY * 0.005;
      }
      prevInteractionPos.current = { x: currentInput.x, y: currentInput.y };
    } else {
      prevInteractionPos.current = null;
      ref.current.rotation.y += 0.001; 
    }

    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3;
      if ((Math.abs(moveX) > 0.2 || Math.abs(moveY) > 0.2) && shouldExplode[i] === 1) {
         const noise = Math.random();
         velocities[i3] -= moveX * noise * 0.02;     
         velocities[i3+1] -= moveY * noise * 0.02;   
         velocities[i3+2] += (Math.random() - 0.5) * 0.2;
      }
      geo.array[i3] += velocities[i3];
      geo.array[i3+1] += velocities[i3+1];
      geo.array[i3+2] += velocities[i3+2];
      velocities[i3] *= 0.90;
      velocities[i3+1] *= 0.90;
      velocities[i3+2] *= 0.90;

      const tx = targetData[i3];
      const ty = targetData[i3+1];
      const tz = targetData[i3+2];
      geo.array[i3] += (tx - geo.array[i3]) * 0.08;
      geo.array[i3+1] += (ty - geo.array[i3+1]) * 0.08;
      geo.array[i3+2] += (tz - geo.array[i3+2]) * 0.08;
    }
    geo.needsUpdate = true;
  });

  return (
    <Points ref={ref} positions={initialPos} stride={3}>
      <PointMaterial 
        transparent 
        color="#00f0ff" 
        size={0.06} 
        sizeAttenuation={true}
        blending={THREE.AdditiveBlending} 
        depthWrite={false} 
        opacity={0.9} 
      />
    </Points>
  );
}

export default function App() {
  const videoRef = useRef(null);
  const handsRef = useRef(null);
  const cameraRef = useRef(null);
  
  const [handPos, setHandPos] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [shape, setShape] = useState('EARTH');
  const prevShapeRef = useRef('EARTH'); 

  const [inputText, setInputText] = useState('');
  const [customTextPoints, setCustomTextPoints] = useState(null);
  const [zoom, setZoom] = useState(15); 
  const [cameraStatus, setCameraStatus] = useState('Initializing...');
  const [handDetected, setHandDetected] = useState(false);
  const previousPinchDistance = useRef(null);

  const handleStartText = () => {
    if (!inputText.trim()) return;
    if (shape !== 'TEXT') {
        prevShapeRef.current = shape;
    }
    const points = createTextPoints(inputText.toUpperCase());
    setCustomTextPoints(points);
    setShape('TEXT');
    setTimeout(() => {
      setShape(prevShapeRef.current);
      setInputText(''); 
    }, 5000);
  };

  const handleShapeChange = (newShape) => {
      setShape(newShape);
      prevShapeRef.current = newShape; 
  };

  const handleMouseMove = (e) => {
    const x = 1 - (e.clientX / window.innerWidth);
    const y = e.clientY / window.innerHeight;
    setMousePos({ x, y });
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    if (handsRef.current) return;
    if (typeof window.Hands === 'undefined') {
      setCameraStatus('Kutubxona yuklanmadi. Sahifani yangilang.');
      return;
    }

    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 640, height: 480, facingMode: 'user' } 
        });
        stream.getTracks().forEach(track => track.stop());

        // MUHIM: Versiyani aniq ko'rsatamiz
        handsRef.current = new window.Hands({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/${file}`
        });
        
        handsRef.current.setOptions({ 
          maxNumHands: 1, 
          modelComplexity: 1, 
          minDetectionConfidence: 0.5, 
          minTrackingConfidence: 0.5
        });
        
        handsRef.current.onResults(res => {
          if (res.multiHandLandmarks && res.multiHandLandmarks.length > 0) {
            const landmarks = res.multiHandLandmarks[0];
            const indexFinger = landmarks[8];
            if (indexFinger) {
              setHandPos({ x: indexFinger.x, y: indexFinger.y });
              setHandDetected(true);
              setCameraStatus('Aloqa bor: Qo\'l bilan boshqarilmoqda');
              
              if (landmarks.length > 4) {
                const thumb = landmarks[4];
                const pinch = Math.sqrt(Math.pow(thumb.x - indexFinger.x, 2) + Math.pow(thumb.y - indexFinger.y, 2));
                if (previousPinchDistance.current !== null) {
                  const delta = previousPinchDistance.current - pinch;
                  if (Math.abs(delta) > 0.02) {
                    setZoom(prev => Math.max(5, Math.min(30, prev + delta * 20)));
                  }
                }
                previousPinchDistance.current = pinch;
              }
            }
          } else {
            setHandPos(null);
            setHandDetected(false);
            setCameraStatus('Kamera aktiv - Sichqoncha bilan boshqaring');
            previousPinchDistance.current = null;
          }
        });

        if (videoRef.current) {
          cameraRef.current = new window.Camera(videoRef.current, {
            onFrame: async () => {
              if (videoRef.current && handsRef.current) {
                await handsRef.current.send({ image: videoRef.current });
              }
            },
            width: 640, height: 480
          });
          cameraRef.current.start();
        }
      } catch (err) {
        setCameraStatus('Kameraga ruxsat berilmadi - Sichqonchadan foydalaning');
      }
    };
    initCamera();
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#050510', overflow: 'hidden' }}>
      <video ref={videoRef} style={{ display: 'none' }} autoPlay playsInline muted />

      <div className="controls-container" style={{ 
        position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%)', 
        zIndex: 100, display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center'
      }}>
        {['EARTH', 'HEART', 'GALAXY'].map(s => (
          <button key={s} onClick={() => handleShapeChange(s)} style={{
            background: shape === s ? '#00f0ff' : 'rgba(0, 240, 255, 0.1)',
            color: shape === s ? '#000' : '#00f0ff',
            border: '1px solid #00f0ff', padding: '10px 20px', borderRadius: '30px', 
            cursor: 'pointer', fontWeight: 'bold', transition: '0.3s',
            boxShadow: shape === s ? '0 0 15px #00f0ff' : 'none'
          }}>
            {s}
          </button>
        ))}

        <div style={{ display: 'flex', gap: '5px', marginLeft: '10px' }}>
          <input 
            type="text" 
            placeholder="Yozuv kiriting..." 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
                if (e.key === 'Enter') handleStartText();
            }}
            maxLength={10}
            style={{
              padding: '10px 15px',
              borderRadius: '30px',
              border: '1px solid #00f0ff',
              background: 'rgba(0,0,0,0.5)',
              color: 'white',
              outline: 'none',
              width: '150px'
            }}
          />
          <button 
            onClick={handleStartText}
            style={{
              background: '#00f0ff',
              color: 'black',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '30px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 0 10px rgba(0,240,255,0.5)'
            }}
          >
            START
          </button>
        </div>
      </div>

      <Canvas camera={{ position: [0, 0, zoom], fov: 45 }}>
        <CameraController targetZoom={zoom} />
        <ambientLight intensity={0.5} />
        <Particles 
          handPos={handPos} 
          mousePos={mousePos} 
          shape={shape} 
          customTextPoints={customTextPoints}
        />
      </Canvas>
      
      <div style={{ 
        position: 'absolute', top: '30px', left: '30px', color: '#00f0ff', 
        fontFamily: 'monospace', fontSize: '14px', textShadow: '0 0 5px #00f0ff', pointerEvents: 'none'
      }}>
        &gt; SYSTEM: {cameraStatus} <br />
        &gt; HAND DETECTED: {handDetected ? 'TRUE' : 'FALSE'} <br />
        <span style={{ color: 'white', opacity: 0.7, marginTop: '5px', display: 'block', fontSize: '12px' }}>
          &gt; Created by Ulug'bek Haydarov
        </span>
      </div>
    </div>
  );
}