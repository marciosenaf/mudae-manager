<?php
header('Content-Type: application/json; charset=utf-8');

$baseDir = __DIR__;
$dataDir = $baseDir . DIRECTORY_SEPARATOR . 'data';
$dbFile = $dataDir . DIRECTORY_SEPARATOR . 'mudae-db.json';
$backupsDir = $dataDir . DIRECTORY_SEPARATOR . 'backups';

if (!is_dir($dataDir)) mkdir($dataDir, 0777, true);
if (!is_dir($backupsDir)) mkdir($backupsDir, 0777, true);

function readJsonBody() {
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function respond($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

$action = $_GET['action'] ?? 'load';

if (!file_exists($dbFile)) {
    file_put_contents($dbFile, json_encode([
        'meta' => ['updatedAt' => '', 'version' => 1],
        'characters' => [],
        'trash' => [],
        'lists' => ['wishlist' => [], 'likelist' => [], 'whitelist' => [], 'blacklist' => []]
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
}

switch ($action) {
    case 'load':
        $content = file_get_contents($dbFile);
        $db = json_decode($content, true);
        if (!is_array($db)) {
            respond(['error' => 'JSON inválido no banco.'], 500);
        }
        respond(['ok' => true, 'db' => $db]);
        break;

    case 'save':
        $payload = readJsonBody();
        $db = $payload['db'] ?? null;
        if (!is_array($db)) respond(['error' => 'DB inválido.'], 400);
        $db['meta']['updatedAt'] = date('c');
        file_put_contents($dbFile, json_encode($db, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
        respond(['ok' => true]);
        break;

    case 'backup':
        $timestamp = date('Y-m-d_H-i-s');
        $filename = 'mudae-db_' . $timestamp . '.json';
        copy($dbFile, $backupsDir . DIRECTORY_SEPARATOR . $filename);
        respond(['ok' => true, 'filename' => $filename]);
        break;

    case 'list_backups':
        $files = array_values(array_filter(scandir($backupsDir), function($file) {
            return $file !== '.' && $file !== '..' && preg_match('/\.json$/i', $file);
        }));
        rsort($files);
        respond(['ok' => true, 'backups' => $files]);
        break;

    case 'restore_backup':
        $payload = readJsonBody();
        $filename = basename($payload['filename'] ?? '');
        $path = $backupsDir . DIRECTORY_SEPARATOR . $filename;
        if (!$filename || !file_exists($path)) respond(['error' => 'Backup não encontrado.'], 404);
        copy($path, $dbFile);
        $db = json_decode(file_get_contents($dbFile), true);
        respond(['ok' => true, 'db' => $db]);
        break;

    default:
        respond(['error' => 'Ação inválida.'], 400);
}
