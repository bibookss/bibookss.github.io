(() => {
  const root = document.documentElement;
  const themeButton = document.querySelector('#theme-toggle');
  const flowButton = document.querySelector('#flow-toggle');
  const flowLabel = document.querySelector('#flow-label');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const systemTheme = matchMedia('(prefers-color-scheme: dark)');
  const canvas = document.querySelector('#pipeline');
  const context = canvas.getContext('2d');
  let animationFrame = null;
  let previousTime = null;
  let elapsed = 0;
  let paths = [];
  let scenery = [];
  let palette;
  let storedFlow;
  let siteCounts = { visits: 0, valves: 0 };
  const station = document.querySelector('#instrumentation');
  const stationContext = station.getContext('2d');

  function readPreference(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  function savePreference(key, value) {
    try { localStorage.setItem(key, value); } catch { /* Preferences are optional. */ }
  }

  storedFlow = readPreference('portfolio-flow');
  let playing = !reducedMotion.matches && storedFlow !== 'paused';

  function updateTheme() {
    const dark = root.dataset.theme === 'dark';
    themeButton.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} theme`);
    themeButton.title = `Turn valve for ${dark ? 'light' : 'dark'} mode`;
    themeButton.querySelector('.valve-label').textContent = dark ? 'lights off' : 'lights on';
    document.querySelector('meta[name="theme-color"]').content = dark ? '#1b211e' : '#f8f7f3';
    palette = dark
      ? { outer: '#3a4738', inner: '#263025', highlight: '#46533f', packet: '#81996b', text: '#728169', bg: '#1b211e' }
      : { outer: '#acb99f', inner: '#e5eadc', highlight: '#95a987', packet: '#5c7c49', text: '#718665', bg: '#f8f7f3' };
    draw();
  }

  themeButton.hidden = false;
  themeButton.addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    savePreference('portfolio-theme', root.dataset.theme);
    updateTheme();
  });

  systemTheme.addEventListener('change', event => {
    if (!readPreference('portfolio-theme')) {
      root.dataset.theme = event.matches ? 'dark' : 'light';
      updateTheme();
    }
  });

  function updateFlow() {
    root.dataset.flow = playing ? 'playing' : 'paused';
    flowButton.setAttribute('aria-pressed', String(playing));
    flowButton.setAttribute('aria-label', playing ? 'Pause pipeline animation' : 'Play pipeline animation');
    flowLabel.textContent = playing ? 'pipes flowing' : 'pipes paused';
    flowButton.title = playing ? 'Turn valve to pause pipes' : 'Turn valve to play pipes';
    syncAnimation();
  }

  flowButton.hidden = false;
  flowButton.addEventListener('click', () => {
    playing = !playing;
    storedFlow = playing ? 'playing' : 'paused';
    savePreference('portfolio-flow', storedFlow);
    updateFlow();
  });

  reducedMotion.addEventListener('change', () => {
    playing = !reducedMotion.matches && storedFlow !== 'paused';
    updateFlow();
  });

  function makePath(points) {
    let length = 0;
    const segments = points.slice(1).map((end, index) => {
      const start = points[index];
      const distance = Math.hypot(end[0] - start[0], end[1] - start[1]);
      const segment = { start, end, distance, offset: length };
      length += distance;
      return segment;
    });
    return { points, segments, length };
  }

  function pointOnPath(path, distance) {
    const position = ((distance % path.length) + path.length) % path.length;
    const segment = path.segments.find(item => position < item.offset + item.distance) || path.segments.at(-1);
    const progress = (position - segment.offset) / segment.distance;
    return [
      Math.round(segment.start[0] + (segment.end[0] - segment.start[0]) * progress),
      Math.round(segment.start[1] + (segment.end[1] - segment.start[1]) * progress),
    ];
  }

  function resize() {
    // A deliberately low-resolution canvas gives every line a true pixel edge.
    canvas.width = Math.ceil(window.innerWidth / 3);
    station.width = canvas.width;
    station.height = 52;
    canvas.height = Math.ceil((window.innerWidth < 942 ? document.body.scrollHeight : window.innerHeight) / 3);
    paths = [];
    scenery = [];
    if (!context) return;
    context.imageSmoothingEnabled = false;
    const w = canvas.width;
    const h = canvas.height;
    const gutter = Math.floor((window.innerWidth - 672) / 6);

    themeButton.classList.toggle('on-pipeline', gutter >= 45);
    flowButton.classList.toggle('on-pipeline', gutter >= 45);
    if (gutter >= 45) {
      const left = gutter - 21;
      const right = w - gutter + 21;
      const upper = Math.round(h * .31);
      const lower = Math.round(h * .67);
      themeButton.style.setProperty("--valve-x", `${(right + 24) * window.innerWidth / w}px`);
      themeButton.style.setProperty("--valve-y", `${(upper + 10) * window.innerHeight / h}px`);
      flowButton.style.setProperty("--valve-x", `${right * window.innerWidth / w}px`);
      flowButton.style.setProperty("--valve-y", `${(upper + 60) * window.innerHeight / h}px`);
      paths = [
        makePath([[-8, upper - 38], [left - 22, upper - 38], [left - 22, upper], [left, upper], [left, lower], [left - 25, lower], [left - 25, h + 8]]),
        makePath([[w + 8, upper - 5], [right + 24, upper - 5], [right + 24, upper + 28], [right, upper + 28], [right, lower + 20], [right + 27, lower + 20], [right + 27, h + 8]]),
      ];
      scenery = [
        { kind: 'coupling', x: left - 34, y: upper - 38, vertical: false },
        { kind: 'coupling', x: left, y: upper + 15, vertical: true },
        { kind: 'valve', x: left - 22, y: upper - 17 },
        { kind: 'source', x: left - 22, y: upper - 55 },
        { kind: 'label', x: left - 31, y: upper - 62, text: 'ingest' },
        { kind: 'coupling', x: left - 25, y: lower + 24, vertical: true },
        { kind: 'coupling', x: right + 12, y: upper + 28, vertical: false },
        { kind: 'label', x: right + 2, y: upper - 16, text: 'transform' },
        { kind: 'coupling', x: right, y: lower - 24, vertical: true },
        { kind: 'warehouse', x: right, y: lower + 1 },
        { kind: 'label', x: right + 10, y: lower + 3, text: 'serve' },
        { kind: 'coupling', x: right + 27, y: lower + 43, vertical: true },
      ];
    } else {
      // On small screens the plumbing frames the document, away from the copy.
      paths = [
        makePath([[-8, 10], [12, 10], [12, 18], [w - 8, 18], [w - 8, 8], [w + 8, 8]]),
      ];
      scenery = [
        { kind: 'coupling', x: 25, y: 18, vertical: false },
        { kind: 'source', x: 12, y: 2 },
      ];
    }
    updateTheme();
    syncAnimation();
  }

  function strokePath(path, color, width) {
    context.beginPath();
    context.moveTo(...path.points[0]);
    path.points.slice(1).forEach(point => context.lineTo(...point));
    context.strokeStyle = color;
    context.lineWidth = width;
    context.lineJoin = 'miter';
    context.stroke();
  }

  function drawScenery(item) {
    const { x, y, kind } = item;
    if (kind === 'label') {
      context.fillStyle = palette.text;
      context.font = '3px monospace';
      context.fillText(item.text, x, y);
      return;
    }
    if (kind === 'coupling') {
      context.fillStyle = palette.highlight;
      context.fillRect(x - (item.vertical ? 5 : 1), y - (item.vertical ? 1 : 5), item.vertical ? 10 : 3, item.vertical ? 3 : 10);
      context.fillStyle = palette.inner;
      context.fillRect(x - (item.vertical ? 3 : 0), y - (item.vertical ? 0 : 3), item.vertical ? 6 : 1, item.vertical ? 1 : 6);
      return;
    }
    if (kind === 'valve') {
      context.fillStyle = palette.highlight;
      context.fillRect(x - 7, y - 1, 14, 3);
      context.fillRect(x - 5, y - 4, 10, 1);
      context.fillRect(x - 5, y + 4, 10, 1);
      context.fillRect(x - 7, y - 2, 2, 5);
      context.fillRect(x + 5, y - 2, 2, 5);
      context.fillRect(x - 1, y - 4, 3, 9);
      context.fillStyle = palette.packet;
      context.fillRect(x, y, 1, 1);
      return;
    }
    if (kind === 'source') {
      context.fillStyle = palette.highlight;
      [[-4, -3], [2, -3], [-4, 3], [2, 3]].forEach(([dx, dy]) => context.fillRect(x + dx, y + dy, 3, 3));
      return;
    }
    if (kind === 'warehouse') {
      context.fillStyle = palette.bg;
      context.fillRect(x - 9, y - 12, 18, 25);
      for (let row = 0; row < 3; row++) {
        context.fillStyle = palette.highlight;
        context.fillRect(x - 8, y - 11 + row * 8, 16, 7);
        context.fillStyle = palette.inner;
        context.fillRect(x - 7, y - 10 + row * 8, 14, 5);
        context.fillStyle = palette.packet;
        context.fillRect(x - 5, y - 8 + row * 8, 1, 1);
      }
    }
  }

  function draw() {
    if (!context || !palette) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    paths.forEach((path, index) => {
      strokePath(path, palette.outer, window.innerWidth < 942 ? 5 : 7);
      strokePath(path, palette.inner, window.innerWidth < 942 ? 3 : 5);
      const count = Math.max(2, Math.floor(path.length / 65));
      for (let packet = 0; packet < count; packet++) {
        const distance = elapsed * .012 + packet * path.length / count + index * 30;
        const [x, y] = pointOnPath(path, distance);
        context.fillStyle = palette.packet;
        context.fillRect(x - 1, y - 1, 2, 2);
      }
    });
    scenery.forEach(drawScenery);
    drawStation();
  }

  function drawStation() {
    if (!stationContext || !palette) return;
    const c = stationContext;
    const metal = root.dataset.theme === 'dark'
      ? { ...palette, outer: '#627255', inner: '#2b3527', highlight: '#849673', packet: '#a2bc8c' }
      : palette;
    const middle = Math.round(station.width / 2);
    const thickness = window.innerWidth < 942 ? 5 : 7;
    c.clearRect(0, 0, station.width, station.height);
    const box = (x, y, w, h, color) => { c.fillStyle = color; c.fillRect(x, y, w, h); };
    function pipe(points) {
      for (const [color, width] of [[metal.outer, thickness], [metal.inner, thickness - 2]]) {
        c.beginPath(); c.moveTo(...points[0]);
        points.slice(1).forEach(point => c.lineTo(...point));
        c.lineWidth = width; c.lineJoin = 'miter'; c.strokeStyle = color; c.stroke();
      }
    }
    function flange(x, y, vertical = false) {
      box(x - (vertical ? 5 : 1), y - (vertical ? 1 : 5), vertical ? 10 : 3, vertical ? 3 : 10, metal.highlight);
      box(x - (vertical ? 3 : 0), y - (vertical ? 0 : 3), vertical ? 6 : 1, vertical ? 1 : 6, metal.inner);
    }
    pipe([[-8, 48], [middle - 48, 48], [middle - 48, 44], [middle + 48, 44], [middle + 48, 48], [station.width + 8, 48]]);
    flange(middle - 41, 44);
    flange(middle + 41, 44);
    for (const [index, key] of ['visits', 'valves'].entries()) {
      const x = middle + (index ? 19 : -19);
      pipe([[x, 44], [x, 32]]);
      flange(x, 38, true);
      // A stepped cast-metal housing, with a lit top edge and a shaded base.
      box(x - 13, 9, 26, 25, metal.outer);
      box(x - 15, 11, 30, 21, metal.outer);
      box(x - 12, 10, 24, 23, metal.inner);
      box(x - 14, 12, 28, 19, metal.inner);
      box(x - 12, 10, 24, 1, metal.highlight);
      box(x - 13, 32, 26, 2, metal.highlight);
      for (const dx of [-12, 11]) for (const y of [12, 30]) {
        box(x + dx, y, 2, 2, metal.highlight);
        box(x + dx, y, 1, 1, palette.bg);
      }
      // Recessed glass and the exact mechanical counter below it.
      box(x - 10, 13, 20, 12, metal.highlight);
      box(x - 9, 14, 18, 10, palette.bg);
      box(x - 10, 26, 20, 6, metal.highlight);
      box(x - 9, 27, 18, 4, palette.bg);
      const value = siteCounts[key];
      const scale = Math.max(100, 10 ** Math.ceil(Math.log10(value || 1)));
      const level = value / scale;
      if (index === 0) {
        // Hand-stepped dial markings and a needle drawn one cell at a time.
        for (const [dx, y] of [[-7, 21], [-5, 17], [0, 15], [5, 17], [7, 21]]) box(x + dx, y, 1, 2, metal.highlight);
        const angle = Math.PI + Math.round(level * 8) / 8 * Math.PI;
        for (let radius = 0; radius <= 6; radius++) box(x + Math.round(Math.cos(angle) * radius), 22 + Math.round(Math.sin(angle) * radius), 1, 1, metal.packet);
        box(x - 1, 21, 3, 2, metal.highlight);
      } else {
        // Segmented sight glass, like a tiny industrial flow monitor.
        for (let row = 0; row < 3; row++) {
          box(x - 7, 16 + row * 3, 11, 1, metal.outer);
          box(x - 7, 16 + row * 3, Math.max(1, Math.round(level * 11)), 1, metal.packet);
          box(x + 6, 16 + row * 3, 1, 1, metal.highlight);
        }
      }
    }
    // A little inline strainer, connected to the same supply manifold.
    box(middle - 4, 39, 8, 10, metal.highlight);
    box(middle - 3, 40, 6, 8, metal.inner);
    for (let y = 41; y < 48; y += 2) box(middle - 2, y, 4, 1, metal.outer);
    // Packets keep the bottom assembly in the same animation as the pipes.
    for (let index = 0; index < 5; index++) {
      const x = Math.round((elapsed * .012 + index * station.width / 5) % station.width);
      if (Math.abs(x - middle) > 50) box(x, 47, 2, 2, metal.packet);
    }
  }

  document.addEventListener('metricschange', event => {
    siteCounts = event.detail;
    draw();
  });

  function animate(timestamp) {
    animationFrame = null;
    if (previousTime !== null) elapsed += Math.min(timestamp - previousTime, 60);
    previousTime = timestamp;
    draw();
    if (playing && !document.hidden && paths.length && context) animationFrame = requestAnimationFrame(animate);
  }

  function syncAnimation() {
    if (animationFrame !== null) cancelAnimationFrame(animationFrame);
    animationFrame = null;
    previousTime = null;
    draw();
    if (playing && !document.hidden && paths.length && context) animationFrame = requestAnimationFrame(animate);
  }

  document.addEventListener('visibilitychange', syncAnimation);
  window.addEventListener('resize', resize);
  new ResizeObserver(resize).observe(document.querySelector('.page'));
  window.addEventListener('pageshow', syncAnimation);
  window.addEventListener('pagehide', () => {
    if (animationFrame !== null) cancelAnimationFrame(animationFrame);
    animationFrame = null;
    previousTime = null;
  });

  resize();
  updateFlow();
})();
