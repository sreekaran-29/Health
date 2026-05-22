import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { APPRoutes } from "../../Utils/Route";

const LinkExpired = () => {
  const canvasRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const COLORS = ["#60a5fa", "#93c5fd", "#3b82f6", "#bfdbfe", "#dbeafe"];

    class Particle {
      constructor() { this.reset(); }
      reset() {
        const cx = canvas.width / 2;
        this.x = cx + (Math.random() - 0.5) * 6;
        this.y = canvas.height * 0.32 + Math.random() * 10;
        this.size = Math.random() * 2 + 0.5;
        this.speedY = Math.random() * 1.2 + 0.4;
        this.speedX = (Math.random() - 0.5) * 0.3;
        this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
        this.opacity = Math.random() * 0.7 + 0.3;
        this.life = 0;
        this.maxLife = Math.random() * 120 + 60;
      }
      update() {
        this.y += this.speedY;
        this.x += this.speedX;
        this.life++;
        if (this.life > this.maxLife) this.reset();
      }
      draw() {
        ctx.save();
        ctx.globalAlpha = this.opacity * (1 - this.life / this.maxLife);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    const particles = [];
    for (let i = 0; i < 80; i++) {
      const p = new Particle();
      p.life = Math.random() * p.maxLife;
      particles.push(p);
    }

    let rafId;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => { p.update(); p.draw(); });
      rafId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafId);
    };
  }, []);

  const handleResend = () => {
    navigate(APPRoutes.FORGOT_PASSWORD);
  };

  const handleBack = () => {
    navigate(APPRoutes.LOGIN);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&family=DM+Sans:wght@300;400;500&display=swap');

        .le-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          font-family: 'DM Sans', sans-serif;
          background: var(--hc-auth-page-bg);
        }

        /* grain */
        .le-root::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.07'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 100;
        }

        /* vertical guide lines */
        .le-lines {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 1;
        }
        .le-line {
          position: absolute;
          top: 0; bottom: 0;
          width: 1px;
          background: linear-gradient(to bottom, transparent, rgba(59,130,246,0.12), transparent);
        }
        .le-line:nth-child(1) { left: 15%; }
        .le-line:nth-child(2) { left: 50%; }
        .le-line:nth-child(3) { right: 15%; }

        .le-canvas {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 2;
          opacity: 0.55;
        }

        .le-container {
          position: relative;
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 2rem 1.5rem;
          max-width: 520px;
        }

        /* hourglass */
        .le-hourglass {
          margin-bottom: 2rem;
          animation: le-tilt 6s ease-in-out infinite;
          filter: drop-shadow(0 0 22px rgba(59,130,246,0.4));
        }
        @keyframes le-tilt {
          0%,100% { transform: rotate(-2deg); }
          50%      { transform: rotate(2deg); }
        }

        .le-sand-top {
          animation: le-drain 3s ease-in-out infinite alternate;
          transform-origin: bottom center;
        }
        @keyframes le-drain {
          0%   { transform: scaleY(1);   opacity: 1; }
          100% { transform: scaleY(0.1); opacity: 0.3; }
        }

        .le-crack {
          stroke-dasharray: 60;
          stroke-dashoffset: 60;
          animation: le-drawCrack 1.4s 0.6s ease forwards;
        }
        @keyframes le-drawCrack {
          to { stroke-dashoffset: 0; }
        }

        /* divider */
        .le-divider {
          width: 1px;
          height: 40px;
          background: linear-gradient(to bottom, transparent, rgba(59,130,246,0.3), transparent);
          margin-bottom: 1.8rem;
          animation: le-fade 1s 0.8s both;
        }

        /* badge */
        .le-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.25);
          border-radius: 100px;
          padding: 5px 16px;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #f87171;
          margin-bottom: 1.5rem;
          animation: le-fade 1s 0.6s both;
        }
        .le-badge-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #f87171;
          animation: le-pulse 1.5s ease-in-out infinite;
        }
        @keyframes le-pulse {
          0%,100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.3; transform: scale(0.65); }
        }

        /* heading */
        .le-h1 {
          font-family: 'Playfair Display', serif;
          font-size: clamp(2.2rem, 5.5vw, 3rem);
          font-weight: 700;
          line-height: 1.15;
          color: #0f2a4a;
          margin-bottom: 1rem;
          animation: le-rise 0.9s 0.7s cubic-bezier(0.22,1,0.36,1) both;
        }
        .le-h1 em {
          font-style: italic;
          color: #60a5fa;
        }

        /* body text */
        .le-p {
          font-size: 15px;
          line-height: 1.75;
          color: #4a6080;
          max-width: 380px;
          margin-bottom: 1.8rem;
          animation: le-fade 1s 0.9s both;
        }
        .le-p strong { color: #3b82f6; font-weight: 500; }

        /* status line */
        .le-status {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 12px;
          letter-spacing: 0.1em;
          color: #6b9ac4;
          margin-bottom: 2rem;
          animation: le-fade 1s 1s both;
        }
        .le-status::before,
        .le-status::after {
          content: '';
          display: block;
          width: 28px;
          height: 1px;
          background: rgba(59,130,246,0.25);
        }

        /* buttons */
        .le-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
          max-width: 300px;
          animation: le-rise 0.9s 1.1s cubic-bezier(0.22,1,0.36,1) both;
        }

        .le-btn-primary {
          position: relative;
          padding: 14px 28px;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 500;
          letter-spacing: 0.04em;
          background: linear-gradient(135deg, #1d4ed8, #3b82f6);
          color: #fff;
          overflow: hidden;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 0 32px rgba(59,130,246,0.3);
        }
        .le-btn-primary::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, #2563eb, #60a5fa);
          opacity: 0;
          transition: opacity 0.3s;
          border-radius: 10px;
        }
        .le-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 0 44px rgba(59,130,246,0.5); }
        .le-btn-primary:hover::before { opacity: 1; }
        .le-btn-primary span { position: relative; z-index: 1; }

        .le-btn-secondary {
          padding: 13px 28px;
          border-radius: 10px;
          border: 1px solid rgba(59,130,246,0.18);
          background: transparent;
          color: #4a6080;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          cursor: pointer;
          letter-spacing: 0.03em;
          transition: border-color 0.2s, color 0.2s, transform 0.2s;
        }
        .le-btn-secondary:hover {
          border-color: rgba(59,130,246,0.45);
          color: #93c5fd;
          transform: translateY(-1px);
        }

        /* note */
        .le-note {
          margin-top: 2rem;
          font-size: 12px;
          color: rgba(74,96,128,0.55);
          letter-spacing: 0.05em;
          animation: le-fade 1s 1.4s both;
        }

        @keyframes le-rise {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes le-fade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>

      <div className="le-root">
        {/* Guide lines */}
        <div className="le-lines">
          <div className="le-line" />
          <div className="le-line" />
          <div className="le-line" />
        </div>

        {/* Sand canvas */}
        <canvas ref={canvasRef} className="le-canvas" />

        <div className="le-container">

          {/* Hourglass */}
          <div className="le-hourglass">
            <svg width="100" height="93" viewBox="0 0 80 100" fill="none">
              {/* Top glass */}
              <path d="M10 5 L70 5 L50 48 L30 48 Z" fill="rgba(59,130,246,0.06)" stroke="rgba(96,165,250,0.5)" strokeWidth="1.5" strokeLinejoin="round" />
              {/* Bottom glass */}
              <path d="M30 52 L50 52 L70 95 L10 95 Z" fill="rgba(59,130,246,0.06)" stroke="rgba(96,165,250,0.5)" strokeWidth="1.5" strokeLinejoin="round" />
              {/* Frames */}
              <rect x="8" y="2" width="64" height="5" rx="2" fill="rgba(59,130,246,0.4)" stroke="rgba(96,165,250,0.6)" strokeWidth="1" />
              <rect x="8" y="93" width="64" height="5" rx="2" fill="rgba(59,130,246,0.4)" stroke="rgba(96,165,250,0.6)" strokeWidth="1" />
              {/* Sand top draining */}
              <g className="le-sand-top">
                <path d="M14 10 L66 10 L50 44 L30 44 Z" fill="rgba(59,130,246,0.5)" />
              </g>
              {/* Sand bottom pile */}
              <path d="M22 88 Q40 72 58 88 Z" fill="rgba(96,165,250,0.4)" />
              {/* Crack */}
              <path className="le-crack" d="M38 30 L35 38 L40 43" stroke="rgba(239,68,68,0.85)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              {/* Drip */}
              <line x1="40" y1="48" x2="40" y2="52" stroke="rgba(96,165,250,0.9)" strokeWidth="1.5" strokeLinecap="round">
                <animate attributeName="opacity" values="1;0.1;1" dur="0.6s" repeatCount="indefinite" />
              </line>
            </svg>
          </div>

          <div className="le-divider" />

          {/* Badge */}
          <div className="le-badge">
            <span className="le-badge-dot" />
            Link Expired
          </div>

          {/* Heading */}
          <h1 className="le-h1">
            Your reset link has<br />
            <em>slipped away</em>
          </h1>

          {/* Description */}
          <p className="le-p">
            Password reset links are only valid for{" "}
            <strong>24 hours</strong> for your security. This one has already
            expired and can no longer be used.
          </p>

          {/* Status */}
          <div className="le-status">Expired · No longer valid</div>
          <div className="le-actions">
            <button className="le-btn-primary" onClick={handleResend}>
              <span>✦  Request a new link</span>
            </button>
            <button className="le-btn-secondary" onClick={handleBack}>
              Back to Sign in
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default LinkExpired;