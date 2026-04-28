import React, { useState, useEffect, useRef } from 'react';
import { SpaceVideoBackground } from './components/SpaceVideoBackground';
import { InteractiveStarfield } from './components/InteractiveStarfield';
import { GraphicsCanvas } from './components/GraphicsCanvas';
import { Slider, SliderGroup } from './components/Sliders';
import { computeTransformMatrix4 } from './lib/matrix4';

function useInView(options: IntersectionObserverInit = {}) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Rely on threshold area percentage (0.5) to naturally prevent overlapping during fast scrolling
    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.threshold]); // Depend on threshold incase it re-renders


  return [ref, isIntersecting] as const;
}

const TransformSection = ({ 
  title, num, description, align, children, onEnter, onReset, id
}: any) => {
  const [ref, inView] = useInView({ threshold: 0.5 });
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
             <SliderGroup num={num} title={title} description={description} align="left" onReset={onReset}>
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

const SunCursor = ({ isLightOff = false }: { isLightOff?: boolean }) => {
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
      <div className={`absolute inset-0 rounded-full scale-[0.4] transition-colors duration-1000 ${isLightOff ? 'bg-white/30' : 'bg-white'}`} />
      <div className={`absolute inset-0 rounded-full scale-[0.7] transition-all duration-1000 ${isLightOff ? 'bg-[#555555] opacity-30' : 'bg-[#ffebaa] opacity-80'}`} />
      <div className={`absolute inset-0 rounded-full mix-blend-screen scale-[1.5] blur-[4px] transition-all duration-1000 ${isLightOff ? 'bg-[#333333] opacity-10' : 'bg-[#ffaa00] opacity-30'}`} />
    </div>
  );
};

