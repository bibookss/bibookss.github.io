(() => {
  const note = document.querySelector('#metrics-note');
  let queue = Promise.resolve();
  function record(event) {
    queue = queue.then(async () => {
      try {
        const response = await fetch('/api/metrics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event }),
        });
        if (!response.ok) throw new Error('Counters unavailable');
        const counts = await response.json();
        for (const key of ['visits', 'valves']) {
          const value = counts[key];
          if (!Number.isSafeInteger(value) || value < 0) throw new Error('Invalid counter');
          const meter = document.querySelector(`[data-meter="${key}"]`);
          meter.querySelector('.meter-value').textContent = value.toLocaleString();
          const scale = Math.max(100, 10 ** Math.ceil(Math.log10(value || 1)));

          meter.title = `Dial scale: 0–${scale.toLocaleString()}`;
        }
        document.dispatchEvent(new CustomEvent('metricschange', { detail: counts }));
        note.textContent = counts.preview
          ? 'Preview counters · separate from the live site.'
          : 'Page loads and valve turns, across all visitors.';
      } catch {
        note.textContent = 'Meters are unavailable right now.';
      }
    });
  }
  record('visits');
  document.querySelectorAll('#theme-toggle, #flow-toggle').forEach(button => {
    button.addEventListener('click', () => record('valves'));
  });
})();
