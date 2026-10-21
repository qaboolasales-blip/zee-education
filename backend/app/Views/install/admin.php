<?= view('install/_layout', ['appName' => $appName]) ?>
<div class="card">
    <h1>Create the Super Admin</h1>
    <div class="steps">Step <b>3</b> of 3</div>

<?php if ($connection['ok']): ?>
    <div class="ok">Database is ready.</div>
<?php else: ?>
    <div class="bad">Database is not reachable right now. <a href="<?= site_url('install/database') ?>">Go back and check.</a></div>
<?php endif; ?>

    <p class="muted">
        This is the Platform Owner account. It manages schools and installations only &mdash;
        it never browses learner data.
    </p>

    <form method="post" action="<?= site_url('install/admin') ?>">
        <?= csrf_field() ?>

        <label for="email">Email address</label>
        <input type="email" id="email" name="email" required value="<?= esc(old('email')) ?>">

        <label for="username">Username</label>
        <input type="text" id="username" name="username" required value="<?= esc(old('username')) ?>">

        <label for="password">Password</label>
        <input type="password" id="password" name="password" required minlength="12">
        <div class="muted">At least 12 characters, with an uppercase letter, a lowercase letter and a number.</div>

        <label for="password_confirm">Repeat password</label>
        <input type="password" id="password_confirm" name="password_confirm" required minlength="12">

        <button type="submit">Create Super Admin and finish</button>
    </form>
</div>