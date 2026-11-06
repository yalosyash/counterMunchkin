for (const controls of document.querySelectorAll("[data-counter]")) {
  const output = controls.querySelector("output");
  const decrease = controls.querySelector('[data-step="-1"]');
  const increase = controls.querySelector('[data-step="1"]');
  const key = "munchkin." + controls.dataset.counter;
  const isLevel = controls.dataset.counter === "level";
  const minimum = isLevel ? 1 : Number.MIN_SAFE_INTEGER;
  const maximum = isLevel ? 10 : Number.MAX_SAFE_INTEGER;
  let value = Number(output.value);
  try {
    const stored = localStorage.getItem(key);
    const saved = Number(stored);
    if (stored !== null && Number.isSafeInteger(saved) && saved >= minimum) {
      value = Math.min(saved, maximum);
    }
  } catch {
    // The counter also works when browser storage is unavailable.
  }

  function render() {
    output.value = value;
    output.classList.toggle("long", String(value).length > 3);
    output.classList.toggle("wide", String(value).length > 5);
    decrease.disabled = value <= minimum;
    increase.disabled = value >= maximum;
  }

  controls.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-step]");
    if (!button || button.disabled) return;
    value += Number(button.dataset.step);
    render();
    try {
      localStorage.setItem(key, String(value));
    } catch {
      // Keep the current value in memory for this page session.
    }
  });

  render();
}
