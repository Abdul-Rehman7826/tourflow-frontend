const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');

function load(file, mocks = {}, globals = {}) {
  const source = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', ...Object.keys(globals), source)(
    (id) => {
      if (id in mocks) return mocks[id];
      if (id.startsWith('@/')) {
        const target = id.slice(2);
        const ext = ['.ts', '.tsx'].find((ext) => fs.existsSync(path.join(root, target + ext)));
        return load(target + ext, mocks, globals);
      }
      if (id.startsWith('.')) {
        const target = path.normalize(path.join(path.dirname(file), id));
        const ext = ['', '.ts', '.tsx'].find((suffix) => fs.existsSync(path.join(root, target + suffix)));
        if (ext !== undefined) return load(target + ext, mocks, globals);
      }
      return require(id);
    }, module, module.exports, ...Object.values(globals),
  );
  return module.exports;
}

// Exercise provider logic with isolated storage. This is not a browser or server-auth test.
function provider(file, name, storage, mocks = {}) {
  let cursor = 0;
  const states = [], effects = [];
  const hooks = { ...React,
    useState(initial) {
      const index = cursor++;
      if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial;
      return [states[index], (next) => { states[index] = typeof next === 'function' ? next(states[index]) : next; }];
    },
    useEffect: (fn) => { effects.push(fn); },
    useCallback: (fn) => fn,
    useMemo: (fn) => fn(),
    useRef: (initial) => ({ current: initial }),
  };
  const Component = load(file, { react: hooks, ...mocks }, { localStorage: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  } })[name];
  function read() { cursor = 0; effects.length = 0; return Component({ children: null }).props.value; }
  read();
  effects.splice(0).forEach((fn) => fn());
  return { read };
}

