const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

// Isolated component checks, not browser layout or pixel verification.
function load(file, mocks, globals = {}) {
  const source = ts.transpileModule(read(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', ...Object.keys(globals), source)(
    (id) => mocks[id] ?? require(id), module, module.exports, ...Object.values(globals),
  );
  return module.exports;
}

for (const theme of ['light', 'dark']) {
  test(`theme button switches from ${theme} to the opposite theme`, () => {
    let toggled = false;
    let selected;
    const { ThemeToggle } = load('components/theme/ThemeToggle.tsx', {
      '@/context/ThemeContext': {
        useTheme: () => ({ theme, toggleTheme: () => { toggled = true; } }),
        useAgencySettings: () => ({ update: (val) => { selected = val.mode; } }),
      },
      react: { ...React, useSyncExternalStore: () => true },
    });
    const button = ThemeToggle({});
    button.props.onClick();
    assert.equal(selected, theme === 'dark' ? 'light' : 'dark');
    assert.equal(toggled, true);
    assert.equal(button.props['aria-label'], `Switch to ${selected} mode`);
  });
}

test('mobile navigation manages modal, scroll lock, dismissal and cleanup', () => {
  let effect, opened = false, dismissed = 0, listener;
  const dialog = { showModal: () => { opened = true; }, close: () => { opened = false; } };
  const document = { body: { style: { overflow: 'auto' } } };
  const media = { matches: false, addEventListener: (_, fn) => { listener = fn; }, removeEventListener: () => { listener = null; } };
  const { MobileNavigation } = load('components/layout/MobileNavigation.tsx', {
    react: { ...React, useRef: () => ({ current: dialog }), useEffect: (fn) => { effect = fn; } },
  }, { document, window: { matchMedia: () => media } });
  const element = MobileNavigation({ open: true, onClose: () => { dismissed++; }, children: null });
  const cleanup = effect();
  assert.equal(opened, true);
  assert.equal(document.body.style.overflow, 'hidden');
  element.props.onCancel();
  element.props.onClick({ target: dialog, currentTarget: dialog });
  media.matches = true;
  listener();
  assert.equal(dismissed, 3);
  cleanup();
  assert.equal(opened, false);
  assert.equal(document.body.style.overflow, 'auto');
  assert.equal(listener, null);
});

test('theme tokens and responsive shell constraints remain configured', () => {
  const css = read('app/globals.css');
  assert.match(css, /--card-bg: #FFFFFF/);
  assert.match(css, /--background: #EFF1EB/);
  assert.match(css, /--card-border: #E4E5DD/);
  for (const file of ['app/(dashboard)/layout.tsx', 'app/super-admin/layout.tsx']) {
    assert.match(read(file), /<main className="min-w-0 flex-1/);
    assert.match(read(file), /<MobileNavigation/);
    assert.match(read(file), /hidden lg:flex/);
  }
  assert.match(read('app/layout.tsx'), /<ThemeProvider>/);
});

test('tables scroll when needed while the compact staff directory stays table-fixed', () => {
  function walk(directory) {
    return fs.readdirSync(path.join(root, directory), { withFileTypes: true }).flatMap((entry) => {
      const file = path.join(directory, entry.name);
      return entry.isDirectory() ? walk(file) : file.endsWith('.tsx') ? [file] : [];
    });
  }
  let count = 0;
  for (const file of [...walk('app'), ...walk('components')]) {
    const source = read(file);
    if (file === path.join('app', '(dashboard)', 'settings', 'staff', 'page.tsx')) {
      assert.match(source, /<table className="[^"]*w-full[^"]*table-fixed/);
      assert.doesNotMatch(source, /min-w-\[(1100|1200)px\]/);
      continue;
    }
    for (const match of source.matchAll(/<table\b/g)) {
      const preceding = source.slice(0, match.index).trimEnd();
      assert.match(preceding, /<div className="[^"]*(?:overflow-x-auto|hidden lg:block)[^"]*">$/, file);
      count++;
    }
  }
  assert.ok(count >= 8);
});
