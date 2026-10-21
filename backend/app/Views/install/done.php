<?= view('install/_layout', ['appName' => $appName]) ?>
<div class="card">
    <h1>Installation complete</h1>

    <div class="ok">
        <?= esc($appName) ?> is installed. The public installer has been locked and will no longer appear.
    </div>

    <h2>Next steps</h2>
    <p>1. Sign in as the Super Admin you just created.</p>
    <p>2. Open the setup checklist and create your first school.</p>
    <p>3. Give that school its own database (see the documentation for Hostinger).</p>
    <p>4. Set up your regular backups.</p>

    <p><a class="btn" style="background:#1f6feb;color:#fff;text-decoration:none;border-radius:6px;padding:11px 18px;display:inline-block;margin-top:10px" href="<?= site_url('login') ?>">Go to sign in</a></p>
</div>