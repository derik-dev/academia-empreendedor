<?php
declare(strict_types=1);

require_once __DIR__ . '/common.php';
$config = loadConfig();
applyCors($config);
requirePostOrOptions();

$userId = requireAdmin($config);
enforceUploadRateLimit($userId);

$maxBytes = (int) $config['MAX_BYTES'];
if (!isset($_FILES['file']) || !is_array($_FILES['file'])) {
    respond(400, ['error' => 'Selecione um ficheiro MP3 para enviar.']);
}

$file = $_FILES['file'];
$uploadError = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);
if ($uploadError !== UPLOAD_ERR_OK) {
    if ($uploadError === UPLOAD_ERR_INI_SIZE || $uploadError === UPLOAD_ERR_FORM_SIZE) {
        respond(413, ['error' => 'O ficheiro excede o limite de envio do servidor.']);
    }
    if ($uploadError === UPLOAD_ERR_NO_FILE) {
        respond(400, ['error' => 'Selecione um ficheiro MP3 para enviar.']);
    }
    respond(400, ['error' => 'O envio foi interrompido. Tente novamente.']);
}

$temporaryPath = $file['tmp_name'] ?? '';
$originalName = $file['name'] ?? '';
$fileSize = (int) ($file['size'] ?? 0);
if (!is_string($temporaryPath) || !is_uploaded_file($temporaryPath)) {
    respond(400, ['error' => 'O ficheiro recebido não é válido. Tente novamente.']);
}
if ($fileSize <= 0) {
    respond(400, ['error' => 'O ficheiro está vazio ou não é válido.']);
}
if ($fileSize > $maxBytes) {
    respond(413, ['error' => 'O ficheiro excede o limite permitido.']);
}
if (!is_string($originalName) || strtolower(pathinfo($originalName, PATHINFO_EXTENSION)) !== 'mp3') {
    respond(415, ['error' => 'Envie apenas ficheiros MP3. Converta o WAV para MP3 antes de enviar.']);
}

try {
    $fileInfo = new finfo(FILEINFO_MIME_TYPE);
    $mimeType = $fileInfo->file($temporaryPath);
} catch (Throwable) {
    $mimeType = false;
}
if ($mimeType !== 'audio/mpeg') {
    respond(415, ['error' => 'O ficheiro não é um MP3 válido. Converta o áudio para MP3 antes de enviar.']);
}

$year = gmdate('Y');
$month = gmdate('m');
$mediaRoot = rtrim((string) $config['MEDIA_DIR'], DIRECTORY_SEPARATOR);
$targetDirectory = $mediaRoot . DIRECTORY_SEPARATOR . 'podcasts' . DIRECTORY_SEPARATOR . $year . DIRECTORY_SEPARATOR . $month;
if (!is_dir($targetDirectory) && !@mkdir($targetDirectory, 0750, true) && !is_dir($targetDirectory)) {
    error_log('[academia-audio] Não foi possível preparar a pasta de destino.');
    respond(500, ['error' => 'Não foi possível guardar o áudio. Tente novamente.']);
}
@chmod($targetDirectory, 0750);

$safeOriginal = basename($originalName);
$originalStem = pathinfo($safeOriginal, PATHINFO_FILENAME);
$asciiStem = function_exists('iconv') ? iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $originalStem) : $originalStem;
$slug = strtolower((string) ($asciiStem === false ? '' : $asciiStem));
$slug = trim((string) preg_replace('/[^a-z0-9]+/', '-', $slug), '-');
$slug = substr($slug, 0, 60);
if ($slug === '') {
    $slug = 'audio';
}

try {
    $randomPrefix = bin2hex(random_bytes(16));
} catch (Throwable) {
    error_log('[academia-audio] Não foi possível gerar um identificador seguro.');
    respond(500, ['error' => 'Não foi possível guardar o áudio. Tente novamente.']);
}

$filename = $randomPrefix . '-' . $slug . '.mp3';
$destination = $targetDirectory . DIRECTORY_SEPARATOR . $filename;
if (!move_uploaded_file($temporaryPath, $destination)) {
    error_log('[academia-audio] Falha ao guardar um áudio carregado.');
    respond(500, ['error' => 'Não foi possível guardar o áudio. Tente novamente.']);
}
@chmod($destination, 0640);

$relativePath = 'podcasts/' . $year . '/' . $month . '/' . $filename;
respond(201, [
    'path' => $relativePath,
    'url' => mediaUrl($config, $relativePath),
    'bytes' => $fileSize,
    'mime' => 'audio/mpeg',
]);
