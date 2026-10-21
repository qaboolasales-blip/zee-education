<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= esc($appName) ?> - Installation</title>
<style>
 body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;background:#f4f6f8;color:#1f2933;margin:0;padding:24px}
 .wrap{max-width:760px;margin:0 auto}
 .card{background:#fff;border:1px solid #dfe3e8;border-radius:10px;padding:24px;margin-bottom:18px}
 h1{font-size:22px;margin:0 0 4px}
 h2{font-size:17px;margin:0 0 14px}
 .muted{color:#616e7c;font-size:13px}
 .ok{background:#e6f6ec;border-left:4px solid #1f9d55;padding:10px 12px;margin:6px 0;font-size:14px}
 .bad{background:#fdecea;border-left:4px solid #d64545;padding:10px 12px;margin:6px 0;font-size:14px}
 .fix{color:#a33;font-size:12px;margin-top:2px}
 .warn{background:#fff6e5;border-left:4px solid #d98324;padding:10px 12px;margin:6px 0;font-size:14px}
 label{display:block;margin:12px 0 4px;font-size:14px;font-weight:600}
 input{width:100%;padding:9px;border:1px solid #cbd2d9;border-radius:6px;font-size:14px;box-sizing:border-box}
 button{background:#1f6feb;color:#fff;border:0;border-radius:6px;padding:11px 18px;font-size:15px;cursor:pointer;margin-top:16px}
 .steps{font-size:13px;color:#616e7c;margin-bottom:14px}
 .steps b{color:#1f6feb}
</style>
</head>
<body><div class="wrap">
<?= view('install/_flash') ?>
</div></body>
</html>