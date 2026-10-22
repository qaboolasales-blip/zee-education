# Mobile connection, role launch & resilience map — Batch L

Scope: what the locked Mobile Preview already shows about first-time school connection, role launch and safe resilience, mapped to existing UI only.

Reference (read-only): `reference_ui/Zee Education — Mobile App Preview.html`

---

## 1. What the reference contains

### 1.1 First-time school connection

The mobile reference has an onboarding screen with:
- `<h2>First-time school connection</h2>` and `<p class="sub">QR scan ya manual domain/code entry; phir user apne account se login karega.</p>` — **connection happens before login**.
- Two inputs: `<input id="domain" value="horizon.school.pk" aria-label="School domain">` and `<input id="code" value="HZ-9246" aria-label="School code">`.
- `<button class="btn" onclick="connectSchool()">Connect school</button>`.
- `<button class="btn ghost" onclick="tab='Connect';render()">Open onboarding screen</button>`.
- A `Scan QR code` button → `notice('Camera scan ke liye real app/PWA permission chahiye')` — a real app/PWA permission is required.
- Onboarding screen (`tab='Connect'`) with `<h3>Connect your school</h3>`, hero `Option 1` "Scan QR code", a `.qrart` 9x9 QR illustration, and `Option 2 — Manual connection` (`horizon.school.pk — HZ-9246`).
- `Connect another school` → `notice('QR ya manual setup se school switch karein')`.

### 1.2 connectSchool(), transcribed

```js
function connectSchool(){
  const d = $('domain').value.trim(), c = $('code').value.trim();
  if (!d || !c) return notice('Please enter school domain and code');
  const n = d.split('.')[0].replace(/[-_]/g,' ').replace(/\b\w/g,x=>x.toUpperCase());
  $('sn').textContent = n;
  $('screen').previousElementSibling.querySelector('.mark').textContent = n[0];
  notice('Connected to ' + n + ' in this demo');
}
```

So:
- **Both** `domain` and `code` are required; otherwise `notice('Please enter school domain and code')`.
- The display name is derived from the first domain label, title-cased: `horizon.school.pk` → `Horizon`.
- The report is `Connected to <name> in this demo` — the word **demo** is part of the locked copy; this is a demo transition, not a session.

### 1.3 Role launch

```js
document.querySelectorAll('#roles button').forEach(b=>b.onclick=()=>{
  role=b.dataset.r; tab='Home'; feat='';
  document.querySelectorAll('#roles button').forEach(x=>x.classList.toggle('on',x===b));
  render();
});
```

Role buttons are built from `['Parent','Student','Teacher','School Admin'].map((r,i)=>'<button class="role${i?'':' on'}" data-r="${r}">${r}</button>')`.

So every role lands on the existing `Home` screen with `feat=''` — **existing screens only, no new navigation design**. Tools shown on Home are the role's `TL` list, already transcribed as `allowedMobileFeatures()`.

### 1.4 Resilience

`.screen{flex:1;overflow:auto;padding:18px 16px 100px;scrollbar-width:none;...}` and `.screen::-webkit-scrollbar{display:none}` — the internal scrollbar is hidden by the reference. L-O-05 requires this to remain unchanged.

There is **no** manifest, service worker, `sw.js`, `registerServiceWorker`, offline or install surface anywhere in the mobile reference — so L-O-04 (manifest/install/offline) is genuinely absent.

---

## 2. Connection model

`core/connection/connection.js` transcribes the reference behaviour:

| Function | Purpose |
| --- | --- |
| `parseSchoolName(domain)` | first label, title-cased — matches the reference exactly |
| `validateConnection({domain, code})` | both required; empty domain/code are real errors |
| `connectionReport(result)` | reports `demo: true` — never a session |
| `selectedSchool(selection)` | in-memory selection only |
| `clearSelectedSchool()` | clears on logout / school switch (L-O-02) |

`assertNoUnapprovedStorage()` scans `core/**` and fails on any `localStorage.setItem`, `sessionStorage.setItem` or `indexedDB.open` — the reference persists nothing, so nothing may.

---

## 3. Role launch

`core/connection/role-launch.js`:

| Function | Purpose |
| --- | --- |
| `launchRoleExperience({role, schoolConnected})` | existing screen `Home`, `feat: null`, the role's tool list; refuses a launch without a connected school |
| `roleLaunchFeatures(role)` | the existing role tool list only |
| `assertRoleLaunchMatchesReferences()` | re-reads the role buttons and landing from the reference |

The drift guard anchors on the `['Parent','Student','Teacher','School Admin']` array literal and `data-r="${r}"`, because the rendered attribute is a template placeholder, not a literal.

---

## 4. Contract dependency

Both connection capabilities are BLOCKED:

| ID | Capability |
| --- | --- |
| `school-connection` | connect a school by QR scan or manual domain/code |
| `school-selection-persistence` | persist and clear the selected school on logout/switch |

`assertNoInventedConnectionSchemas()` fails the suite if either gains a method, path, schema or `implemented: true`.

---

## 5. What was verified

`npm run check` — UI lock unchanged, all tests pass. Of these, 23 are the Batch L suite in `test/connection.test.js`, covering name derivation, connection validation, the demo-report contract, the in-memory selection and clear, the whole-tree storage scan, role launch, the scrollbar guard, the binding contract and the fail-closed registry.

No HTML, CSS, image, font or runtime page was added to `frontend/`.
