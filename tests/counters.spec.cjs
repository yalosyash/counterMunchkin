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
