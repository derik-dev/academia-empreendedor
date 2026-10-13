<?php
declare(strict_types=1);

require_once __DIR__ . '/common.php';
$config = loadConfig();
applyCors($config);
requirePostOrOptions();
$userId = requireAdmin($config);

$requestBody = file_get_contents('php://input');
$request = json_decode($requestBody === false ? '' : $requestBody, true);
$relativePath = is_array($request) ? ($request['path'] ?? null) : null;
if (!is_string($relativePath) || !preg_match('/^podcasts\/\d{4}\/\d{2}\/[a-f0-9]{32}-[a-z0-9-]+\.mp3$/', $relativePath)) {
    respond(400, ['error' => 'O caminho do áudio não é válido.']);
}

$mediaRoot = realpath((string) $config['MEDIA_DIR']);
$podcastsRoot = $mediaRoot === false ? false : realpath($mediaRoot . DIRECTORY_SEPARATOR . 'podcasts');
$candidate = $mediaRoot === false ? false : realpath($mediaRoot . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relativePath));
if ($podcastsRoot === false || $candidate === false || !is_file($candidate)) {
    respond(404, ['error' => 'O áudio já não existe no servidor.']);
}

$podcastsPrefix = rtrim($podcastsRoot, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR;
if (!str_starts_with($candidate, $podcastsPrefix)) {
    error_log('[academia-audio] Tentativa de apagar um caminho fora da pasta de podcasts.');
    respond(400, ['error' => 'O caminho do áudio não é válido.']);
}

if (!@unlink($candidate)) {
    error_log('[academia-audio] Falha ao apagar um áudio para administrador ' . hash('sha256', $userId));
    respond(500, ['error' => 'Não foi possível apagar o áudio. Tente novamente.']);
}

respond(200, ['deleted' => true]);
