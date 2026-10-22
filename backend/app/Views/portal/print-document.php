<?php

/**
 * Printable school document.
 *
 * Rendered by App\Controllers\SchoolExport::print(). Every row comes from the
 * signed-in user's own school database, and the school name, code and brand
 * colours come from that school's own settings.
 *
 * @var array<string, mixed> $data
 */

$primary   = (string) ($data['primary'] ?? '#2563eb');
$secondary = (string) ($data['secondary'] ?? '#1e3a8a');
$title     = (string) ($data['title'] ?? 'Document');
$school    = (string) ($data['school'] ?? 'Your School');
$code      = (string) ($data['code'] ?? '');
$address   = (string) ($data['address'] ?? '');
$phone     = (string) ($data['phone'] ?? '');
$email     = (string) ($data['email'] ?? '');
$currency  = (string) ($data['currency'] ?? 'PKR');
$printed   = (string) ($data['printed'] ?? '');
$rows      = $data['rows'] ?? [];

// A result card is a card per student; every other document is a table.
$isCard = $title === 'Student ID card' || $title === 'Result card';

$meta = [];

foreach ([$address, $phone, $email] as $line) {
    if (trim((string) $line) !== '') {
        $meta[] = trim((string) $line);
    }
}
?>
<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= esc($title) ?> — <?= esc($school) ?></title>
<style>
:root{--primary:<?= esc($primary, 'attr') ?>;--secondary:<?= esc($secondary, 'attr') ?>;--ink:#0f172a;--muted:#64748b;--line:#e2e8f0}
*{box-sizing:border-box}
body{margin:0;padding:26px;background:#f3f5fa;color:var(--ink);font:14px/1.55 Inter,ui-sans-serif,system-ui,"Segoe UI",Roboto,Arial,sans-serif}
.sheet{max-width:900px;margin:auto;background:#fff;border:1px solid var(--line);border-radius:18px;overflow:hidden}
.head{padding:22px 26px;background:linear-gradient(110deg,var(--primary),var(--secondary));color:#fff;display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}
.head b{font-size:19px;letter-spacing:-.01em;display:block}
.head span{font-size:12px;color:#ffffffcc;display:block;margin-top:3px}
.head .code{text-align:right;font-size:12px;color:#ffffffdd}
.head .code b{display:block;font-size:15px;color:#fff;letter-spacing:.08em}
.sub{padding:12px 26px;border-bottom:1px solid var(--line);font-size:12px;color:var(--muted)}
.body{padding:22px 26px}
h1{font-size:20px;margin:0 0 14px;letter-spacing:-.01em}
table{width:100%;border-collapse:collapse}
th{text-align:left;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);background:#f8fafc;padding:10px 12px;border-bottom:1px solid var(--line)}
td{padding:11px 12px;border-bottom:1px solid var(--line);font-size:13px;vertical-align:top}
tbody tr:last-child td{border-bottom:0}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px}
.card{border:1px solid var(--line);border-radius:14px;padding:16px;background:linear-gradient(140deg,var(--primary),var(--secondary));color:#fff}
.card .role{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#ffffffbb}
.card b{display:block;font-size:17px;margin:6px 0 4px}
.card small{display:block;font-size:12px;color:#ffffffdd;word-break:break-word}
.card .id{margin-top:10px;padding-top:10px;border-top:1px solid #ffffff33;font-size:12px;letter-spacing:.04em}
.empty{padding:38px 0;text-align:center;color:var(--muted);font-size:13px}
.foot{padding:14px 26px;border-top:1px solid var(--line);display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;font-size:11px;color:var(--muted);background:#f8fafc}
.bar{padding:12px 26px;display:flex;justify-content:flex-end;gap:8px;border-top:1px solid var(--line)}
.btn{border:1px solid var(--line);background:#fff;border-radius:10px;padding:9px 16px;font:inherit;font-weight:700;cursor:pointer}
.btn.p{border:0;color:#fff;background:linear-gradient(110deg,var(--primary),var(--secondary))}
@media print{body{background:#fff;padding:0}.sheet{border:0;border-radius:0}.bar{display:none}thead{display:table-header-group}}
</style></head>
<body>
<div class="sheet">
  <div class="head">
    <div>
      <b><?= esc($school) ?></b>
      <?php if ($meta !== []) : ?>
        <span><?= esc(implode(' · ', $meta)) ?></span>
      <?php else : ?>
        <span>Zee Education school management</span>
      <?php endif; ?>
    </div>
    <?php if ($code !== '') : ?>
      <div class="code">School code<b><?= esc(strtoupper($code)) ?></b></div>
    <?php endif; ?>
  </div>

  <div class="sub"><?= esc($title) ?> · <?= esc(count($rows)) ?> record<?= count($rows) === 1 ? '' : 's' ?></div>

  <div class="body">
    <h1><?= esc($title) ?></h1>

    <?php if ($rows === []) : ?>
      <div class="empty">This school has no <?= esc(strtolower($title)) ?> records yet.</div>
    <?php elseif ($isCard) : ?>
      <div class="cards">
        <?php foreach ($rows as $row) : ?>
          <div class="card">
            <span class="role"><?= esc($title === 'Result card' ? 'Result card' : 'Student ID card') ?></span>
            <b><?= esc((string) ($row['name'] ?? '')) ?></b>
            <small><?= esc((string) ($row['class'] ?? '')) ?></small>
            <?php if (($row['detail'] ?? '') !== '') : ?>
              <small><?= esc((string) $row['detail']) ?></small>
            <?php endif; ?>
            <div class="id"><?= esc((string) ($row['id'] ?? '')) ?></div>
          </div>
        <?php endforeach; ?>
      </div>
    <?php else : ?>
      <table>
        <thead><tr>
          <th>#</th><th>Name</th><th>Reference</th><th>Detail</th><th>Extra</th>
        </tr></thead>
        <tbody>
        <?php foreach ($rows as $index => $row) : ?>
          <tr>
            <td><?= (int) $index + 1 ?></td>
            <td><?= esc((string) ($row['name'] ?? '')) ?></td>
            <td><?= esc((string) ($row['id'] ?? '')) ?></td>
            <td><?= esc((string) ($row['class'] ?? '')) ?></td>
            <td><?= esc((string) ($row['detail'] ?? '')) ?></td>
          </tr>
        <?php endforeach; ?>
        </tbody>
      </table>
    <?php endif; ?>
  </div>

  <div class="foot">
    <span><?= esc($school) ?> · <?= esc($title) ?></span>
    <span>Currency: <?= esc($currency) ?> · Printed <?= esc($printed) ?></span>
  </div>

  <div class="bar">
    <button class="btn" type="button" onclick="history.back()">Back</button>
    <button class="btn p" type="button" onclick="window.print()">Print</button>
  </div>
</div>
</body></html>
