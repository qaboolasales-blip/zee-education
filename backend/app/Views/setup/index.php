<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <title>School Installer — <?= esc($appName, 'html') ?></title>
    <style>
        :root {
            --brand: #1c72d9;
            --brand-dark: #104b9b;
            --ink: #152238;
            --muted: #708099;
            --line: #e8edf4;
            --bg: #f5f7fb;
            --card: #ffffff;
            --warn-bg: #fff8e6;
            --warn-line: #f0d38a;
            --warn-ink: #6b4e00;
        }
        * { box-sizing: border-box; }
        body {
            margin: 0;
            background: var(--bg);
            color: var(--ink);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            line-height: 1.6;
        }
        header {
            background: linear-gradient(105deg, #0c1729 0%, #152947 58%, #1c3861 100%);
            color: #fff;
            padding: 28px 20px;
        }
        header .inner, main { max-width: 880px; margin: 0 auto; }
        header h1 { margin: 0; font-size: 1.45rem; }
        header p { margin: 6px 0 0; opacity: .78; font-size: .9rem; }
        main { padding: 24px 20px 56px; }
        .card {
            background: var(--card);
            border: 1px solid var(--line);
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 18px;
        }
        h2 { font-size: 1.05rem; margin: 0 0 12px; }
        h3 { font-size: .95rem; margin: 18px 0 6px; }
        p { margin: 0 0 12px; }
        ul { margin: 0; padding-left: 20px; }
        li { margin-bottom: 6px; }
        .notice {
            background: var(--warn-bg);
            border: 1px solid var(--warn-line);
            color: var(--warn-ink);
            border-radius: 10px;
            padding: 14px 16px;
            margin-bottom: 18px;
        }
        .notice strong { display: block; margin-bottom: 4px; }
        .badge {
            display: inline-block;
            background: var(--brand);
            color: #fff;
            border-radius: 999px;
            padding: 3px 11px;
            font-size: .72rem;
            letter-spacing: .03em;
            text-transform: uppercase;
        }
        .meta { color: var(--muted); font-size: .85rem; }
        .meta dl { display: grid; grid-template-columns: 190px 1fr; gap: 6px 14px; margin: 0; }
        .meta dt { font-weight: 600; }
        .meta dd { margin: 0; }
        .themes { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
        .themes span {
            border: 1px solid var(--line);
            border-radius: 8px;
            padding: 5px 10px;
            font-size: .82rem;
        }
        code {
            background: #eef2f8;
            border-radius: 4px;
            padding: 1px 5px;
            font-size: .85em;
        }
        footer { color: var(--muted); font-size: .8rem; text-align: center; padding: 0 20px 32px; }
        @media (max-width: 560px) {
            .meta dl { grid-template-columns: 1fr; }
            .meta dd { margin-bottom: 8px; }
        }
    </style>
</head>
<body>
<header>
    <div class="inner">
        <h1><?= esc($appName, 'html') ?> — School Installer</h1>
        <p>Per-school dedicated installation and dedicated database</p>
    </div>
</header>

<main>
    <div class="notice">
        <strong>Placeholder only — this page does not install anything.</strong>
        No school record, no database and no credential is created or stored by visiting this page.
    </div>

    <section class="card">
        <h2>What this wizard will do <span class="badge">Planned</span></h2>
        <p>The real wizard is built in a later milestone. It is designed to:</p>
        <ul>
            <li>Collect the school's identity and branding details.</li>
            <li>Collect the connection details for <strong>that school's own dedicated database</strong>.</li>
            <li>Create and migrate a separate database for the school.</li>
            <li>Run schema migrations against that school's database only.</li>
            <li>Write installation metadata into the Super Admin control plane.</li>
            <li>Perform a health check before handing the installation over.</li>
        </ul>
        <p class="meta">Student, guardian, staff, attendance, results and fee data are stored <em>only</em> in that school's own database. They are never merged into a shared table.</p>
    </section>

    <section class="card">
        <h2>Data isolation guarantees</h2>
        <ul>
            <li><strong>Dedicated database per school.</strong> One shared table with only a school identifier is not an accepted substitute.</li>
            <li><strong>Server-side tenant verification.</strong> A school identifier sent by a browser is never treated as authorization.</li>
            <li><strong>Encrypted credentials.</strong> Per-school database credentials will be encrypted at rest and never stored in plaintext in the control plane.</li>
            <li><strong>Data-safe licensing.</strong> No licence or expiry mechanism may delete, encrypt, hide or block a school from exporting its own data.</li>
        </ul>
    </section>

    <section class="card">
        <h2>Platform configuration</h2>
        <div class="meta">
            <dl>
                <dt>Application</dt>
                <dd><?= esc($appName, 'html') ?></dd>

                <dt>Version</dt>
                <dd><?= esc($appVersion, 'html') ?></dd>

                <dt>Default timezone</dt>
                <dd><code><?= esc($timezone, 'html') ?></code></dd>

                <dt>Currency</dt>
                <dd><code><?= esc($currency, 'html') ?></code> (stored as integer minor units)</dd>

                <dt>Planned languages</dt>
                <dd><?= esc(implode(', ', $supportedLocales), 'html') ?> — localization is not yet complete</dd>
            </dl>
        </div>

        <h3>School base themes</h3>
        <div class="themes">
            <?php foreach ($baseThemes as $theme): ?>
                <span><?= esc($theme, 'html') ?></span>
            <?php endforeach ?>
        </div>
        <p class="meta" style="margin-top:10px">The selected base theme anchors the school identity, active navigation and primary actions. Coordinated multicolor is reserved for charts, categories and semantic statuses.</p>
    </section>

    <section class="card">
        <h2>Available endpoints</h2>
        <ul>
            <li><code>GET /health</code> — environment-safe health probe. Returns no credentials and no detailed server information.</li>
            <li><code>GET /setup</code> — this placeholder page.</li>
        </ul>
    </section>
</main>

<footer>
    <?= esc($appName, 'html') ?> <?= esc($appVersion, 'html') ?> — brand name provisional; trademark and domain clearance not completed.
</footer>
</body>
</html>
