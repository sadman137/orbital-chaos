import React, { useRef, useEffect, useState } from 'react';

export default function App() {
  const canvasRef = useRef(null);

  // Simulation bodies
  const [bodies, setBodies] = useState([
    { x: 450, y: 325, vx: 0, vy: 0, mass: 1000, radius: 14, color: '#ffcc00'},
    { x: 450, y: 175, vx: 2.2, vy: 0, mass: 10, radius: 6, color: '#00ccff'}
  ]);

  // Mouse launcher state
  const [dragStart, setDragStart] = useState(null);
  const [dragCurrent, setDragCurrent] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
  
    const G = 0.5; // Gravtiational constant

    const updatePhysics = () => {
      setBodies((prevBodies) => {
        const nextBodies = prevBodies.map((b) => ({ ...b }));

        for (let i = 0; i < nextBodies.length; i++) {
          let fx = 0;
          let fy = 0;

          for (let j = 0; j < nextBodies.length; j++) {
            if (i === j) continue;

            const dx = nextBodies[j].x - nextBodies[i].x;
            const dy = nextBodies[j].y - nextBodies[i].y;
            const distSq = dx * dx + dy * dy + 100; // Softening factor to prevent infinity
            const dist = Math.sqrt(distSq);

            const force = (G * nextBodies[i].mass * nextBodies[j].mass) / distSq;
            fx += force * (dx / dist);
            fy += force * (dy / dist);
          }

          nextBodies[i].vx += fx / nextBodies[i].mass;
          nextBodies[i].vy += fy / nextBodies[i].mass;
        }

        for (let body of nextBodies) {
          body.x += body.vx;
          body.y += body.vy;
        }

        return nextBodies;
      });
    };

    const render = () => {
      // Background & trails
      ctx.fillStyle = 'rgba(10, 10, 15, 0.25)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Render celestial bodies
      bodies.forEach((body) => {
        ctx.beginPath();
        ctx.arc(body.x, body.y, body.radius, 0, Math.PI * 2);
        ctx.fillStyle = body.color;
        ctx.shadowBlur = 12;
        ctx.shadowColor = body.color;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Render trajectory vector preview line
      if (dragStart && dragCurrent) {
        ctx.beginPath();
        ctx.moveTo(dragStart.x, dragStart.y);
        ctx.lineTo(dragCurrent.x, dragCurrent.y);
        ctx.strokeStyle = '#ff3366';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.arc(dragStart.x, dragStart.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#ff3366';
        ctx.fill();
      }

      updatePhysics();
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [bodies, dragStart, dragCurrent]);

  const getCanvasCoords = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleMouseDown = (e) => {
    const coords = getCanvasCoords(e);
    setDragStart(coords);
    setDragCurrent(coords);
  };

  const handleMouseMove = (e) => {
    if (!dragStart) return;
    setDragCurrent(getCanvasCoords(e));
  };

  const handleMouseUp = () => {
    if (!dragStart || !dragCurrent) return;

    const vx = (dragCurrent.x - dragStart.x) * 0.05;
    const vy = (dragCurrent.y - dragStart.y) * 0.05;

    const colors = ['#00ffcc', '#ff007f', '#a855f7', '#3b82f6', '#f97316'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newBody = {
      x: dragStart.x,
      y: dragStart.y,
      vx,
      vy,
      mass: 15,
      radius: 6,
      color: randomColor
    };

    setBodies((prev) => [...prev, newBody]);
    setDragStart(null);
    setDragCurrent(null);
  };

  return (
    <div style={{ background: '#0a0a0f', width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', userSelect: 'none' }}>
      <h1 style={{ marginBottom: '8px', fontSize: '1.8rem' }}>Orbital Chaos</h1>
      <p style={{ color: '#888', marginBottom: '16px' }}>Click and drag on the canvas to launch new planets!</p>
      <canvas
        ref={canvasRef}
        width={900}
        height={650}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ border: '1px solid #2a2a3c', borderRadius: '12px', background: '#000', cursor: 'crosshair' }}
      />
    </div>
  );
}