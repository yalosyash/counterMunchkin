# Тесты

Для запуска нужен Node.js 22. Выполняйте команды из корня репозитория.

```sh
npm ci
npx playwright install chromium
npm test
```

`npm run test:unit` запускает юнит-тесты логики счётчиков, а `npm run test:e2e` проверяет пользовательские сценарии в Chromium. На Linux для установки Chromium вместе с системными зависимостями используйте `npx playwright install --with-deps chromium`.
