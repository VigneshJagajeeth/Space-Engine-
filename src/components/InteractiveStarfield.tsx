import React, { useEffect, useRef } from 'react';

export const InteractiveStarfield: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let width = window.innerWidth;
        let height = window.innerHeight;
        
        canvas.width = width;
        canvas.height = height;

        const stars = Array.from({ length: 600 }, () => {
            // Galaxy colors: purples, pinks, blues, cyans
            const colors = [
                [192, 132, 252], // Purple
                [232, 121, 249], // Pink
                [56, 189, 248],  // Light blue
                [129, 140, 248], // Indigo
                [255, 255, 255]  // White
            ];
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            return {
                x: (Math.random() - 0.5) * width * 3,
                y: (Math.random() - 0.5) * height * 3,
                z: Math.random() * 2000,
                baseSize: Math.random() * 2.5 + 0.5,
                color: `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${Math.random() * 0.6 + 0.4})`
            };
        });

        const handleResize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
        };

        const handleMouseMove = (e: MouseEvent) => {
            mouseRef.current.targetX = (e.clientX - width / 2) * 0.5;
            mouseRef.current.targetY = (e.clientY - height / 2) * 0.5;
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('mousemove', handleMouseMove);

        const animate = () => {
            ctx.fillStyle = 'rgba(5, 5, 7, 0.3)';
            ctx.fillRect(0, 0, width, height);

            // Interpolate mouse movement for smoothness
            mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
            mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;

            const cx = width / 2;
            const cy = height / 2;

            stars.forEach(star => {
                // Move stars towards camera
                star.z -= 4;
                if (star.z <= 0) {
                    star.z = 2000;
                    star.x = (Math.random() - 0.5) * width * 2;
                    star.y = (Math.random() - 0.5) * height * 2;
                }

                // Apply parallax based on mouse
                const parallaxX = mouseRef.current.x * (2000 - star.z) / 2000;
                const parallaxY = mouseRef.current.y * (2000 - star.z) / 2000;

                const px = ((star.x + parallaxX) / star.z) * 800 + cx;
                const py = ((star.y + parallaxY) / star.z) * 800 + cy;
                const s = Math.max(0.1, (star.baseSize * 1000) / star.z);

                if (px >= 0 && px <= width && py >= 0 && py <= height) {
                    ctx.beginPath();
                    ctx.arc(px, py, s, 0, Math.PI * 2);
                    ctx.fillStyle = star.color;
                    ctx.fill();
                }
            });

            animationFrameId = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none mix-blend-screen"
        />
    );
};
