const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");
const { Script } = require("node:vm");

const script = new Script(
  readFileSync(join(__dirname, "../js/counters.js"), "utf8"),
);

function setup(saved = {}, storageAvailable = true) {
  const storage = { ...saved };
  const counters = {};

  for (const name of ["level", "strength"]) {
    const output = { value: 1, classList: { toggle() {} } };
    const elements = { output };
    for (const step of [-1, 1]) {
      elements[`[data-step="${step}"]`] = { dataset: { step: String(step) } };
    }

    let onClick;
    counters[name] = {
      dataset: { counter: name },
      querySelector: (selector) => elements[selector],
      addEventListener(type, listener) {
        assert.equal(type, "click");
        onClick = listener;
      },
      click(step) {
        onClick({
          target: { closest: () => elements[`[data-step="${step}"]`] },
        });
      },
      output,
    };
  }

  const form = { addEventListener() {} };
  const elements = {
    "#new-game": { addEventListener() {} },
    "#new-game-dialog": { querySelector: () => form },
  };
  script.runInNewContext({
    document: {
      querySelectorAll: () => Object.values(counters),
      querySelector: (selector) => elements[selector],
    },
    localStorage: {
      getItem(key) {
        if (!storageAvailable) throw new Error("Storage unavailable");
        return storage[key] ?? null;
      },
      setItem(key, value) {
        if (!storageAvailable) throw new Error("Storage unavailable");
        storage[key] = value;
      },
    },
  });

  return {
    ...counters,
    storage,
    values: () => [counters.level.output.value, counters.strength.output.value],
  };
}

test("level changes apply the same delta to strength and save both values", () => {
  const game = setup({ "munchkin.level": "4", "munchkin.strength": "7" });
  game.level.click(1);
  assert.deepEqual(game.values(), [5, 8]);
  assert.deepEqual(game.storage, {
    "munchkin.level": "5",
    "munchkin.strength": "8",
  });

  game.level.click(-1);
  assert.deepEqual(game.values(), [4, 7]);
  assert.deepEqual(game.storage, {
    "munchkin.level": "4",
    "munchkin.strength": "7",
  });
});

test("strength buttons update only strength", () => {
  const game = setup();
  game.strength.click(-1);
  assert.deepEqual(game.values(), [1, 0]);
  assert.deepEqual(game.storage, { "munchkin.strength": "0" });
  game.strength.click(1);
  assert.deepEqual(game.values(), [1, 1]);
});

test("disabled level buttons leave both counters unchanged", () => {
  const lowest = setup();
  lowest.level.click(-1);
  assert.deepEqual(lowest.values(), [1, 1]);
  assert.deepEqual(lowest.storage, {});

  const highest = setup({ "munchkin.level": "10", "munchkin.strength": "7" });
  highest.level.click(1);
  assert.deepEqual(highest.values(), [10, 7]);
});

test("strength stays within its limits while level can still move", () => {
  const highest = setup({ "munchkin.level": "4", "munchkin.strength": "1000" });
  highest.level.click(1);
  assert.deepEqual(highest.values(), [5, 1000]);
  highest.level.click(-1);
  assert.deepEqual(highest.values(), [4, 999]);

  const lowest = setup({ "munchkin.level": "4", "munchkin.strength": "-1000" });
  lowest.level.click(-1);
  assert.deepEqual(lowest.values(), [3, -1000]);
  lowest.level.click(1);
  assert.deepEqual(lowest.values(), [4, -999]);
});

test("saved zero strength is restored, invalid values fall back and old ranges are clamped", () => {
  assert.deepEqual(setup({ "munchkin.strength": "0" }).values(), [1, 0]);
  assert.deepEqual(
    setup({ "munchkin.level": "abc", "munchkin.strength": "1.5" }).values(),
    [1, 1],
  );
  assert.deepEqual(
    setup({ "munchkin.level": "30", "munchkin.strength": "-2000" }).values(),
    [10, -1000],
  );
});

test("both counters can still be updated with browser storage unavailable", () => {
  const game = setup({}, false);
  game.level.click(1);
  assert.deepEqual(game.values(), [2, 2]);
  game.strength.click(-1);
  assert.deepEqual(game.values(), [2, 1]);
});
