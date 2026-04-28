import React from 'react';

export const SliderGroup = ({ num, title, description, children, align = "left", onReset }: any) => (
    <div className={`mb-10 ${align === "right" ? "text-right" : "text-left"}`}>
        <div className={`flex items-center gap-4 mb-3 ${align === "right" ? "justify-end" : "justify-start"}`}>
            {align === "right" && <div className="h-[1px] flex-1 bg-gradient-to-l from-[#e879f9]/50 to-transparent" />}
            <span className="text-xl font-bold text-[#e879f9] opacity-80">{num}</span>
            {align === "left" && <div className="h-[1px] flex-1 bg-gradient-to-r from-[#e879f9]/50 to-transparent" />}
        </div>
        <div className={`flex items-center gap-4 mb-2 ${align === "right" ? "justify-end" : "justify-start"}`}>
            {align === "right" && onReset && (
                <button onClick={onReset} className="text-[10px] uppercase tracking-widest text-[#94a3b8] hover:text-white border border-white/10 hover:border-white/30 px-2 py-1 rounded transition-colors">Reset</button>
            )}
            <div className="text-2xl font-bold tracking-tight text-white">{title}</div>
            {align === "left" && onReset && (
                <button onClick={onReset} className="text-[10px] uppercase tracking-widest text-[#94a3b8] hover:text-white border border-white/10 hover:border-white/30 px-2 py-1 rounded transition-colors">Reset</button>
            )}
        </div>
        {description && (
            <p className="text-[14px] leading-relaxed text-[#94a3b8] mb-8 font-light">{description}</p>
        )}
        <div className="space-y-6">
            {children}
        </div>
    </div>
);

export const Slider = ({ label, min, max, step, value, onChange, unit = "" }: any) => (
    <div>
        {/* The line and thumb slider mimicking editorial style */}
        <div className="relative h-[2px] bg-white/10 w-full flex items-center mt-2 mb-3">
            <input
                type="range" min={min} max={max} step={step} value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="absolute w-full h-8 opacity-0 cursor-pointer z-10 -translate-y-1/2"
            />
            <div 
                className="absolute h-[4px] bg-[#38bdf8] pointer-events-none -translate-y-1/2" 
                style={{ left: `0%`, width: `${((value - min) / (max - min) * 100)}%` }} 
            />
            <div 
                className="absolute w-[12px] h-[12px] bg-white rounded-full pointer-events-none -translate-y-1/2 -translate-x-1/2 shadow-[0_0_10px_rgba(56,189,248,0.8)]" 
                style={{ left: `${((value - min) / (max - min) * 100)}%` }} 
            />
        </div>
        <div className="flex justify-between items-center text-[12px] text-white/70">
            <span>{label}</span>
            <span>{Number(value).toFixed(2)}{unit}</span>
        </div>
    </div>
);

