if (!window.penInjected) {
  window.penInjected = true;

  // ----------------------- Canvas Setup -----------------------
  const canvas = document.createElement("canvas");
  canvas.id = "glowCanvas";
  Object.assign(canvas.style, {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    zIndex: 999998,
    pointerEvents: "auto", // Important: allow mouse input
  });
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  let drawing = false;
  let currentPath = [];
  const strokes = [];

  let penWidth = 4;
  let penColor = [255, 0, 0]; // Default red

  const onMouseDown = (e) => {
    drawing = true;
    currentPath = [{ x: e.clientX, y: e.clientY }];
  };

  const onMouseMove = (e) => {
    if (!drawing) return;
    currentPath.push({ x: e.clientX, y: e.clientY });
  };

  const onMouseUp = () => {
    drawing = false;
    if (currentPath.length > 0) {
      strokes.push({
        path: [...currentPath],
        timestamp: Date.now(),
        color: [...penColor],
        width: penWidth,
      });
    }
    currentPath = [];
  };

  canvas.addEventListener("mousedown", onMouseDown);
  canvas.addEventListener("mousemove", onMouseMove);
  canvas.addEventListener("mouseup", onMouseUp);

  function drawLayeredStroke(path, opacity, color, width) {
    const [r, g, b] = color;
    const glowLayers = [
      { width: width + 5, blur: 40 },
      { width: width + 8, blur: 20 },
      { width: width + 8, blur: 80 },
      { width: width + 8, blur: 40 },
    ];

    for (const layer of glowLayers) {
      ctx.save();
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.strokeStyle = `rgba(${r},${g},${b},${opacity})`;
      ctx.lineWidth = layer.width;
      ctx.shadowColor = `rgba(${r},${g},${b},${opacity})`;
      ctx.shadowBlur = layer.blur;

      ctx.beginPath();
      if (path.length < 3) {
        ctx.moveTo(path[0].x, path[0].y);
        ctx.lineTo(path[1]?.x || path[0].x + 0.1, path[1]?.y || path[0].y + 0.1);
      } else {
        ctx.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < path.length - 2; i++) {
          const xc = (path[i].x + path[i + 1].x) / 2;
          const yc = (path[i].y + path[i + 1].y) / 2;
          ctx.quadraticCurveTo(path[i].x, path[i].y, xc, yc);
        }
        const n = path.length;
        ctx.quadraticCurveTo(path[n - 2].x, path[n - 2].y, path[n - 1].x, path[n - 1].y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // White core
    ctx.save();
ctx.lineJoin = "round";
ctx.lineCap = "round";
ctx.strokeStyle = `rgba(255,255,255,${opacity})`;
ctx.lineWidth = width;
ctx.globalAlpha = opacity; // subtle smoothing
ctx.beginPath();

if (path.length < 3) {
  // fallback: draw minimal line if not enough points
  ctx.moveTo(path[0].x, path[0].y);
  ctx.lineTo(path[1]?.x || path[0].x + 0.1, path[1]?.y || path[0].y + 0.1);
} else {
  let prevMid = {
    x: (path[0].x + path[1].x) / 2,
    y: (path[0].y + path[1].y) / 2,
  };

  ctx.moveTo(prevMid.x, prevMid.y);

  for (let i = 1; i < path.length - 1; i++) {
    const mid = {
      x: (path[i].x + path[i + 1].x) / 2,
      y: (path[i].y + path[i + 1].y) / 2,
    };

    ctx.quadraticCurveTo(path[i].x, path[i].y, mid.x, mid.y);
    prevMid = mid;
  }

  // ensure final segment is drawn
  const last = path[path.length - 1];
  ctx.lineTo(last.x, last.y);
}

ctx.stroke();
ctx.restore();

  }

  let animationFrameId;
  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const now = Date.now();
    const fadeDuration = 500;

    for (const stroke of strokes) {
      const elapsed = now - stroke.timestamp;
      const opacity = Math.max(0, 1 - elapsed / fadeDuration);
      if (opacity > 0) {
        drawLayeredStroke(stroke.path, opacity, stroke.color, stroke.width);
      }
    }

    if (currentPath.length > 1) {
      drawLayeredStroke(currentPath, 1, penColor, penWidth);
    }

    animationFrameId = requestAnimationFrame(render);
  }

  render();

  // ----------------------- UI Controls -----------------------
  const panel = document.createElement("div");
  panel.innerHTML = `
    <style>
      #penPanel {
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(30,30,30,0.9);
        color: white;
        padding: 12px 16px;
        border-radius: 12px;
        z-index: 999999;
        font-family: sans-serif;
        box-shadow: 0 0 12px rgba(0,0,0,0.3);
        user-select: none;
      }
      #penPanel input[type=range] {
        width: 100px;
      }
      #penPanel label {
        font-size: 12px;
        margin-right: 8px;
      }
      #penPanel input[type=color] {
        border: none;
        width: 30px;
        height: 30px;
        padding: 0;
        border-radius: 6px;
      }
      #penPanel button {
        background: #ff4444;
        color: white;
        border: none;
        border-radius: 6px;
        padding: 6px 12px;
        margin-top: 10px;
        margin-right: 6px;
        cursor: pointer;
      }
      #penPanel button:hover {
        background: #dd2222;
      }
      #exitBtn {
        background: #444;
      }
      #exitBtn:hover {
        background: #222;
      }
    </style>
    <div id="penPanel">
      <div>
        <label>Width:</label>
        <input type="range" id="widthSlider" min="1" max="20" value="${penWidth}">
      </div>
      <div style="margin-top:8px;">
        <label>Color:</label>
        <input type="color" id="colorPicker" value="#ff0000">
      </div>
      <div style="margin-top:8px;">
        <button id="clearCanvas">Clear</button>
        <button id="exitBtn">Exit</button>
      </div>
    </div>
  `;
  document.body.appendChild(panel);

  const widthSlider = document.getElementById("widthSlider");
  const colorPicker = document.getElementById("colorPicker");
  const clearBtn = document.getElementById("clearCanvas");
  const exitBtn = document.getElementById("exitBtn");

  widthSlider.addEventListener("input", () => {
    penWidth = parseInt(widthSlider.value);
  });

  colorPicker.addEventListener("input", () => {
    const hex = colorPicker.value;
    penColor = [
      parseInt(hex.substr(1, 2), 16),
      parseInt(hex.substr(3, 2), 16),
      parseInt(hex.substr(5, 2), 16),
    ];
  });

  clearBtn.addEventListener("click", () => {
    strokes.length = 0;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  });

  exitBtn.addEventListener("click", () => {
    cancelAnimationFrame(animationFrameId);
    canvas.remove();
    panel.remove();
    canvas.removeEventListener("mousedown", onMouseDown);
    canvas.removeEventListener("mousemove", onMouseMove);
    canvas.removeEventListener("mouseup", onMouseUp);
    window.penInjected = false;
  });
}
