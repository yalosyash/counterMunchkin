const counters = new Map();

for (const controls of document.querySelectorAll("[data-counter]")) {
  const output = controls.querySelector("output");
  const decrease = controls.querySelector('[data-step="-1"]');
  const increase = controls.querySelector('[data-step="1"]');
  const counter = controls.dataset.counter;
  const key = "munchkin." + counter;
  const isLevel = counter === "level";
  const minimum = isLevel ? 1 : -1000;
  const maximum = isLevel ? 10 : 1000;
  const initialValue = Number(output.value);
  let value = initialValue;
  try {
    const stored = localStorage.getItem(key);
    const saved = Number(stored);
    if (stored !== null && Number.isSafeInteger(saved)) {
      value = Math.min(Math.max(saved, minimum), maximum);
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

  function setValue(next) {
    value = next;
    render();
    try {
      localStorage.setItem(key, String(value));
    } catch {
      // Keep the current value in memory for this page session.
    }
  }

  function change(step) {
    const next = Math.min(Math.max(value + step, minimum), maximum);
    const delta = next - value;
    if (delta === 0) return;

    setValue(next);
    if (isLevel) counters.get("strength")?.change(delta);
  }

  controls.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-step]");
    if (!button || button.disabled) return;
    change(Number(button.dataset.step));
  });

  counters.set(counter, { change, reset: () => setValue(initialValue) });
  render();
}

const newGameButton = document.querySelector("#new-game");
const newGameDialog = document.querySelector("#new-game-dialog");

newGameButton.addEventListener("click", () => newGameDialog.showModal());
newGameDialog.querySelector("form").addEventListener("submit", (event) => {
  if (event.submitter?.value !== "start") return;
  for (const counter of counters.values()) counter.reset();
});
