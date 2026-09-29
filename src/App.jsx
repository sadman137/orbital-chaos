import React, { useRef, useEffect, useState } from 'react';

const OBJECT_TYPES = {
  PLANET: { name: 'PLANET', mass: 15, radius: 6, color: '#00ffcc' },
  STAR: { name: 'STAR', mass: 1000, radius: 14, color: '#ffcc00' },
  BLACK_HOLE: { name: 'BLACK HOLE', mass: 5000, radius: 10, color: '#ff0055' }
};

export default function App() {
  const canvasRef = useRef(null);
  const [selectedType, setSelectedType] = useState('PLANET');
  const [showTrails, setShowTrails] = useState(true);

  // Web Audio Synth setup
  const audioCtxRef = useRef(null);

  const playLaunchSound = (type) => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Frequency mapping based on mass
    const baseFreq = type === 'BLACK_HOLE' ? 80 : type === 'STAR' ? 150 : 400;
    osc.type = type === 'BLACK_HOLE' ? 'sawtooth' : 'sine';

    osc.frequency.setValuteAtTime(baseFreq, ctx.currentTime);
    osc.frequency.exponentialRamptoValueAtTime(baseFreq * 2.5, ctx.currentTime + 0.15);


    gain.gain.setValuteAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRamptoValueAtTime(0.001, ctx.currentTime + 0.2);

    osc.connect(gain);
    osc.stop(ctx.currentTime + 0.2);
  };

  // Simulation bodies
  const [bodies, setBodies] = useState([
    { x: 450, y: 325, vx: 0, vy: 0, mass: 1000, radius: 14, color: '#ffcc00', trail: [] },
    { x: 450, y: 175, vx: 2.2, vy: 0, mass: 10, radius: 6, color: '#00ccff', trail: [] }
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
          body.trail = [...(body.trail || []), { x: body.x, y: body.y}];
          if (body.trail.length > 30) {
            body.trail.shift();
          }

          body.x += body.vx;
          body.y += body.vy;
        }

        return nextBodies;
      });
    };

    const drawGrid = () => {
      ctx.strokeStyle = '#00ff6615';
      ctx.lineWidth = 1;

      // Radar Concentric Circles
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      for (let r = 100; r < 500; r += 100) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Crosshairs
      ctx.beginPath();
      ctx.moveTo(cx, 0); ctx.lineTo(cx, canvas.height);
      ctx.moveTo(0, cy); ctx.lineTo(canvas.width, cy);
      ctx.strokeStyle = '#00ff6625';
      ctx.stroke();
    };

    const render = () => {
      // Background & trails
      ctx.fillStyle = 'rgba(5, 5, 12, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      drawGrid();

      // Trail Rendering
      if (showTrails) {
        bodies.forEach((body) => {
        if (!body.trail || body.trail.length < 2) return;

        ctx.save();
        for (let i = 0; i < body.trail.length - 1; i++) {
          const p1 = body.trail[i];
          const p2 = body.trail[i + 1];

          // Fading opacity
          const alpha = (i / body.trail.length) * 0.6;

          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = body.color;
          ctx.globalAlpha = alpha;
          ctx.lineWidth = 1.5;
          ctx.stroke();
          }
          ctx.restore();
        });
      }

      // Render celestial bodies
      bodies.forEach((body) => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(body.x, body.y, body.radius, 0, Math.PI * 2);
        ctx.fillStyle = body.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = body.color;
        ctx.fill();
        

        if (body.mass >= 5000) {
          ctx.beginPath();
          ctx.arc(body.x, body.y, body.radius + 5, 0, Math.PI * 2);
          ctx.strokeStyle = '#ff0055';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        ctx.restore();
      });

      // Render trajectory vector preview line
      if (dragStart && dragCurrent) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(dragStart.x, dragStart.y);
        ctx.lineTo(dragCurrent.x, dragCurrent.y);
        ctx.strokeStyle = '#00ff66';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(dragStart.x, dragStart.y, 8, 0, Math.PI * 2);
        ctx.strokeStyle = '#00ff66';
        ctx.stroke();
        ctx.restore();
      }

      updatePhysics();
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [bodies, dragStart, dragCurrent, showTrails]);

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

    const preset = OBJECT_TYPES[selectedType];

    const newBody = {
      x: dragStart.x,
      y: dragStart.y,
      vx,
      vy,
      mass: preset.mass,
      radius: preset.radius,
      color: preset.color,
      trail: []
    };

    playLaunchSound(selectedType);

    setBodies((prev) => [...prev, newBody]);
    setDragStart(null);
    setDragCurrent(null);
  };

  const handleReset = () => {
    setBodies([
      { x: 450, y: 325, vx: 0, vy: 0, mass: 1000, radius: 14, color: '#ffcc00', trail: [] },
      { x: 450, y: 175, vx: 2.2, vy: 0, mass: 10, radius: 6, color: '#00ffcc', trail: [] }
    ]);
  };

  return (
    <div style={{ background: '#020204', width: '100vw', minHeight: '100vh', display: 'flex', color: '#00ff66', fontFamily: 'monospace', userSelect: 'none', overflow: 'hidden' }}>

      {/* Left Telemetry Sidebar */}
      <div style={{ width: '280px', borderRight: '1px solid #00ff6633', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', background: '#05070a', boxSizing: 'border-box' }}>
        <div>
          <h1 style={{ fontSize: '1.2rem', margin: 0, color: '#00ff66', letterSpacing: '2px', fontWeight: 'bold' }}>
            [ORBITAL_CHAOS]
          </h1>
          <p style={{ fontSize: '0.7rem', color: '#00ff66aa', margin: '4px 0 0 0' }}>
            SYS.VER // 0.2.1
          </p>
        </div>

        <div style={{ borderTop: '1px dashed #00ff6633', borderBottom: '1px dashed #00ff6633', padding: '12px 0', fontSize: '0.75rem', lineHeight: '1.6' }}>
          <div>&gt; RADAR_STATUS: ONLINE</div>
          <div>&gt; ACTIVE_BODIES: <span style={{ color: '#fff', fontWeight: 'bold' }}>{bodies.length}</span></div>
          <div>&gt; MOUSE_INPUT: VECTOR_LAUNCH</div>
        </div>

        <div style={{ fontSize: '0.7rem', color: '#00ff6688', lineHeight: '1.5' }}>
          INSTRUCTIONS:<br />
          1. CLICK + DRAG ON GRID<br />
          2. RELEASE TO LAUNCH<br />
          3. OBSERVE TRAJECTORY
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '0.7rem', color: '#00ff66aa' }}>&gt; SELECT_PAYLOAD:</div>
          {Object.keys(OBJECT_TYPES).map((type) => (
            <button 
              key={type}
              onClick={() => setSelectedType(type)}
              style={{
                background: selectedType === type ? OBJECT_TYPES[type].color : 'transparent',
                color: selectedType === type ? '#000' : OBJECT_TYPES[type].color,
                border: `1px solid ${OBJECT_TYPES[type].color}`,
                padding: '8px 12px',
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease'
              }}
            >
              [{OBJECT_TYPES[type].name}] M:{OBJECT_TYPES[type].mass}
            </button> 
          ))}

          <button
            onClick={handleReset}
            style={{
              background: 'transparent',
              color: showTrails ? '#00ff66' : '#666',
              border: `1px solid ${showTrails ? '#00ff66' : '#666'}`,
              padding: '8px 12px',
              fontFamily: 'monospace',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              textAlign: 'left',
              marginTop: '8px'
            }}
          >
            [TRAILS: {showTrails ? 'ENABLED' : 'DISABLED'}]
          </button>

          <button
            onClick={handleReset}
            style={{
              background: 'transparent',
              color: '#ff0055',
              border: '1px solid #ff0055',
              padding: '8px 12px',
              fontFamily: 'monospace',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              textAlign: 'left',
              marginTop: '12px'
            }}
          >
            [PURGE_SYSTEM_RESET]
          </button>
        </div>
      </div>

      {/* Main Radar Display Viewport */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#020204', position: 'relative', height: '100vh', boxSizing: 'border-box' }}>

        {/* Top Telemetry Header */}
        <div style={{ position: 'absolute', top: '16px', left: '24px', right: '24px', display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#00ff6677' }}>
          <span>GRID: 30X30_UNITS</span>
          <span>SECTOR: OORT_CLOUD</span>
        </div>

        {/* Canvas Viewport */}
        <canvas
          ref={canvasRef}
          width={800}
          height={540}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{ border: '1px solid #00ff6644', background: '#000000', cursor: 'crosshair', boxShadow: '0 0 30px rgba(0, 255, 102, 0.05)' }}
        />
      </div>
    </div>
  );
}