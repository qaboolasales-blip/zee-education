<?php

/**
 * Zee Education - package verification tool
 *
 * Run this AFTER extracting the package, BEFORE uploading to your host:
 *
 *     php tools/verify-package.php
 *
 * It checks that the package is complete and, most importantly, that it contains
 * no secrets, no real data and no leftovers from the machine that built it.
 *
 * Exit code 0 = package looks good.  Exit code 1 = something is wrong.
 */

$root = dirname(__DIR__);

$errors   = [];
$warnings = [];
$checks   = 0;

function ok(string $m): void
{
    global $checks;
    $checks++;
    echo "  [OK]    " . $m . PHP_EOL;
}

function bad(string $m): void
{
    global $checks, $errors;
    $checks++;
    $errors[] = $m;
    echo "  [FAIL]  " . $m . PHP_EOL;
}

function warn(string $m): void
{
    global $checks, $warnings;
    $checks++;
    $warnings[] = $m;
    echo "  [WARN]  " . $m . PHP_EOL;
}

function rel(string $root, string $path): string
{
    return str_replace('\\', '/', substr($path, strlen($root) + 1));
}

echo PHP_EOL;
echo "Zee Education - package verification" . PHP_EOL;
echo str_repeat('=', 60) . PHP_EOL . PHP_EOL;

echo "1. Required files" . PHP_EOL;
foreach ([
    'README_FIRST.txt',
    'LICENSE.txt',
    'CHANGELOG.md',
    '.env.example',
    'package-manifest.json',
    'documentation/index.html',
    'database/README.md',
    'tools/verify-package.php',
    'application/public/index.php',
    'application/spark',
    'application/vendor/autoload.php',
    'application/app/Config/Database.php',
    'application/app/Controllers/Install.php',
    'application/writable',
] as $rel) {
    if (is_file($root . '/' . $rel) || is_dir($root . '/' . $rel)) {
        ok($rel);
    } else {
        bad('MISSING: ' . $rel);
    }
}

echo PHP_EOL . "2. Documentation set" . PHP_EOL;
foreach (range(1, 11) as $n) {
    $found = glob($root . '/documentation/' . str_pad((string) $n, 2, '0', STR_PAD_LEFT) . '-*.md');
    if ($found !== []) {
        ok('documentation/' . basename($found[0]));
    } else {
        bad('MISSING documentation guide number ' . $n);
    }
}

echo PHP_EOL . "3. Production dependencies present" . PHP_EOL;
foreach ([
    'application/vendor/codeigniter4/framework',
    'application/vendor/codeigniter4/shield',
    'application/vendor/codeigniter4/settings',
] as $dep) {
    is_dir($root . '/' . $dep) ? ok($dep) : bad('MISSING dependency: ' . $dep);
}

echo PHP_EOL . "4. NO secrets or real data in the package" . PHP_EOL;

// A real .env must never ship. .env.example is expected and allowed.
$envFiles = [];
$it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS));
foreach ($it as $file) {
    if (! $file->isFile()) {
        continue;
    }
    $p = rel($root, $file->getPathname());

    if (basename($p) === '.env') {
        $envFiles[] = $p;
    }
    if (preg_match('#(^|/)(writable/(cache|logs|session|debugbar)/)#', $p) && basename($p) !== 'index.html') {
        bad('runtime file shipped: ' . $p);
    }
    if (preg_match('#\.sql$#i', $p)) {
        bad('SQL dump shipped: ' . $p);
    }
    if (preg_match('#(^|/)(\.git/|node_modules/)#', $p)) {
        bad('development artefact shipped: ' . $p);
    }
    if (preg_match('#\.log$#i', $p)) {
        bad('log file shipped: ' . $p);
    }
    if (basename($p) === 'install.lock') {
        bad('install lock shipped (installer would start already-locked): ' . $p);
    }
    if (preg_match('#(^|/)tests?/#', $p)) {
        warn('test folder shipped: ' . $p);
    }
    // Scratch working files (head/body splits, partial rewrites, editor
    // backups). The builder copies the whole app/ tree, so a stray .tmp would
    // otherwise reach the buyer as a duplicate of a shipped view file.
    if (preg_match('#\.(tmp|bak|orig|rej)$#i', $p)) {
        bad('scratch working file shipped: ' . $p);
    }
}

