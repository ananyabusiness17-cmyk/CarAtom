import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

test('technician field walkthrough is the device sheet (Maestro/Detox deferred)', () => {
  expect(existsSync(join(process.cwd(), 'e2e/walkthrough/TECHNICIAN-MANUAL.md'))).toBeTruthy();
  expect(existsSync(join(process.cwd(), 'e2e/walkthrough/ADMIN-MOBILE-MANUAL.md'))).toBeTruthy();
});
