import React from 'react';

export const SpaceVideoBackground: React.FC = () => {
    return (
        <video 
            src="https://assets.mixkit.co/videos/preview/mixkit-galaxy-with-stars-in-the-universe-2851-large.mp4" 
            className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none opacity-30 mix-blend-screen"
            muted
            autoPlay
            loop
            playsInline
            preload="auto"
            style={{ filter: 'contrast(1.2) saturate(1.5)' }}
        />
    );
};
