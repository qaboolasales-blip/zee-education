<div class="card">
<?php if (session()->getFlashdata('error')): ?>
    <div class="bad"><?= esc(session()->getFlashdata('error')) ?></div>
<?php endif; ?>
<?php if (session()->getFlashdata('success')): ?>
    <div class="ok"><?= esc(session()->getFlashdata('success')) ?></div>
<?php endif; ?>
</div>