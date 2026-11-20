// Configuration des tests dans le navigateur (Playwright).
// Lancement : npx playwright test   (ou : npm run test:navigateur)
// Chaque fichier de test démarre son propre petit serveur (tests/serveur.mjs).
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/navigateur',
  timeout: 60_000,
  fullyParallel: true,
  reporter: [['list']],
  use: {
    browserName: 'chromium',
    trace: 'off',
    locale: 'fr-FR',
    serviceWorkers: 'allow',
  },
});
