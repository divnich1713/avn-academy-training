import { useState } from "react";

interface Particle {
  id: number;
  type: "ash" | "star";
  left: number; // percentage
  size: number; // px
  duration: number; // seconds
  delay: number; // seconds
  opacity: number;
}

export function HUDParticles() {
  const [particles] = useState<Particle[]>(() => {
    const generated: Particle[] = [];
    // Generate ash particles (15 items)
    for (let i = 0; i < 15; i++) {
      generated.push({
        id: i,
        type: "ash",
        left: Math.random() * 100,
        size: Math.random() * 3 + 2, // 2px to 5px
        duration: Math.random() * 6 + 6, // 6s to 12s
        delay: Math.random() * -12, // negative delay to start scattered
        opacity: Math.random() * 0.4 + 0.2, // 0.2 to 0.6
      });
    }
    // Generate gold star particles (10 items)
    for (let i = 0; i < 10; i++) {
      generated.push({
        id: i + 15,
        type: "star",
        left: Math.random() * 100,
        size: Math.random() * 6 + 6, // 6px to 12px
        duration: Math.random() * 8 + 7, // 7s to 15s
        delay: Math.random() * -15, // negative delay to start scattered
        opacity: Math.random() * 0.5 + 0.4, // 0.4 to 0.9
      });
    }
    return generated;
  });

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      {particles.map((p) => {
        if (p.type === "ash") {
          return (
            <div
              key={p.id}
              className="absolute rounded-full animate-fall-ash"
              style={{
                left: `${p.left}%`,
                top: `-20px`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                backgroundColor: "#d4d4d4",
                animationDuration: `${p.duration}s`,
                animationDelay: `${p.delay}s`,
                opacity: p.opacity,
              }}
            />
          );
        } else {
          return (
            <div
              key={p.id}
              className="absolute animate-fall-star flex items-center justify-center"
              style={{
                left: `${p.left}%`,
                top: `-20px`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                animationDuration: `${p.duration}s`,
                animationDelay: `${p.delay}s`,
                opacity: p.opacity,
              }}
            >
              <svg
                viewBox="0 0 24 24"
                style={{ fill: "#facc15", stroke: "#eab308" }}
                strokeWidth="1"
                className="w-full h-full"
              >
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
            </div>
          );
        }
      })}
    </div>
  );
}
