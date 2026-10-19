import assert from 'node:assert/strict';
import { test } from 'node:test';

import { readNavigationItemInput } from '../src/ctrl/admin/web-navigation/input';
import { HttpError } from '../src/helper/http-error.helper';

const validInput = (): any => ({
  web_navigation_item_key: 'about',
  web_navigation_item_sort_order: 1,
  web_navigation_item_status: 1,
  translations: [
    {
      locale: 'id-ID',
      label: 'Tentang MATEX',
      path: '/path-yang-tidak-dipercaya',
      url: null,
      status: 1,
    },
    {
      locale: 'en-US',
      label: 'About MATEX',
      path: '/another-untrusted-path',
      url: null,
      status: 1,
    },
  ],
});

const rejectsWith = (input: unknown, code: string) =>
  assert.throws(
    () => readNavigationItemInput(input, 'id-ID'),
    (error: unknown) => error instanceof HttpError && error.status === 400 && error.code === code,
  );

test('fixed navigation derives public paths from the selected section', () => {
  const item = readNavigationItemInput(validInput(), 'id-ID');

  assert.deepEqual(
    item.translations.map(({ locale, path, url }) => ({ locale, path, url })),
    [
      { locale: 'id-ID', path: '/tentang-matex', url: null },
      { locale: 'en-US', path: '/en/about-matex', url: null },
    ],
  );
});

test('navigation rejects sections outside the fixed public header', () => {
  const input = validInput();
  input.web_navigation_item_key = 'marketplace';
  rejectsWith(input, 'WEB_NAVIGATION_ITEM_KEY_INVALID');
});

test('navigation requires localized labels for Indonesian and English', () => {
  const input = validInput();
  input.translations = input.translations.slice(0, 1);
  rejectsWith(input, 'WEB_NAVIGATION_ITEM_TRANSLATIONS_REQUIRED');
});

test('navigation needs an active label in the default locale', () => {
  const input = validInput();
  input.translations[0].status = 0;
  rejectsWith(input, 'WEB_NAVIGATION_ITEM_DEFAULT_TRANSLATION_REQUIRED');
});
