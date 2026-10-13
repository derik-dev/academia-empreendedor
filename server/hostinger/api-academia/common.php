<?php
declare(strict_types=1);

function respond(int $status, array $body): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
    echo json_encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function loadConfig(): array
{
    $configPath = __DIR__ . '/config.php';
    if (!is_file($configPath)) {
        error_log('[academia-audio] Configuração do endpoint em falta.');
        respond(500, ['error' => 'O serviço de áudio ainda não está configurado.']);
    }

    $config = require $configPath;
    $required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'ALLOWED_ORIGINS', 'MAX_BYTES', 'MEDIA_BASE_URL'];
    foreach ($required as $key) {
        if (!array_key_exists($key, $config)) {
            error_log('[academia-audio] Configuração incompleta.');
            respond(500, ['error' => 'O serviço de áudio ainda não está configurado.']);
        }
    }

    if (!is_array($config['ALLOWED_ORIGINS']) || !is_string($config['MEDIA_BASE_URL'])) {
        error_log('[academia-audio] Formato de configuração inválido.');
        respond(500, ['error' => 'O serviço de áudio ainda não está configurado.']);
    }

    // MEDIA_DIR é opcional: se ausente ou vazio, deriva a partir da pasta irmã media-academia.
    if (!array_key_exists('MEDIA_DIR', $config) || !is_string($config['MEDIA_DIR']) || trim($config['MEDIA_DIR']) === '') {
        $derived = realpath(__DIR__ . '/../media-academia');
        if ($derived === false) {
            error_log('[academia-audio] Pasta media-academia não encontrada e MEDIA_DIR não está configurada.');
            respond(500, ['error' => 'O serviço de áudio ainda não está configurado.']);
        }
        $config['MEDIA_DIR'] = $derived;
    }

    return $config;
}

function applyCors(array $config): void
{
    header('Vary: Origin');
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

    if ($origin !== '') {
        $allowedOrigins = array_map(static fn ($value): string => rtrim((string) $value, '/'), $config['ALLOWED_ORIGINS']);
        if (!in_array(rtrim($origin, '/'), $allowedOrigins, true)) {
            respond(403, ['error' => 'Esta origem não está autorizada.']);
        }
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Access-Control-Allow-Headers: Authorization, Content-Type');
        header('Access-Control-Allow-Methods: POST, OPTIONS');
        header('Access-Control-Max-Age: 600');
    }

    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

/** @return array{0: int, 1: string}|null */
function supabaseRequest(string $url, array $headers, ?string $body = null): ?array
{
    if (!function_exists('curl_init')) {
        error_log('[academia-audio] Extensão cURL indisponível.');
        return null;
    }

    $handle = curl_init($url);
    if ($handle === false) {
        return null;
    }

    $options = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_CONNECTTIMEOUT => 3,
        CURLOPT_TIMEOUT => 8,
        CURLOPT_FOLLOWLOCATION => false,
    ];
    if ($body !== null) {
        $options[CURLOPT_POST] = true;
        $options[CURLOPT_POSTFIELDS] = $body;
    }

    curl_setopt_array($handle, $options);
    $response = curl_exec($handle);
    $status = (int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
    $failed = $response === false;
    curl_close($handle);

    if ($failed) {
        return null;
    }

    return [$status, (string) $response];
}

function requireAdmin(array $config): string
{
    $authorization = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (!preg_match('/^Bearer\s+(.+)$/i', $authorization, $matches)) {
        respond(401, ['error' => 'Inicie sessão novamente para enviar áudio.']);
    }
    $token = trim($matches[1]);
    if ($token === '') {
        respond(401, ['error' => 'Inicie sessão novamente para enviar áudio.']);
    }

    $supabaseUrl = rtrim((string) $config['SUPABASE_URL'], '/');
    $apiKey = (string) $config['SUPABASE_ANON_KEY'];
    $headers = ['apikey: ' . $apiKey, 'Authorization: Bearer ' . $token];
    $userResponse = supabaseRequest($supabaseUrl . '/auth/v1/user', $headers);
    if ($userResponse === null || $userResponse[0] !== 200) {
        respond(401, ['error' => 'A sessão expirou. Inicie sessão novamente.']);
    }

    $user = json_decode($userResponse[1], true);
    if (!is_array($user) || !is_string($user['id'] ?? null)) {
        respond(401, ['error' => 'Não foi possível validar a sessão. Inicie sessão novamente.']);
    }

    $rpcHeaders = [...$headers, 'Content-Type: application/json'];
    $adminResponse = supabaseRequest($supabaseUrl . '/rest/v1/rpc/is_academy_admin', $rpcHeaders, '{}');
    if ($adminResponse === null) {
        error_log('[academia-audio] Falha de comunicação ao validar administrador.');
        respond(503, ['error' => 'Não foi possível validar a conta. Tente novamente.']);
    }
    if ($adminResponse[0] !== 200) {
        error_log('[academia-audio] RPC de validação de administrador devolveu erro.');
        respond(403, ['error' => 'A conta não tem autorização de administrador.']);
    }

    $isAdmin = json_decode($adminResponse[1], true);
    if ($isAdmin !== true) {
        respond(403, ['error' => 'A conta não tem autorização de administrador.']);
    }

    return $user['id'];
}

function enforceUploadRateLimit(string $userId): void
{
    $limitFile = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'academia-audio-' . hash('sha256', $userId) . '.json';
    $handle = @fopen($limitFile, 'c+');
    if ($handle === false || !flock($handle, LOCK_EX)) {
        if (is_resource($handle)) {
            fclose($handle);
        }
        error_log('[academia-audio] Não foi possível aplicar o limite de frequência.');
        respond(503, ['error' => 'O serviço está temporariamente indisponível. Tente mais tarde.']);
    }

    $now = time();
    rewind($handle);
    $stored = stream_get_contents($handle);
    $timestamps = json_decode($stored === false ? '' : $stored, true);
    $timestamps = is_array($timestamps) ? array_values(array_filter($timestamps, static fn ($value): bool => is_int($value) && $value > $now - 3600)) : [];
    if (count($timestamps) >= 20) {
        flock($handle, LOCK_UN);
        fclose($handle);
        respond(429, ['error' => 'Foram feitos muitos envios recentemente. Tente novamente mais tarde.']);
    }

    $timestamps[] = $now;
    rewind($handle);
    ftruncate($handle, 0);
    fwrite($handle, json_encode($timestamps));
    fflush($handle);
    flock($handle, LOCK_UN);
    fclose($handle);
    @chmod($limitFile, 0600);
}

function mediaUrl(array $config, string $relativePath): string
{
    $encodedPath = implode('/', array_map('rawurlencode', explode('/', $relativePath)));
    return rtrim((string) $config['MEDIA_BASE_URL'], '/') . '/' . $encodedPath;
}

function requirePostOrOptions(): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        header('Allow: POST, OPTIONS');
        respond(405, ['error' => 'Método não permitido.']);
    }
}
