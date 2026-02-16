import { useEffect, useRef } from 'react';

interface Word {
  x: number;
  y: number;
  text: string;
  size: number;
}

const NotFound = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const txtMinSize = 5;
    const txtMaxSize = 25;
    let keypress = false;
    const accelerate = 2;

    const random = (min: number, max: number) => Math.random() * (max - min + 1) + min;

    const rangeMap = (
      value: number,
      inMin: number,
      inMax: number,
      outMin: number,
      outMax: number,
    ) => ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;

    const words: Word[] = [];

    for (let i = 0; i < 25; i++) {
      ['404', 'page', 'not found', '404'].forEach((text) => {
        words.push({
          x: random(0, width),
          y: random(0, height),
          text,
          size: Math.floor(random(txtMinSize, txtMaxSize)),
        });
      });
    }

    const render = () => {
      ctx.fillStyle = 'rgba(0,0,0,1)';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#fff';

      words.forEach((word) => {
        ctx.font = `${word.size}px sans-serif`;
        const metrics = ctx.measureText(word.text);

        ctx.fillText(word.text, word.x, word.y);

        const speed = rangeMap(word.size, txtMinSize, txtMaxSize, 2, keypress ? 4 : 3);

        word.x += speed * (keypress ? accelerate : 1);

        if (word.x >= width) {
          word.x = -metrics.width * 2;
          word.y = random(0, height);
          word.size = Math.floor(random(txtMinSize, txtMaxSize));
        }
      });

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleKeyDown = () => {
      keypress = true;
    };

    const handleKeyUp = () => {
      keypress = false;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        margin: 0,
        padding: 0,
      }}
    />
  );
};

export default NotFound;
