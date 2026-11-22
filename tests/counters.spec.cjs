const { expect, test } = require("@playwright/test");
const { once } = require("node:events");
const { createTestServer } = require("./serve.cjs");

let server;

test.beforeAll(async () => {
  server = createTestServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
});

test.afterAll(async () => {
  if (!server?.listening) return;
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test.beforeEach(async ({ page }) => {
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
});

test("новая партия начинается с 1 уровня и 1 силы", async ({ page }) => {
  await expect(page.getByRole("status", { name: "Уровень" })).toHaveText("1");
  await expect(page.getByRole("status", { name: "Сила" })).toHaveText("1");
  await expect(
    page.getByRole("button", { name: "Убавить уровень" }),
  ).toBeDisabled();
});

test("игрок меняет уровень вместе с силой и отдельно учитывает бонус", async ({
  page,
}) => {
  const level = page.getByRole("status", { name: "Уровень" });
  const strength = page.getByRole("status", { name: "Сила" });

  await page.getByRole("button", { name: "Прибавить уровень" }).click();
  await expect(level).toHaveText("2");
  await expect(strength).toHaveText("2");

  await page.getByRole("button", { name: "Прибавить силу" }).click();
  await expect(level).toHaveText("2");
  await expect(strength).toHaveText("3");

  await page.getByRole("button", { name: "Убавить уровень" }).click();
  await expect(level).toHaveText("1");
  await expect(strength).toHaveText("2");

  await page.getByRole("button", { name: "Убавить силу" }).click();
  await expect(level).toHaveText("1");
  await expect(strength).toHaveText("1");
});

test("партия восстанавливается после перезагрузки страницы", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Прибавить уровень" }).click();
  await page.getByRole("button", { name: "Убавить силу" }).click();
  await page.reload();
  await expect(page.getByRole("status", { name: "Уровень" })).toHaveText("2");
  await expect(page.getByRole("status", { name: "Сила" })).toHaveText("1");
});

test("новая партия сбрасывает оба счётчика только после подтверждения", async ({
  page,
  context,
}) => {
  await page.evaluate(() => {
    localStorage.setItem("munchkin.level", "8");
    localStorage.setItem("munchkin.strength", "23");
  });
  await page.reload();

  const newGame = page.getByRole("button", { name: "Новая игра" });
  const dialog = page.getByRole("dialog", { name: "Начать новую игру?" });
  const cancel = dialog.getByRole("button", { name: "Отмена" });
  const start = dialog.getByRole("button", { name: "Начать" });
  const level = page.getByRole("status", { name: "Уровень" });
  const strength = page.getByRole("status", { name: "Сила" });

  await newGame.press("Enter");
  await expect(cancel).toBeFocused();
  await cancel.click();
  await expect(dialog).toBeHidden();
  await expect(newGame).toBeFocused();
  await expect(level).toHaveText("8");
  await expect(strength).toHaveText("23");
  await page.reload();
  await expect(level).toHaveText("8");
  await expect(strength).toHaveText("23");

  await newGame.click();
  await cancel.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(level).toHaveText("8");
  await expect(strength).toHaveText("23");

  await newGame.click();
  await dialog.locator(".new-game-panel").click({ position: { x: 8, y: 8 } });
  await expect(dialog).toBeVisible();
  await page.mouse.click(8, 8);
  await expect(dialog).toBeHidden();
  await expect(newGame).toBeFocused();
  await expect(level).toHaveText("8");
  await expect(strength).toHaveText("23");

  await newGame.click();
  await start.click();
  await expect(dialog).toBeHidden();
  await expect(level).toHaveText("1");
  await expect(strength).toHaveText("1");
  await expect(
    page.getByRole("button", { name: "Убавить уровень" }),
  ).toBeDisabled();

  await page.reload();
  await expect(level).toHaveText("1");
  await expect(strength).toHaveText("1");

  const otherTab = await context.newPage();
  await otherTab.goto(page.url());
  await expect(otherTab.getByRole("status", { name: "Уровень" })).toHaveText(
    "1",
  );
  await expect(otherTab.getByRole("status", { name: "Сила" })).toHaveText("1");
});

test.describe("сенсорный экран", () => {
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });

  test("касание фона закрывает диалог без pointerdown на диалоге", async ({
    page,
  }) => {
    const newGame = page.getByRole("button", { name: "Новая игра" });
    const dialog = page.getByRole("dialog");
    await newGame.tap();
    await expect(dialog).toBeVisible();

    await page.evaluate(() => {
      document.addEventListener(
        "pointerdown",
        (event) => {
          event.stopPropagation();
        },
        { capture: true, once: true },
      );
    });
    await page.touchscreen.tap(12, 12);
    await expect(dialog).toBeHidden();
  });
});

test("сохранённые пограничные значения отключают соответствующие кнопки", async ({
  page,
}) => {
  await page.evaluate(() => {
    localStorage.setItem("munchkin.level", "10");
    localStorage.setItem("munchkin.strength", "-1000");
  });
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Прибавить уровень" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Убавить силу" }),
  ).toBeDisabled();

  await page.getByRole("button", { name: "Убавить уровень" }).click();
  await expect(page.getByRole("status", { name: "Уровень" })).toHaveText("9");
  await expect(page.getByRole("status", { name: "Сила" })).toHaveText("-1000");
  await expect(
    page.getByRole("button", { name: "Прибавить уровень" }),
  ).toBeEnabled();
});
