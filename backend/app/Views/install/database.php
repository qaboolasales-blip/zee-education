<?= view('install/_layout', ['appName' => $appName]) ?>
<div class="card">
    <h1>Control-plane database</h1>
    <div class="steps">Step <b>2</b> of 3</div>

<?php if ($connection['ok']): ?>
    <div class="ok">Connection successful. <?= esc($connection['message']) ?></div>
<?php else: ?>
    <div class="bad">Connection failed. <?= esc($connection['message']) ?></div>
<?php endif; ?>

    <p class="muted">
        The installer never asks for your database password. It only tests the connection already
        written in the server <code>.env</code> file.
    </p>

<?php if ($connection['ok']): ?>
    <h2>Run migrations</h2>
    <p class="muted">
        Migrations run in this fixed order: <b>CodeIgniter Shield</b> (authentication) &rarr;
        <b>CodeIgniter Settings</b> &rarr; <b>Zee Education control plane</b>.
        School databases are never touched by this step.
    </p>
    <form method="post" action="<?= site_url('install/database') ?>">
        <?= csrf_field() ?>
        <button type="submit">Run database setup</button>
    </form>
<?php else: ?>
    <p class="muted">
        Open the server <code>.env</code> file, fill in the <code>database.default.*</code> values from
        your hosting panel, then reload this page.
    </p>
    <p><a href="<?= site_url('install/database') ?>">Check again</a></p>
<?php endif; ?>
</div>