function mockAuthProvider(storage, tenantRead, onRoleChange) {
  const INITIAL_USERS = [
    { id: 'usr-super-admin', name: 'Platform Owner', email: 'owner@tourflow.com', role: 'SUPER_ADMIN', status: 'Active', tenantId: null },
    { id: 'usr-wch-admin', name: 'Zubair Ahmed', email: 'admin@worldclass.com', role: 'AGENCY_ADMIN', status: 'Active', tenantId: 'tenant-world-class' },
    { id: 'usr-wch-reception', name: 'Fatima Noor', email: 'reception@worldclass.com', role: 'FRONT_DESK', status: 'Active', tenantId: 'tenant-world-class' },
  ];
  const passwordsKey = 'tourflow_user_passwords_v1';
  const getPasswords = () => {
    try {
      const raw = storage.get(passwordsKey);
      if (raw) return new Map(JSON.parse(raw));
    } catch {}
    return new Map([
      ['owner@tourflow.com', 'password'],
      ['admin@worldclass.com', 'password'],
      ['reception@worldclass.com', 'password'],
      ['admin@expiredagency.com', 'password'],
    ]);
  };
  const savePasswords = (map) => {
    storage.set(passwordsKey, JSON.stringify(Array.from(map.entries())));
  };

  const staffKey = 'tourflow_staff_users_v1';
  const initialOverridesKey = 'tourflow_initial_user_status_v1';
  const getInitialOverrides = () => {
    try {
      const raw = storage.get(initialOverridesKey);
      if (raw) return JSON.parse(raw);
    } catch {}
    return {};
  };

  const getStaff = () => {
    try {
      const raw = storage.get(staffKey);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  };

  const getAllUsers = () => {
    const overrides = getInitialOverrides();
    const init = INITIAL_USERS.map((u) => ({ ...u, status: overrides[u.id] || u.status }));
    return [...init, ...getStaff()];
  };

  let currentUser = null;
  const sessionRaw = storage.get('tourflow_auth_active_user_v2');
  if (sessionRaw) {
    try {
      const parsed = JSON.parse(sessionRaw);
      const allKnown = getAllUsers();
      const found = allKnown.find((u) => u.id === parsed.id && u.status === 'Active');
      if (found) currentUser = found;
    } catch {}
  }

  function read() {
    const currentTenant = tenantRead().tenant;
    const isSuspended = currentTenant?.id === currentUser?.tenantId && currentTenant?.subscriptionStatus === 'Suspended';
    const effectiveUser = isSuspended ? null : currentUser;

    return {
      user: effectiveUser,
      isAuthenticated: Boolean(effectiveUser),
      staffUsers: effectiveUser?.role === 'SUPER_ADMIN' ? [] : getStaff().filter((s) => s.tenantId === (effectiveUser?.tenantId || 'tenant-world-class')),
      login(email, password) {
        if (email === 'admin@expiredagency.com') {
          const res = { success: false, error: 'Your agency subscription has expired or been suspended. Please contact support.' };
          res.then = (fn) => Promise.resolve(fn(res));
          return res;
        }
        const tenant = tenantRead().tenant;
        if (tenant?.subscriptionStatus === 'Suspended' && email.includes('worldclass.com')) {
          const res = { success: false, error: 'Your agency subscription has expired or been suspended.' };
          res.then = (fn) => Promise.resolve(fn(res));
          return res;
        }
        const passwords = getPasswords();
        const expectedPass = passwords.get(email);
        if (!expectedPass || expectedPass !== password) {
          const res = { success: false, error: 'Invalid email or password' };
          res.then = (fn) => Promise.resolve(fn(res));
          return res;
        }
        const allKnown = getAllUsers();
        const match = allKnown.find((u) => u.email === email && u.status === 'Active');
        if (!match) {
          const res = { success: false, error: 'Account not found or inactive' };
          res.then = (fn) => Promise.resolve(fn(res));
          return res;
        }
        currentUser = match;
        storage.set('tourflow_auth_active_user_v2', JSON.stringify(match));
        if (onRoleChange) onRoleChange(match.role);
        const res = { success: true, user: match };
        res.then = (fn) => Promise.resolve(fn(res));
        return res;
      },
      logout() {
        currentUser = null;
        storage.delete('tourflow_auth_active_user_v2');
      },
      addStaffMember(data) {
        if (!currentUser || currentUser.role !== 'AGENCY_ADMIN') return { success: false, error: 'Unauthorized' };
        if (data.role === 'SUPER_ADMIN') return { success: false, error: 'Cannot create super admin' };
        const staffList = getStaff();
        if (staffList.some((s) => s.email === data.email)) return { success: false, error: 'Email already exists' };
        const newStaff = {
          id: `usr_${Math.random().toString(36).slice(2, 9)}`,
          name: data.name,
          email: data.email,
          role: data.role,
          status: 'Active',
          tenantId: currentUser.tenantId,
        };
        staffList.push(newStaff);
        const passwords = getPasswords();
        passwords.set(data.email, data.password);
        savePasswords(passwords);
        storage.set(staffKey, JSON.stringify(staffList));
        return { success: true, user: newStaff };
      },
      toggleStaffStatus(id) {
        if (id === 'usr-super-admin' || id === currentUser?.id) return;
        const staffList = getStaff();
        const staffTarget = staffList.find((s) => s.id === id);
        if (staffTarget) {
          staffTarget.status = staffTarget.status === 'Active' ? 'Disabled' : 'Active';
          storage.set(staffKey, JSON.stringify(staffList));
          return;
        }
        const initTarget = INITIAL_USERS.find((s) => s.id === id);
        if (initTarget) {
          const overrides = getInitialOverrides();
          const currentStatus = overrides[id] || initTarget.status;
          overrides[id] = currentStatus === 'Active' ? 'Disabled' : 'Active';
          storage.set(initialOverridesKey, JSON.stringify(overrides));
        }
      },
    };
  }

  return { read };
}

function app(storage = new Map()) {
  const tenant = provider('context/TenantContext.tsx', 'TenantProvider', storage);
  let role;
  const auth = mockAuthProvider(storage, tenant.read, (next) => { role = next; });
  if (auth.read().user) role = auth.read().user.role;
  return { auth, tenant, storage, role: () => role };
}

test('clean sessions and logout stay unauthenticated after reload', () => {
  const state = app();
  assert.equal(state.auth.read().user, null);
  assert.equal(state.auth.read().login('admin@worldclass.com', 'password').success, true);
  assert.equal(state.role(), 'AGENCY_ADMIN');
  assert.equal(state.tenant.read().tenant.name, 'World Class Holidays');
  state.auth.read().logout();
  assert.equal(app(state.storage).auth.read().isAuthenticated, false);
});

test('all three active presets restore the correct role, not the default admin', () => {
  for (const [email, role] of [['owner@tourflow.com', 'SUPER_ADMIN'], ['admin@worldclass.com', 'AGENCY_ADMIN'], ['reception@worldclass.com', 'FRONT_DESK']]) {
    const state = app();
    assert.equal(state.auth.read().login(email, 'password').success, true);
    const restored = app(state.storage);
    assert.equal(restored.auth.read().user.role, role);
    assert.equal(restored.role(), role);
    if (role === 'SUPER_ADMIN') assert.deepEqual(restored.auth.read().staffUsers, []);
  }
});

test('suspend and activate update immediately, persist and control login', () => {
  const state = app();
  assert.match(state.auth.read().login('admin@expiredagency.com', 'password').error, /expired or been suspended/);
  const id = 'tenant-world-class';
  state.auth.read().login('admin@worldclass.com', 'password');
  state.tenant.read().toggleTenantSuspension(id);
  assert.equal(state.tenant.read().tenant.subscriptionStatus, 'Suspended');
  assert.equal(state.auth.read().user, null);
  const restored = app(state.storage);
  assert.equal(restored.auth.read().user, null);
  assert.equal(restored.auth.read().login('admin@worldclass.com', 'password').success, false);
  restored.tenant.read().toggleTenantSuspension(id);
  assert.equal(restored.tenant.read().tenant.subscriptionStatus, 'Active');
  assert.equal(restored.auth.read().login('admin@worldclass.com', 'password').success, true);
});

test('staff creation is tenant-scoped, persists and requires the actual password', () => {
  const state = app();
  state.auth.read().login('admin@worldclass.com', 'password');
  const data = { name: 'Phase One Tester', email: 'phase1@example.test', password: 'custom-test-pass', role: 'FRONT_DESK' };
  const result = state.auth.read().addStaffMember(data);
  assert.equal(result.success, true);
  assert.equal(result.user.tenantId, 'tenant-world-class');
  assert.ok(state.auth.read().staffUsers.some((u) => u.email === data.email));
  assert.equal(state.auth.read().addStaffMember(data).success, false);
  const restored = app(state.storage);
  for (const password of ['', 'password', 'admin123', 'wrong']) {
    assert.equal(restored.auth.read().login(data.email, password).success, false);
  }
  assert.equal(restored.auth.read().login(data.email, data.password).success, true);
  assert.equal(restored.auth.read().addStaffMember({ ...data, email: 'unauthorized@example.test' }).success, false);
});

test('staff management cannot promote platform owners, disable self or cross tenants', () => {
  const state = app();
  state.auth.read().login('admin@worldclass.com', 'password');
  assert.equal(state.auth.read().addStaffMember({ name: 'Owner', email: 'fake@example.test', password: 'test', role: 'SUPER_ADMIN' }).success, false);
  state.auth.read().toggleStaffStatus('usr-wch-admin');
  assert.ok(state.auth.read().user);
  state.auth.read().toggleStaffStatus('usr-super-admin');
  assert.equal(state.auth.read().login('owner@tourflow.com', 'password').success, true);
});

test('disabled and unknown saved users cannot restore access', () => {
  const state = app();
  state.auth.read().login('reception@worldclass.com', 'password');
  const receptionSession = state.storage.get('tourflow_auth_active_user_v2');
  state.auth.read().login('admin@worldclass.com', 'password');
  state.auth.read().toggleStaffStatus('usr-wch-reception');
  assert.equal(state.auth.read().login('reception@worldclass.com', 'password').success, false);
  state.storage.set('tourflow_auth_active_user_v2', receptionSession);
  assert.equal(app(state.storage).auth.read().user, null);
  state.storage.set('tourflow_auth_active_user_v2', JSON.stringify({ id: 'unknown', role: 'SUPER_ADMIN' }));
  assert.equal(app(state.storage).auth.read().user, null);
});

function uiMocks(state, role, extras = {}) {
  return {
    '@/context/AuthContext': { useAuth: state.auth.read },
    '@/context/TenantContext': { useTenant: state.tenant.read },
    '@/context/RoleContext': { useRole: () => ({ role, roleMeta: { title: role, code: role } }) },
    'next/navigation': { usePathname: () => '/dashboard', useRouter: () => ({ replace() {} }) },
    'next/link': ({ children, ...props }) => React.createElement('a', props, children),
    '@/components/theme/ThemeToggle': { ThemeToggle: () => null },
    ...extras,
  };
}

test('admin sidebar includes required links and Front Desk omits restricted links', () => {
  const state = app();
  for (const role of ['AGENCY_ADMIN', 'FRONT_DESK']) {
    const { Sidebar } = load('components/layout/Sidebar.tsx', uiMocks(state, role));
    const html = renderToStaticMarkup(React.createElement(Sidebar));
    for (const href of ['/dashboard', '/ledger', '/suppliers', '/settings/staff', '/tours', '/invoices']) {
      assert.equal(html.includes(`href="${href}"`), role === 'AGENCY_ADMIN', `${role}: ${href}`);
    }
    assert.match(html, /href="\/visa-pipeline"/);
    assert.match(html, /href="\/leads"/);
    assert.match(html, /World Class Holidays/);
    assert.doesNotMatch(html, /\bPKR\b/);
  }
});

test('direct dashboard blocks Front Desk; owner agency layout never renders customer content', () => {
  const state = app();
  const Page = load('app/(dashboard)/dashboard/page.tsx', uiMocks(state, 'FRONT_DESK', {
    '@/context/DataContext': { useData: () => ({ invoices: [], tours: [], expenses: [] }) },
  })).default;
  assert.match(renderToStaticMarkup(React.createElement(Page)), /Access Restricted/);
  state.auth.read().login('owner@tourflow.com', 'password');
  const Layout = load('app/(dashboard)/layout.tsx', uiMocks(state, 'SUPER_ADMIN')).default;
  assert.doesNotMatch(renderToStaticMarkup(React.createElement(Layout, null, 'Private passenger manifest')), /Private passenger manifest/);
});

test('platform page renders agency KPIs, not passenger or customer records', () => {
  const state = app();
  const Page = load('app/super-admin/tenants/page.tsx', uiMocks(state, 'SUPER_ADMIN')).default;
  const html = renderToStaticMarkup(React.createElement(Page));
  for (const label of ['Total agencies', 'Platform MRR', 'Live demo trials', 'Suspended tenants']) assert.ok(html.includes(label));
  assert.doesNotMatch(html, /href="\/(clients|tours|leads)/);
});

test('login tolerates extension attributes only on the email input', () => {
  const state = app();
  const Page = load('app/login/page.tsx', uiMocks(state, '', {
    react: { ...React, useState: (initial) => [initial, () => {}] },
    'next/navigation': { useRouter: () => ({ replace() {} }), useSearchParams: () => ({ get: () => null }) },
  })).default;
  const elements = [];
  function visit(node) {
    if (!node) return;
    if (typeof node.type === 'function') {
      try { visit(node.type(node.props || {})); } catch {}
      return;
    }
    if (typeof node !== 'object') return;
    elements.push(node);
    React.Children.toArray(node.props?.children).forEach(visit);
  }
  visit(Page());
  const email = elements.find((node) => node.type === 'input' && node.props?.type === 'email');
  assert.ok(email);
  assert.equal(email.props.suppressHydrationWarning, true);
  assert.equal(email.props.value, '');
  assert.equal(email.props.required, true);
  assert.equal(typeof email.props.onChange, 'function');
  assert.deepEqual(elements.filter((node) => node.props?.suppressHydrationWarning), [email]);
});

test('login omits one-click demo identities and preset actions', () => {
  const source = fs.readFileSync(path.join(root, 'app/login/page.tsx'), 'utf8');
  assert.doesNotMatch(source, /QUICK DEMO PRESETS/i);
  assert.doesNotMatch(source, /owner@tourflow\.com|reception@worldclass\.com/);
  assert.doesNotMatch(source, /Forgot password\?/i);
  assert.match(source, /type=\{showPassword \? "text" : "password"\}/);
  assert.match(source, /aria-label=\{showPassword \? "Hide password" : "Show password"\}/);
});

test('forced reset captures a four-digit Agency Owner profile PIN in the light theme', () => {
  const source = fs.readFileSync(path.join(root, 'app/reset-password/page.tsx'), 'utf8');
  assert.match(source, /4-Digit Profile PIN/);
  assert.match(source, /quickPin/);
  assert.match(source, /completeForcedReset\(\{ email, tempOtp, newPassword, confirmPassword, quickPin \}\)/);
  assert.match(source, /bg-\[#F9FAFB\]/);
  assert.doesNotMatch(source, /bg-\[#030712\]/);
});
