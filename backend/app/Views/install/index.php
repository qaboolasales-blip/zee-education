<?= view('install/_layout', ['appName' => $appName]) ?>
<div class="card">
    <h1>Install <?= esc($appName) ?></h1>
    <p class="muted">Version <?= esc($appVersion) ?> - Platform Owner (Super Admin) installation</p>

    <div class="steps">
        <b>Step 1</b> of 3: Server requirements &nbsp;|&nbsp; Step 2: Database &amp; migrations &nbsp;|&nbsp; Step 3: Super Admin
    </div>

    <h2>Server requirements</h2>

<?php foreach ($preflight['checks'] as $check):
    $level = $check['level'] ?? ($check['ok'] ? 'pass' : 'fail');
    $css   = ['pass' => 'ok', 'warn' => 'warn', 'fail' => 'bad'][$level] ?? 'bad';
    $text  = ['pass' => 'PASS', 'warn' => 'CHECK', 'fail' => 'FAIL'][$level] ?? 'FAIL';
?>
    <div class="<?= $css ?>">
        <?= $text ?> &mdash; <?= esc($check['label']) ?>
        <div class="muted"><?= esc($check['detail']) ?></div>
<?php if (! $check['ok']): ?>
        <div class="fix"><?= esc($check['fix']) ?></div>
<?php endif; ?>
    </div>
<?php endforeach; ?>

<?php if ($preflight['ok']): ?>
    <form method="post" action="<?= site_url('install/preflight') ?>">
        <?= csrf_field() ?>
        <button type="submit">Continue to database step</button>
    </form>
<?php else: ?>
    <p class="muted">Fix every red item above, then reload this page.</p>
<?php endif; ?>
</div>