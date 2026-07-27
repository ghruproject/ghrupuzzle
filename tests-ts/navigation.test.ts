import assert from 'node:assert/strict';
import test from 'node:test';
import { protectedNavigationContext } from '../lib/navigation';

test('admin routes render the full privileged navigation before session hydration', () => {
  assert.deepEqual(protectedNavigationContext('/admin'), {
    assumeAuthenticated: true,
    roles: ['administrator'],
  });
  assert.deepEqual(protectedNavigationContext('/admin/settings'), {
    assumeAuthenticated: true,
    roles: ['administrator'],
  });
});

test('review and dashboard routes render stable authenticated navigation', () => {
  assert.deepEqual(protectedNavigationContext('/review'), {
    assumeAuthenticated: true,
    roles: ['reviewer'],
  });
  assert.deepEqual(protectedNavigationContext('/dashboard'), {
    assumeAuthenticated: true,
    roles: [],
  });
});

test('public routes do not assume authentication or privileged roles', () => {
  assert.deepEqual(protectedNavigationContext('/'), {
    assumeAuthenticated: false,
    roles: [],
  });
  assert.deepEqual(protectedNavigationContext('/guides'), {
    assumeAuthenticated: false,
    roles: [],
  });
});
