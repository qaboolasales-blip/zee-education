<?php

/**
 * Printable platform template specimen.
 *
 * Rendered by App\Controllers\AdminApi::print(). It is a BLANK specimen of a
 * built-in school document: the Super Admin previews the layout a school will
 * get. It contains no learner data - the field list is the document
 * definition, not a record.
 *
 * @var array<string, mixed> $data
 */

$primary   = (string) ($data['primary'] ?? '#3558c8');
$secondary = (string) ($data['secondary'] ?? '#1b2a6b');
$title     = (string) ($data['title'] ?? 'Document');
$kind      = (string) ($data['kind'] ?? 'admission');
$school    = (string) ($data['school'] ?? 'Any school installation');
$fields    = (array) ($data['fields'] ?? []);
$printed   = (string) ($data['printed'] ?? '');
?>
<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= esc($title) ?> — template specimen</title>
<style>
:root{--primary:<?= esc($primary, 'attr') ?>;--secondary:<?= esc($secondary, 'attr') ?>;--ink:#0f172a;--muted:#64748b;--line:#e2e8f0}
*{box-sizing:border-box}
body{margin:0;padding:26px;background:#f3f5fa;color:var(--ink);font:14px/1.55 Inter,ui-sans-serif,system-ui,"Segoe UI",Roboto,Arial,sans-serif}
.sheet{max-width:820px;margin:auto;background:#fff;border:1px solid var(--line);border-radius:18px;overflow:hidden}
.head{padding:22px 26px;background:linear-gradient(110deg,var(--primary),var(--secondary));color:#fff;display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}
.head b{font-size:19px;letter-spacing:-.01em;display:block}
.head span{font-size:12px;color:#ffffffcc;display:block;margin-top:3px}
.head .code{text-align:right;font-size:12px;color:#ffffffdd}
.head .code b{display:block;font-size:13px;color:#fff;letter-spacing:.08em}
.sub{padding:12px 26px;border-bottom:1px solid var(--line);font-size:12px;color:var(--muted)}
.body{padding:22px 26px}
h1{font-size:20px;margin:0 0 6px;letter-spacing:-.01em}
.note{margin:0 0 18px;font-size:13px;color:var(--muted);line-height:1.6}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.f{border:1px solid var(--line);border-radius:12px;padding:12px 14px;min-height:58px}
.f label{display:block;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);font-weight:800;margin-bottom:7px}
.f span{display:block;height:9px;border-radius:5px;background:#eef2f7}
.f.wide{grid-column:1 / -1}
.foot{padding:14px 26px;border-top:1px solid var(--line);display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;font-size:11px;color:var(--muted);background:#f8fafc}
.bar{padding:12px 26px;display:flex;justify-content:flex-end;gap:8px;border-top:1px solid var(--line)}
.btn{border:1px solid var(--line);background:#fff;border-radius:10px;padding:9px 16px;font:inherit;font-weight:700;cursor:pointer}
.btn.p{border:0;color:#fff;background:linear-gradient(110deg,var(--primary),var(--secondary))}
@media print{body{background:#fff;padding:0}.sheet{border:0;border-radius:0}.bar{display:none}}
@media(max-width:640px){.grid{grid-template-columns:1fr}}
</style></head>
<body>
<div class="sheet">
  <div class="head">
    <div>
      <b><?= esc($title) ?></b>
      <span>Built-in template specimen</span>
    </div>
    <div class="code">Template key<b><?= esc(strtoupper(str_replace('-', ' ', $kind))) ?></b></div>
  </div>

  <div class="sub">Zee Education platform · <?= esc($school) ?></div>

  <div class="body">
    <h1><?= esc($title) ?></h1>
    <p class="note">This is a blank specimen of the document a school receives. The fields below are the
      approved fields of this template; a school prints the same layout with its own records filled in.</p>

    <div class="grid">
      <?php foreach ($fields as $field) : ?>
        <div class="f<?= ($field['wide'] ?? false) ? ' wide' : '' ?>">
          <label><?= esc((string) ($field['label'] ?? '')) ?></label>
          <span></span>
        </div>
      <?php endforeach; ?>
    </div>
  </div>

  <div class="foot">
    <span><?= esc($title) ?> · template specimen</span>
    <span>Printed <?= esc($printed) ?></span>
  </div>

  <div class="bar">
    <button class="btn" type="button" onclick="history.back()">Back</button>
    <button class="btn p" type="button" onclick="window.print()">Print</button>
  </div>
</div>
</body></html>