export default function App() {
  const [started, setStarted] = useState(false);
  const [uiVisible, setUiVisible] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [isLightOff, setIsLightOff] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const [typedText, setTypedText] = useState('');
  const [isTypingDone, setIsTypingDone] = useState(false);
  const fullText = "THE PHYSICS\nOF SPACE";

  const [hideUI, setHideUI] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [activeModel, setActiveModel] = useState('earth');
  const [isMuted, setIsMuted] = useState(false);

  const handleToggleMute = () => {
    setIsMuted(prev => {
      const next = !prev;
      if (audioRef.current) audioRef.current.muted = next;
      return next;
    });
  };

  useEffect(() => {
    if (hideUI) {
      setShowHint(true);
      const t = setTimeout(() => setShowHint(false), 3000);
      return () => clearTimeout(t);
    } else {
      setShowHint(false);
    }
  }, [hideUI]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'l') {
        setIsLightOff(prev => !prev);
      }
      if (e.key.toLowerCase() === 'h') {
        setHideUI(false);
        setShowSettingsMenu(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  useEffect(() => {
    if (!showSplash && !started) {
      let i = 0;
      const interval = setInterval(() => {
        setTypedText(fullText.substring(0, i));
        i++;
        if (i > fullText.length) {
          clearInterval(interval);
          setTimeout(() => setIsTypingDone(true), 200);
        }
      }, 150);
      return () => clearInterval(interval);
    }
  }, [showSplash, started, fullText]);
  
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [tz, setTz] = useState(0);
  const [rotX, setRotX] = useState(0);
  const [rotY, setRotY] = useState(0);
  const [rotZ, setRotZ] = useState(0);
  const [sx, setSx] = useState(1);
  const [sy, setSy] = useState(1);
  const [sz, setSz] = useState(1);
  const [scaleAll, setScaleAll] = useState(1);

  const [activeAlign, setActiveAlign] = useState<'center' | 'left' | 'right'>('center');
  const [activeSection, setActiveSection] = useState('intro');

  const [hideAxis, setHideAxis] = useState(false);

  const resetTransforms = () => {
    setTx(0); setTy(0); setTz(0); 
    setRotX(0); setRotY(0); setRotZ(0); 
    setSx(1); setSy(1); setSz(1); setScaleAll(1);
  };

  const handleSplashClick = () => {
    // Browser required user interaction for fullscreen and audio
    try {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
      }
    } catch (e) {
      console.log('Fullscreen blocked');
    }

    setShowSplash(false);
    if (audioRef.current) {
        audioRef.current.volume = 0.5;
        audioRef.current.play().catch(e => console.log("Audio failed:", e));
    }
  };

  const handleExperienceClick = () => {
    setStarted(true);
    setTimeout(() => {
        setUiVisible(true);
    }, 2000);
  };

  const handleResetApp = () => {
    setStarted(false);
    setUiVisible(false);
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
      <SunCursor isLightOff={isLightOff} />
      <FpsCounter visible={uiVisible && !hideUI} />
      {/* --- FIXED BACKGROUND LAYER --- */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-black">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#1a1a2e_0%,#050507_80%)] opacity-70 mix-blend-multiply" />
        <img src="/2k_stars_milky_way.jpg" alt="Milky Way" className="absolute inset-0 w-full h-full object-cover opacity-100 mix-blend-screen" />
        <SpaceVideoBackground />
        <BackgroundStars />
        <InteractiveStarfield />
      </div>

      {/* Native HTML5 Audio Player */}
      <audio ref={audioRef} src="/bgm.mp3" loop />

      {/* 3D Global Space View / Boxed View */}
      <div className={`fixed z-0 pointer-events-none transition-all duration-[400ms] ease-out overflow-hidden flex items-center justify-center
        ${!started || activeAlign === 'center' || hideUI ? 'inset-0 border border-transparent rounded-none bg-transparent shadow-none' : ''}
        ${started && activeAlign === 'left' && !hideUI ? 'top-[10vh] left-[5vw] right-[5vw] bottom-[55vh] md:top-[12vh] md:bottom-[12vh] md:h-auto md:left-[50vw] md:right-[5vw] border border-white/20 rounded-3xl bg-black/20 shadow-2xl backdrop-blur-2xl backdrop-saturate-150' : ''}
        ${started && activeAlign === 'right' && !hideUI ? 'top-[10vh] left-[5vw] right-[5vw] bottom-[55vh] md:top-[12vh] md:bottom-[12vh] md:h-auto md:left-[5vw] md:right-[50vw] border border-white/20 rounded-3xl bg-black/20 shadow-2xl backdrop-blur-2xl backdrop-saturate-150' : ''}
      `}>
        <GraphicsCanvas 
          matrix={matrix}
          started={started}
          tx={tx} ty={ty} tz={tz}
          rotX={rotX} rotY={rotY} rotZ={rotZ}
          isLightOff={isLightOff}
          hideUI={hideUI}
          hideAxis={hideAxis}
          activeModel={activeModel}
        />

        {/* Matrix HUD inside the boxed view */}
        {started && (
          <div className={`absolute bottom-6 left-6 md:bottom-8 md:left-8 z-40 transition-all duration-1000 ${uiVisible && !hideUI && (activeSection === 'trans' || activeSection === 'rot' || activeSection === 'scale') ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-8 pointer-events-none'}`}>
             <div className="flex flex-col items-start">
               <div className="text-[8px] md:text-[9px] uppercase tracking-[0.2em] text-white/50 mb-1 md:mb-2 bg-black/50 px-2 py-1 rounded inline-block backdrop-blur border border-white/10">Global Transform Matrix [4x4]</div>
               <div className="font-[Courier_New,Courier,monospace] text-[8px] md:text-[9px] text-[#38bdf8] leading-[1.3] whitespace-pre bg-black/60 p-2 md:p-3 rounded-lg border border-white/10 backdrop-blur-md shadow-[0_0_15px_rgba(0,0,0,0.5)]">
{`[ ${matrix[0][0].toFixed(2).padStart(6)}  ${matrix[0][1].toFixed(2).padStart(6)}  ${matrix[0][2].toFixed(2).padStart(6)}  ${matrix[0][3].toFixed(2).padStart(6)} ]
[ ${matrix[1][0].toFixed(2).padStart(6)}  ${matrix[1][1].toFixed(2).padStart(6)}  ${matrix[1][2].toFixed(2).padStart(6)}  ${matrix[1][3].toFixed(2).padStart(6)} ]
[ ${matrix[2][0].toFixed(2).padStart(6)}  ${matrix[2][1].toFixed(2).padStart(6)}  ${matrix[2][2].toFixed(2).padStart(6)}  ${matrix[2][3].toFixed(2).padStart(6)} ]
[ ${matrix[3][0].toFixed(2).padStart(6)}  ${matrix[3][1].toFixed(2).padStart(6)}  ${matrix[3][2].toFixed(2).padStart(6)}  ${matrix[3][3].toFixed(2).padStart(6)} ]`}
               </div>
             </div>
          </div>
        )}
      </div>

      {/* --- FIXED UI FRAME LAYER --- */}
      <header className={`fixed top-0 left-0 right-0 z-50 flex items-start justify-between p-6 lg:p-10 pointer-events-none transition-all duration-1000 ${showSplash || hideUI ? 'opacity-0 -translate-y-8' : 'opacity-100 translate-y-0'}`}>
        <div>
          <h1 
            onClick={handleResetApp}
            className="text-3xl md:text-4xl lg:text-5xl font-black leading-none tracking-tighter uppercase m-0 text-transparent bg-clip-text bg-gradient-to-br from-[#ffffff] via-[#e2e8f0] to-[#94a3b8] drop-shadow-[0_0_25px_rgba(255,255,255,0.4)] flex items-center gap-3 md:gap-4 cursor-pointer pointer-events-auto transition-all duration-500 whitespace-nowrap hover:scale-105 hover:drop-shadow-[0_0_35px_rgba(255,255,255,0.6)]"
            title="Reset App"
          >
            COSMOS
            <span className="font-sans font-bold tracking-[0.2em] text-xl md:text-2xl lg:text-3xl bg-clip-text bg-gradient-to-r from-[#00f2fe] to-[#4facfe] text-transparent opacity-100 drop-shadow-[0_0_15px_rgba(0,242,254,0.8)]">
              ENGINE
            </span>
          </h1>
        </div>
      </header>

      {/* Fixed Top Right Tabs - Only visible when started */}
      {started && (
        <div className={`fixed top-6 lg:top-10 right-6 lg:right-10 z-40 flex justify-end items-center pointer-events-auto mix-blend-screen hidden md:flex transition-all duration-1000 delay-300 ${uiVisible && !hideUI ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8 pointer-events-none'}`}>
           <div className="flex items-center bg-white/5 backdrop-blur-xl border border-white/20 rounded-full p-1.5 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
               {[{ id: 'info', label: 'INFO' }, { id: 'trans', label: 'TRANSLATION' }, { id: 'rot', label: 'ROTATION' }, { id: 'scale', label: 'SCALING' }, { id: 'tech', label: 'TECH STACK' }, { id: 'about', label: 'ABOUT' }].map(tab => (
                 <button 
                   key={tab.id}
                   onClick={() => scrollToSection(tab.id)}
                   className="px-5 py-2.5 rounded-full text-center text-[10px] font-bold uppercase tracking-[0.2em] text-white/60 hover:text-white hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.15)] transition-all duration-300"
                 >
                  {tab.label}
                </button>
              ))}
           </div>
        </div>
      )}

      {/* --- SPLASH SCREEN --- */}
      <div 
        onClick={handleSplashClick}
        className={`fixed inset-0 z-[60] flex flex-col items-center justify-center transition-opacity duration-1000 cursor-pointer ${showSplash ? 'opacity-100 pointer-events-auto bg-[#050507]/60 backdrop-blur-sm' : 'opacity-0 pointer-events-none'}`}
      >
          <div className="text-white flex flex-col items-center">
             <span className="text-4xl lg:text-5xl mb-6 animate-bounce">🎧</span>
             <h2 className="text-sm md:text-lg font-black uppercase tracking-[0.4em] text-white animate-pulse drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] mb-8 text-center px-4">
               Headphones Recommended
             </h2>
             <span className="text-[10px] md:text-xs uppercase tracking-[0.3em] text-[#38bdf8] opacity-80 border border-[#38bdf8]/30 px-6 py-3 rounded-full hover:bg-[#38bdf8]/10 transition-colors">
               Click anywhere to enter fullscreen
             </span>
          </div>
      </div>

      {/* --- START PAGE LAYER --- */}
      <div className={`absolute inset-0 flex flex-col items-center justify-center z-20 px-4 text-center transition-all duration-1000 transform ${showSplash ? 'opacity-0 scale-95 pointer-events-none' : (uiVisible ? 'opacity-0 -translate-y-24 pointer-events-none' : (started ? 'opacity-0 pointer-events-none' : 'opacity-100 scale-100 pointer-events-auto delay-500 animate-fade-in-up'))}`}>
          {/* The sun pointer acts as a backlight here since it tracks the mouse in 3D right behind the text layer */}
          <div className="relative inline-block mt-16 md:mt-0 h-[150px] md:h-[200px] flex items-center justify-center">
             <h2 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-slate-400 via-slate-600 to-slate-800 tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.2)] p-4 leading-[1.1] md:leading-[1.1] whitespace-pre-wrap">
               {typedText}
               {!isTypingDone && <span className="inline-block w-2 md:w-4 h-10 md:h-20 bg-white/80 animate-pulse ml-2 align-middle"></span>}
             </h2>
          </div>
          
          <button 
            onClick={handleExperienceClick}
            className={`mt-12 px-12 py-4 bg-white/5 hover:bg-white/10 border border-white/20 hover:border-[#38bdf8]/50 rounded-full text-white/80 hover:text-white tracking-[0.3em] font-semibold text-base uppercase transition-all duration-1000 backdrop-blur-md hover:shadow-[0_0_40px_rgba(56,189,248,0.4)] hover:-translate-y-1 shadow-[0_0_20px_rgba(56,189,248,0.1)] ${isTypingDone ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'}`}
          >
            Experience
          </button>
      </div>

      {/* Fixed Scroll Down Ping */}
      {started && (
        <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-40 transition-all duration-500 ${uiVisible && !hideUI && activeSection === 'intro' ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-8 pointer-events-none'}`}>
           <div className="animate-bounce flex flex-col items-center text-white/50 cursor-pointer" onClick={() => scrollToSection('info')}>
              <span className="text-[10px] uppercase tracking-[0.2em] mb-2">Scroll Down</span>
              <svg className="w-6 h-6 border-2 border-white/20 rounded-full p-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
           </div>
        </div>
      )}

      {/* --- SCROLLING FOREGROUND LAYER --- */}
      {started && (
        <div className={`relative z-10 w-full max-w-[1400px] mx-auto flex flex-col pt-[100px] md:pt-0 transition-all duration-1000 transform ${uiVisible && !hideUI ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-24 pointer-events-none hidden'}`}>
          
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
                    This interactive exhibition allows you to manipulate parameters in real-time. Witness custom GLSL shaders react dynamically to your pointer, creating high-fidelity Day/Night cycles on NASA's Black Marble textures.
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
             onReset={() => { setTx(0); setTy(0); setTz(0); }}
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
             onReset={() => { setRotX(0); setRotY(0); setRotZ(0); }}
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
             onReset={() => { setSx(1); setSy(1); setSz(1); setScaleAll(1); }}
          >
             <Slider label="SCALE_ALL" min={0.2} max={2} step={0.05} value={scaleAll} onChange={(v: number) => { setScaleAll(v); setSx(v); setSy(v); setSz(v); }} unit="x" />
             <Slider label="SCALE_X" min={0.2} max={2} step={0.05} value={sx} onChange={setSx} unit="x" />
             <Slider label="SCALE_Y" min={0.2} max={2} step={0.05} value={sy} onChange={setSy} unit="x" />
             <Slider label="SCALE_Z" min={0.2} max={2} step={0.05} value={sz} onChange={setSz} unit="x" />
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
                        <h4 className="text-lg text-white font-semibold mb-2">React Three Fiber & GLSL</h4>
                        <p className="text-[#94a3b8] text-xs leading-relaxed mt-auto">Leveraging Three.js within React's declarative paradigm. Features custom GLSL shaders overriding physically-based materials for accurate terminator lines and Day/Night blends.</p>
                    </div>
                    <div className="bg-[#1a1a2e]/50 border border-white/5 p-6 rounded-2xl flex flex-col h-full">
                        <div className="text-[#e879f9] font-mono text-[10px] uppercase mb-2 tracking-widest">Style System</div>
                        <h4 className="text-lg text-white font-semibold mb-2">Tailwind CSS</h4>
                        <p className="text-[#94a3b8] text-xs leading-relaxed mt-auto">Utility-first styling powering the responsive HUD, seamless glassmorphic panels, and structural alignment across viewports.</p>
                    </div>
                    <div className="bg-[#1a1a2e]/50 border border-white/5 p-6 rounded-2xl flex flex-col h-full">
                        <div className="text-[#22c55e] font-mono text-[10px] uppercase mb-2 tracking-widest">Assets</div>
                        <h4 className="text-lg text-white font-semibold mb-2">NASA High-Res Maps</h4>
                        <p className="text-[#94a3b8] text-xs leading-relaxed mt-auto">Utilizing highly accurate Blue Marble and Black Marble imagery, completely isolated from ambient Environment maps to preserve shadow integrity.</p>
                    </div>
                </div>
             </div>
          </VisibilityTracker>

          {/* Footer Section - Massive Bold Text */}
          <VisibilityTracker
             id="about"
             className="min-h-[100dvh] flex flex-col items-center justify-end pb-24 md:pb-32 pointer-events-none text-center relative z-20"
             onVisible={() => { setActiveAlign('center'); setActiveSection('footer'); }}
          >
              <h2 className="text-4xl sm:text-6xl md:text-8xl lg:text-9xl font-black uppercase tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-t from-white/10 via-white/50 to-white/80 drop-shadow-[0_0_30px_rgba(255,255,255,0.15)] mix-blend-screen animate-fade-in pointer-events-auto">
                 MADE BY<br/>VIGNESH
              </h2>
          </VisibilityTracker>
        </div>
      )}
      {/* Settings / Hide UI Toggle */}
      {started && uiVisible && !hideUI && (
        <div className="fixed bottom-6 left-6 md:bottom-10 md:left-10 z-[60] pointer-events-auto flex flex-col-reverse items-start gap-4">
            <button 
                onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                className="w-12 h-12 bg-[#050507]/80 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)]"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </button>

            {/* Drop up menu */}
            <div className={`flex flex-col gap-2 transition-all duration-300 origin-bottom ${showSettingsMenu ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4 pointer-events-none'}`}>
                <button 
                    onClick={() => {
                        setActiveModel(prev => prev === 'asteroid' ? 'earth' : 'asteroid');
                        setShowSettingsMenu(false);
                    }}
                    className="px-4 py-2 bg-[#050507]/90 backdrop-blur-xl border border-white/20 rounded-lg text-xs font-bold tracking-widest uppercase text-white/80 hover:text-white hover:bg-white/10 transition-colors whitespace-nowrap flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {activeModel === 'asteroid' ? 'Load Earth' : 'Load Asteroid'}
                </button>
                <button 
                    onClick={() => {
                        setHideAxis(prev => !prev);
                        setShowSettingsMenu(false);
                    }}
                    className="px-4 py-2 bg-[#050507]/90 backdrop-blur-xl border border-white/20 rounded-lg text-xs font-bold tracking-widest uppercase text-white/80 hover:text-white hover:bg-white/10 transition-colors whitespace-nowrap flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                    {hideAxis ? 'Show Axis' : 'Hide Axis'}
                </button>
                <button 
                    onClick={handleToggleMute}
                    className="px-4 py-2 bg-[#050507]/90 backdrop-blur-xl border border-white/20 rounded-lg text-xs font-bold tracking-widest uppercase text-white/80 hover:text-white hover:bg-white/10 transition-colors whitespace-nowrap flex items-center gap-2"
                >
                    {isMuted ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
                    ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6v12m-3.536-9.536a5 5 0 000 7.072M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                    )}
                    {isMuted ? 'Unmute Music' : 'Mute Music'}
                </button>
                <button 
                    onClick={() => {
                        setHideUI(true);
                        setShowSettingsMenu(false);
                    }}
                    className="px-4 py-2 bg-[#050507]/90 backdrop-blur-xl border border-white/20 rounded-lg text-xs font-bold tracking-widest uppercase text-white/80 hover:text-white hover:bg-white/10 transition-colors whitespace-nowrap flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    Hide UI
                </button>
            </div>
        </div>
      )}

      {/* Return UI hint */}
      <div className={`fixed top-10 left-1/2 -translate-x-1/2 z-[70] transition-all duration-1000 pointer-events-none ${showHint ? 'opacity-100 translate-y-0 delay-500' : 'opacity-0 -translate-y-8'}`}>
         <div className="bg-black/50 backdrop-blur-md px-8 py-3 rounded-full border border-white/20 text-xs font-bold tracking-[0.3em] text-white uppercase shadow-[0_0_20px_rgba(255,255,255,0.1)]">
             Press H to return
         </div>
      </div>
    </div>
  );
}
