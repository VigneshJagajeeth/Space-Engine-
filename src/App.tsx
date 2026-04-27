import React, { useState, useEffect, useRef } from 'react';
import { SpaceVideoBackground } from './components/SpaceVideoBackground';
import { InteractiveStarfield } from './components/InteractiveStarfield';
import { GraphicsCanvas } from './components/GraphicsCanvas';
import { Slider, SliderGroup } from './components/Sliders';
import { computeTransformMatrix4 } from './lib/matrix4';
import ReactPlayer from 'react-player';

// Simple useInView hook
function useInView(options: IntersectionObserverInit = {}) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Override threshold to 0 and use a strict rootMargin to prevent overlapping active areas during fast scrolling
    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once

  return [ref, isIntersecting] as const;
}

const TransformSection = ({ 
  title, num, description, align, children, onEnter, id
}: any) => {
  const [ref, inView] = useInView({ threshold: 0.3 });
  const [hasEntered, setHasEntered] = useState(false);
  
  useEffect(() => {
    if (inView && !hasEntered) {
      if (onEnter) onEnter(id);
      setHasEntered(true);
    } else if (!inView && hasEntered) {
      // Re-arm when we scroll out of view so it animates back correctly
      setHasEntered(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);

  return (
    <div id={id} ref={ref} className="min-h-[100dvh] flex items-end md:items-center justify-center p-6 lg:p-20 pointer-events-none relative z-20 pb-[15dvh] md:pb-6">
       <div className={`w-full max-w-sm pointer-events-auto transition-all duration-[400ms] ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 md:translate-y-24 translate-y-12'} ${align === 'right' ? 'md:ml-auto md:mr-0 mx-auto' : 'md:mr-auto md:ml-0 mx-auto'}`}>
          <div className="bg-[#050507]/60 backdrop-blur-2xl border border-white/10 p-6 md:p-8 rounded-2xl shadow-2xl relative overflow-hidden">
             {/* Subtle inset highlight */}
             <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#38bdf8]/50 to-transparent" />
             <SliderGroup num={num} title={title} description={description} align="left">
                {children}
             </SliderGroup>
          </div>
       </div>
    </div>
  );
};

// Simple UseInView hook for alignment resets
const VisibilityTracker = ({ onVisible, children, className, id }: any) => {
  const [ref, inView] = useInView({ threshold: 0.5 });
  useEffect(() => {
    if (inView && onVisible) onVisible();
  }, [inView, onVisible]);
  return <div id={id} ref={ref} className={className}>{children}</div>;
};

import { Canvas, useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';

const FpsCounter = ({ visible }: { visible: boolean }) => {
  const [fps, setFps] = useState(0);
  
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animationFrameId: number;

    const tick = () => {
      const currentTime = performance.now();
      frameCount++;
      if (currentTime - lastTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (currentTime - lastTime)));
        frameCount = 0;
        lastTime = currentTime;
      }
      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div className={`fixed bottom-6 right-6 lg:bottom-10 lg:right-10 z-50 text-xs font-black uppercase tracking-[0.2em] text-white/50 mix-blend-screen transition-opacity duration-1000 pointer-events-none ${visible ? 'opacity-100' : 'opacity-0'}`}>
      FPS {fps}
    </div>
  );
};

const BackgroundStars = () => (
  <div className="absolute inset-0 pointer-events-none mix-blend-screen opacity-60">
    <Canvas camera={{ position: [0, 0, 1] }} dpr={[1, 1.5]}>
      <Stars radius={50} depth={50} count={5000} factor={6} saturation={1} fade speed={2} />
    </Canvas>
  </div>
);

const SunCursor = () => {
  const cursorRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div 
      ref={cursorRef} 
      className="fixed top-0 left-0 z-[9999] pointer-events-none will-change-transform"
      style={{
        width: '40px',
        height: '40px',
        marginLeft: '-20px',
        marginTop: '-20px',
      }}
    >
      <div className="absolute inset-0 bg-white rounded-full scale-[0.4]" />
      <div className="absolute inset-0 bg-[#ffebaa] rounded-full opacity-80 scale-[0.7]" />
      <div className="absolute inset-0 bg-[#ffaa00] rounded-full opacity-30 mix-blend-screen scale-[1.5] blur-[4px]" />
    </div>
  );
};

export default function App() {
  const [started, setStarted] = useState(false);
  const [uiVisible, setUiVisible] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [playingAudio, setPlayingAudio] = useState(false);
  
  useEffect(() => {
    // Auto fade splash screen to reveal the "Experience" button
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);
  
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [tz, setTz] = useState(0);
  const [rotX, setRotX] = useState(0);
  const [rotY, setRotY] = useState(0);
  const [rotZ, setRotZ] = useState(0);
  const [sx, setSx] = useState(1);
  const [sy, setSy] = useState(1);
  const [sz, setSz] = useState(1);

  const [activeAlign, setActiveAlign] = useState<'center' | 'left' | 'right'>('center');
  const [activeSection, setActiveSection] = useState('intro');

  const resetTransforms = () => {
    setTx(0); setTy(0); setTz(0); 
    setRotX(0); setRotY(0); setRotZ(0); 
    setSx(1); setSy(1); setSz(1);
  };

  const handleStart = () => {
    setStarted(true);
    setPlayingAudio(true); // START YOUTUBE AUDIO
    setTimeout(() => {
      setUiVisible(true);
    }, 2000);
  };

  const handleResetApp = () => {
    setStarted(false);
    setUiVisible(false);
    setPlayingAudio(false);
    resetTransforms();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setActiveAlign('center');
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const matrix = computeTransformMatrix4(tx, ty, tz, rotX, rotY, rotZ, sx, sy, sz);

  return (
    <div className={`relative min-h-[100dvh] bg-[#050507] text-[#ffffff] font-['Helvetica_Neue',Arial,sans-serif] cursor-none ${!started ? 'overflow-hidden h-[100dvh]' : ''}`}>
      <SunCursor />
      <FpsCounter visible={uiVisible} />
      {/* --- FIXED BACKGROUND LAYER --- */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <SpaceVideoBackground />
        <BackgroundStars />
        <InteractiveStarfield />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#1a1a2e_0%,#050507_80%)] opacity-70 mix-blend-multiply" />
      </div>

      {/* Hidden Audio Player for Background Music */}
      <ReactPlayer 
        url="https://www.youtube.com/watch?v=m86mBRKZHY0" 
        playing={playingAudio} 
        loop={true} 
        volume={0.5}
        width="0" 
        height="0" 
        style={{ display: 'none' }} 
      />

      {/* 3D Global Space View / Boxed View */}
      <div className={`fixed z-0 pointer-events-none transition-all duration-[400ms] ease-out overflow-hidden flex items-center justify-center
        ${!started || activeAlign === 'center' ? 'inset-0 border border-transparent rounded-none bg-transparent shadow-none' : ''}
        ${started && activeAlign === 'left' ? 'top-[10vh] left-[5vw] right-[5vw] bottom-[55vh] md:top-[12vh] md:bottom-[12vh] md:h-auto md:left-[50vw] md:right-[5vw] border border-white/20 rounded-3xl bg-black/20 shadow-2xl backdrop-blur-2xl backdrop-saturate-150' : ''}
        ${started && activeAlign === 'right' ? 'top-[10vh] left-[5vw] right-[5vw] bottom-[55vh] md:top-[12vh] md:bottom-[12vh] md:h-auto md:left-[5vw] md:right-[50vw] border border-white/20 rounded-3xl bg-black/20 shadow-2xl backdrop-blur-2xl backdrop-saturate-150' : ''}
      `}>
        <GraphicsCanvas 
          matrix={matrix}
          started={started}
          tx={tx} ty={ty} tz={tz}
          rotX={rotX} rotY={rotY} rotZ={rotZ}
        />
      </div>

      {/* --- FIXED UI FRAME LAYER --- */}
      <header className={`fixed top-0 left-0 right-0 z-50 flex items-start justify-between p-6 lg:p-10 pointer-events-none transition-all duration-1000 ${started ? (uiVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8') : 'opacity-100 translate-y-0'}`}>
        <div>
          <h1 
            onClick={handleResetApp}
            className="text-2xl lg:text-4xl font-black leading-[0.85] tracking-[-0.05em] uppercase m-0 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40 drop-shadow-2xl flex flex-col cursor-pointer pointer-events-auto hover:opacity-80 transition-opacity whitespace-nowrap"
            title="Reset App"
          >
            Cosmos
            <span className="text-[#e879f9] tracking-widest mt-1 text-lg lg:text-xl bg-clip-text bg-gradient-to-r from-[#38bdf8] to-[#e879f9] opacity-80 mix-blend-screen drop-shadow-[0_0_15px_rgba(232,121,249,0.8)]">Engine</span>
          </h1>
        </div>
      </header>

      {/* Fixed Matrix HUD - Only visible when started and scrolled past intro */}
      {started && (
        <div className={`fixed top-auto bottom-6 left-6 md:bottom-10 md:left-10 z-40 w-full md:w-auto flex justify-center md:justify-start transition-all duration-1000 ${uiVisible && (activeSection === 'trans' || activeSection === 'rot' || activeSection === 'scale') ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-8 pointer-events-none'}`}>
           <div className="flex flex-col items-center md:items-start">
             <div className="text-[8px] md:text-[9px] uppercase tracking-[0.2em] text-white/50 mb-1 md:mb-2 bg-black/50 px-2 py-1 rounded inline-block backdrop-blur border border-white/10">Global Transform Matrix [4x4]</div>
             <div className="font-[Courier_New,Courier,monospace] text-[8px] md:text-[9px] text-[#38bdf8] leading-[1.3] whitespace-pre bg-black/60 p-2 md:p-3 rounded-lg border border-white/10 backdrop-blur-md">
{`[ ${matrix[0][0].toFixed(2).padStart(6)}  ${matrix[0][1].toFixed(2).padStart(6)}  ${matrix[0][2].toFixed(2).padStart(6)}  ${matrix[0][3].toFixed(2).padStart(6)} ]
[ ${matrix[1][0].toFixed(2).padStart(6)}  ${matrix[1][1].toFixed(2).padStart(6)}  ${matrix[1][2].toFixed(2).padStart(6)}  ${matrix[1][3].toFixed(2).padStart(6)} ]
[ ${matrix[2][0].toFixed(2).padStart(6)}  ${matrix[2][1].toFixed(2).padStart(6)}  ${matrix[2][2].toFixed(2).padStart(6)}  ${matrix[2][3].toFixed(2).padStart(6)} ]
[ ${matrix[3][0].toFixed(2).padStart(6)}  ${matrix[3][1].toFixed(2).padStart(6)}  ${matrix[3][2].toFixed(2).padStart(6)}  ${matrix[3][3].toFixed(2).padStart(6)} ]`}
             </div>
           </div>
        </div>
      )}

      {/* Fixed Top Right Tabs - Only visible when started */}
      {started && (
        <div className={`fixed top-6 lg:top-10 right-6 lg:right-10 z-40 flex justify-end items-center gap-6 md:gap-10 pointer-events-auto mix-blend-screen hidden md:flex transition-all duration-1000 delay-300 ${uiVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8'}`}>
           {[{ id: 'info', label: 'INFO' }, { id: 'trans', label: 'TRANSLATION' }, { id: 'rot', label: 'ROTATION' }, { id: 'scale', label: 'SCALING' }, { id: 'tech', label: 'TECH STACK' }].map(tab => (
             <button 
               key={tab.id}
               onClick={() => scrollToSection(tab.id)}
               className="text-center text-xs font-black uppercase tracking-[0.2em] text-white/50 hover:text-white transition-colors py-1 hover:-translate-y-1 transform duration-300 relative group"
             >
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-[1px] w-0 bg-white/20 group-hover:bg-white group-hover:w-full transition-all"></span>
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* --- SPLASH SCREEN --- */}
      <div className={`fixed inset-0 z-[60] flex flex-col items-center justify-center transition-opacity duration-1000 ${showSplash ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
          <div className="text-white flex flex-col items-center">
             <span className="text-4xl lg:text-5xl mb-6 animate-bounce">🎧</span>
             <h2 className="text-sm md:text-lg font-black uppercase tracking-[0.4em] text-white animate-pulse drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">Headphones Recommended</h2>
          </div>
      </div>

      {/* --- START PAGE LAYER --- */}
      <div className={`absolute inset-0 flex flex-col items-center justify-center z-20 px-4 text-center transition-all duration-1000 transform ${showSplash ? 'opacity-0 scale-95 pointer-events-none' : (uiVisible ? 'opacity-0 -translate-y-24 pointer-events-none' : (started ? 'opacity-0 pointer-events-none' : 'opacity-100 scale-100 pointer-events-auto delay-500 animate-fade-in-up'))}`}>
          {/* The sun pointer acts as a backlight here since it tracks the mouse in 3D right behind the text layer */}
          <div className="relative inline-block mt-16 md:mt-0">
             <h2 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-br from-slate-400 via-slate-600 to-slate-800 tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.2)] p-4 leading-[1.1] md:leading-[1.1]">
               THE PHYSICS<br/>OF SPACE
             </h2>
          </div>
          
          <button 
            onClick={handleStart}
            className="mt-12 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/20 hover:border-[#38bdf8]/50 rounded-full text-white/80 hover:text-white tracking-[0.2em] font-light text-sm uppercase transition-all duration-500 backdrop-blur-md hover:shadow-[0_0_30px_rgba(56,189,248,0.3)] hover:-translate-y-1"
          >
            Experience
          </button>
      </div>

      {/* Fixed Scroll Down Ping */}
      {started && (
        <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-40 transition-all duration-500 ${uiVisible && activeSection === 'intro' ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-8 pointer-events-none'}`}>
           <div className="animate-bounce flex flex-col items-center text-white/50 cursor-pointer" onClick={() => scrollToSection('info')}>
              <span className="text-[10px] uppercase tracking-[0.2em] mb-2">Scroll Down</span>
              <svg className="w-6 h-6 border-2 border-white/20 rounded-full p-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
           </div>
        </div>
      )}

      {/* --- SCROLLING FOREGROUND LAYER --- */}
      {started && (
        <div className={`relative z-10 w-full max-w-[1400px] mx-auto flex flex-col pt-[100px] md:pt-0 transition-all duration-1000 transform ${uiVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-24 pointer-events-none'}`}>
          
          {/* Intro Empty Section with Ping */}
          <VisibilityTracker
             id="intro"
             className="min-h-[100dvh] flex flex-col items-center justify-end pb-24 pointer-events-none relative"
             onVisible={() => { setActiveAlign('center'); setActiveSection('intro'); }}
          >
             {/* Empty to allocate space to scroll down to next section */}
          </VisibilityTracker>

          {/* Info Section */}
          <VisibilityTracker
             id="info"
             className="min-h-[100dvh] flex flex-col items-start justify-center pointer-events-none relative px-6 md:px-20"
             onVisible={() => { setActiveAlign('left'); setActiveSection('info'); }}
          >
             <div className="max-w-xl bg-[#050507]/60 backdrop-blur-xl border border-white/10 p-8 md:p-12 rounded-3xl shadow-2xl relative overflow-hidden pointer-events-auto animate-fade-in">
                <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#e879f9]/70 to-transparent" />
                <h3 className="text-2xl md:text-4xl font-bold text-white mb-6 tracking-tight">Understanding WebGL Transformations</h3>
                <p className="text-[#94a3b8] text-sm md:text-base leading-relaxed mb-6 font-light text-left">
                    At the heart of every modern 3D graphics engine—from video games to interactive web visualizations—is linear algebra. Matrices are used to translate, rotate, and scale spatial coordinates.
                </p>
                <p className="text-[#94a3b8] text-sm md:text-base leading-relaxed mb-6 font-light text-left">
                    This interactive exhibition allows you to manipulate parameters in real-time, instantly visualizing the underlying mathematical constructs applied to a physically-based WebGL model. Everything rendered dynamically updates the 4x4 Global Transform Matrix.
                </p>
             </div>
          </VisibilityTracker>

          {/* Section 1: Translation */}
          <TransformSection
             num="01"
             title="Translation Vector"
             description="Redefining positional anchor points across the 3D Cartesian grid. Moves the object along X, Y, and Z axes."
             align="left"
             id="trans"
             onEnter={() => { setActiveAlign('left'); setActiveSection('trans'); }}
          >
             <Slider label="TRANSLATE_X" min={-1.5} max={1.5} step={0.1} value={tx} onChange={setTx} unit="u" />
             <Slider label="TRANSLATE_Y" min={-1.5} max={1.5} step={0.1} value={ty} onChange={setTy} unit="u" />
             <Slider label="TRANSLATE_Z" min={-1.5} max={1.5} step={0.1} value={tz} onChange={setTz} unit="u" />
          </TransformSection>

          {/* Section 2: Rotation */}
          <TransformSection
             num="02"
             title="Rotational Dynamics"
             description="Angular displacement relative to the 3D anchor origin. Applies Euler angles to reorient the cosmic body."
             align="right"
             id="rot"
             onEnter={() => { setActiveAlign('right'); setActiveSection('rot'); }}
          >
             <Slider label="ROTATE_X" min={-360} max={360} step={1} value={rotX} onChange={setRotX} unit="°" />
             <Slider label="ROTATE_Y" min={-360} max={360} step={1} value={rotY} onChange={setRotY} unit="°" />
             <Slider label="ROTATE_Z" min={-360} max={360} step={1} value={rotZ} onChange={setRotZ} unit="°" />
          </TransformSection>

          {/* Section 3: Scaling */}
          <TransformSection
             num="03"
             title="Scaling Principle"
             description="Expanding the celestial boundaries through linear mapping within a 3D volume."
             align="left"
             id="scale"
             onEnter={() => { setActiveAlign('left'); setActiveSection('scale'); }}
          >
             <Slider label="SCALE_X" min={0.2} max={2} step={0.05} value={sx} onChange={setSx} />
             <Slider label="SCALE_Y" min={0.2} max={2} step={0.05} value={sy} onChange={setSy} />
             <Slider label="SCALE_Z" min={0.2} max={2} step={0.05} value={sz} onChange={setSz} />
          </TransformSection>

          {/* Tech Stack Section */}
          <VisibilityTracker
             id="tech"
             className="min-h-[100dvh] flex flex-col items-end justify-center pointer-events-none text-left relative px-6 md:px-20 py-24"
             onVisible={() => { setActiveAlign('right'); setActiveSection('tech'); }}
          >
             <div className="w-full md:max-w-md lg:max-w-lg bg-[#050507]/60 backdrop-blur-xl border border-white/10 p-8 md:p-12 rounded-3xl shadow-2xl relative overflow-hidden pointer-events-auto">
                <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#38bdf8]/70 to-transparent" />
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-8 tracking-tight">System Architecture</h3>
                <div className="grid grid-cols-1 gap-6 text-left">
                    <div className="bg-[#1a1a2e]/50 border border-white/5 p-6 rounded-2xl flex flex-col h-full">
                        <div className="text-[#38bdf8] font-mono text-[10px] uppercase mb-2 tracking-widest">Rendering Engine</div>
                        <h4 className="text-lg text-white font-semibold mb-2">React Three Fiber</h4>
                        <p className="text-[#94a3b8] text-xs leading-relaxed mt-auto">Leveraging the power of Three.js within React's declarative paradigm. Enables physically based rendering, dynamic lighting, and orbital mathematics.</p>
                    </div>
                    <div className="bg-[#1a1a2e]/50 border border-white/5 p-6 rounded-2xl flex flex-col h-full">
                        <div className="text-[#e879f9] font-mono text-[10px] uppercase mb-2 tracking-widest">Style System</div>
                        <h4 className="text-lg text-white font-semibold mb-2">Tailwind CSS</h4>
                        <p className="text-[#94a3b8] text-xs leading-relaxed mt-auto">Utility-first styling powering the responsive HUD, seamless glassmorphic panels, and structural alignment across viewports.</p>
                    </div>
                    <div className="bg-[#1a1a2e]/50 border border-white/5 p-6 rounded-2xl flex flex-col h-full">
                        <div className="text-[#a78bfa] font-mono text-[10px] uppercase mb-2 tracking-widest">Logic Layer</div>
                        <h4 className="text-lg text-white font-semibold mb-2">Vanilla Linear Algebra</h4>
                        <p className="text-[#94a3b8] text-xs leading-relaxed mt-auto">A custom 4x4 matrix computation library mapping raw trigonometric operations directly isolated from the view library.</p>
                    </div>
                </div>
             </div>
          </VisibilityTracker>

          {/* Footer Section - Massive Bold Text Below Asteroid */}
          <VisibilityTracker
             className="min-h-[100dvh] flex flex-col items-center justify-end pb-24 md:pb-32 pointer-events-none text-center relative z-20"
             onVisible={() => { setActiveAlign('center'); setActiveSection('footer'); }}
          >
              <h2 className="text-4xl sm:text-6xl md:text-8xl lg:text-9xl font-black uppercase tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-t from-white/10 via-white/50 to-white/80 drop-shadow-[0_0_30px_rgba(255,255,255,0.15)] mix-blend-screen animate-fade-in pointer-events-auto">
                 MADE BY<br/>VIGNESH
              </h2>
          </VisibilityTracker>
        </div>
      )}
    </div>
  );
}