$envFiles === []
    ? ok('no .env file present (correct)')
    : bad('.env FILE PRESENT in package: ' . implode(', ', $envFiles));

// scan text files for anything that looks like a real credential
$suspicious = [];
$textExt   = ['php', 'json', 'txt', 'md', 'ini', 'example', 'js', 'css', 'html'];
$it2       = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS));
foreach ($it2 as $file) {
    if (! $file->isFile()) {
        continue;
    }
    $p = rel($root, $file->getPathname());

    if (str_starts_with($p, 'tools/') && basename($p) === 'verify-package.php') {
        continue; // this file mentions the words on purpose
    }
    if (filesize($file->getPathname()) > 3 * 1024 * 1024) {
        continue;
    }
    $ext = strtolower($file->getExtension());
    if (! in_array($ext, $textExt, true)) {
        continue;
    }
    $body = (string) file_get_contents($file->getPathname());
    // A host account id looks like u1234567890_name. Shipping the *builder's*
    // host id would leak a real hosting account into every buyer's copy.
    if (preg_match_all('#\bu\d{7,}_[a-z0-9_]+#i', $body, $m)) {
        foreach ($m[0] as $hit) {
            $suspicious[] = $p . ' -> hosting account style name: ' . $hit;
        }
    }
    if (preg_match('#-----BEGIN [A-Z ]*PRIVATE KEY-----#', $body)) {
        $suspicious[] = $p . ' -> PRIVATE KEY';
    }
}

$suspicious === []
    ? ok('no hosting credentials or private keys detected in text files')
    : bad("possible real credentials:\n        - " . implode("\n        - ", $suspicious));

echo PHP_EOL . "5. Placeholder discipline in .env.example" . PHP_EOL;
$example = $root . '/.env.example';
if (is_file($example)) {
    $text = (string) file_get_contents($example);
$keyProblem = false;
if (preg_match_all('#^encryption\.key\s*=\s*(.+)$#m', $text, $km)) {
    foreach ($km[1] as $rawValue) {
        $value = trim($rawValue);
        if ($value !== '' && stripos($value, 'CHANGE_ME') === false) {
            $keyProblem = true;
        }
    }
}
$keyProblem
    ? bad('.env.example contains a real-looking encryption key value (must stay a placeholder)')
    : ok('.env.example encryption key is a placeholder');

if (stripos($text, 'CHANGE_ME') !== false) {
    ok('.env.example still contains CHANGE_ME placeholders');
}
}

echo PHP_EOL . "6. Migrations are split (control plane vs school)" . PHP_EOL;
$controlDir = $root . '/application/app/Database/Migrations';
$schoolDir  = $root . '/application/app/SchoolLocal/Database/Migrations';

is_dir($controlDir)
    ? ok('control-plane migrations present')
    : bad('control-plane migration folder missing');

is_dir($schoolDir)
    ? ok('school-local migrations present in their own namespace folder')
    : bad('school-local migration folder missing');

$auto = glob($controlDir . '/*/');
if ($auto === []) {
    ok('no nested migration folders inside the control-plane folder (prevents --all leakage)');
} else {
    bad('nested folder inside control-plane migrations: ' . implode(', ', $auto));
}

echo PHP_EOL . str_repeat('=', 60) . PHP_EOL;
echo "Checks run : " . $checks . PHP_EOL;
echo "Failures   : " . count($errors) . PHP_EOL;
echo "Warnings   : " . count($warnings) . PHP_EOL;

if ($errors !== []) {
    echo PHP_EOL . "RESULT: PACKAGE VERIFICATION FAILED" . PHP_EOL;
    foreach ($errors as $e) {
        echo "  - " . $e . PHP_EOL;
    }
    exit(1);
}

echo PHP_EOL;
echo ($warnings !== [] ? "RESULT: PASSED WITH WARNINGS" : "RESULT: PACKAGE VERIFIED OK") . PHP_EOL;
exit(0);