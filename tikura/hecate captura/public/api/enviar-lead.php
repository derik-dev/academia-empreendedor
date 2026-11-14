<?php

declare(strict_types=1);

use PHPMailer\PHPMailer\PHPMailer;

require_once dirname(__DIR__) . '/server/bootstrap.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function respond(int $status, array $payload): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function normalizeForMeta(string $value): string
{
    $value = trim($value);
    return function_exists('mb_strtolower') ? mb_strtolower($value, 'UTF-8') : strtolower($value);
}

function hashForMeta(string $value): string
{
    return hash('sha256', normalizeForMeta($value));
}

function validHttpUrl(string $value): bool
{
    if (!filter_var($value, FILTER_VALIDATE_URL)) {
        return false;
    }

    return in_array(strtolower((string) parse_url($value, PHP_URL_SCHEME)), ['http', 'https'], true);
}

function buildLeadOrigin(string $eventSourceUrl, array $utmValues, int $maximumLength): string
{
    $parts = [];
    if (validHttpUrl($eventSourceUrl)) {
        $parts[] = 'url=' . $eventSourceUrl;
    }

    foreach (['utm_source' => 'source', 'utm_medium' => 'medium', 'utm_campaign' => 'campaign'] as $key => $label) {
        $value = (string) ($utmValues[$key] ?? '');
        if ($value !== '') {
            $parts[] = $label . '=' . $value;
        }
    }

    $origin = $parts !== [] ? implode(' | ', $parts) : 'direto';
    return app_truncate($origin, $maximumLength);
}

function sendMetaLeadEvent(
    string $pixelId,
    string $accessToken,
    string $graphApiVersion,
    string $eventId,
    string $eventSourceUrl,
    string $name,
    string $email,
    string $phone,
    int $eventTimestamp
): void {
    if ($pixelId === '' || $accessToken === '' || !function_exists('curl_init')) {
        return;
    }

    $phoneDigits = preg_replace('/\D+/', '', $phone) ?? '';
    if ((strlen($phoneDigits) === 10 || strlen($phoneDigits) === 11) && !str_starts_with($phoneDigits, '55')) {
        $phoneDigits = '55' . $phoneDigits;
    }

    $nameParts = preg_split('/\s+/u', trim($name), -1, PREG_SPLIT_NO_EMPTY) ?: [];
    $userData = [
        'em' => [hashForMeta($email)],
        'ph' => [hashForMeta($phoneDigits)],
    ];

    if ($nameParts !== []) {
        $userData['fn'] = [hashForMeta($nameParts[0])];
        if (count($nameParts) > 1) {
            $userData['ln'] = [hashForMeta($nameParts[count($nameParts) - 1])];
        }
    }

    $clientIp = app_request_ip();
    if ($clientIp !== '') {
        $userData['client_ip_address'] = $clientIp;
    }

    $userAgent = app_clean_text((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 512);
    if ($userAgent !== '') {
        $userData['client_user_agent'] = $userAgent;
    }

    foreach (['_fbp' => 'fbp', '_fbc' => 'fbc'] as $cookieName => $metaField) {
        $cookieValue = app_clean_text((string) ($_COOKIE[$cookieName] ?? ''), 255);
        if ($cookieValue !== '') {
            $userData[$metaField] = $cookieValue;
        }
    }

    $event = [
        'event_name' => 'Lead',
        'event_time' => $eventTimestamp,
        'event_id' => $eventId,
        'action_source' => 'website',
        'user_data' => $userData,
    ];

    if (validHttpUrl($eventSourceUrl)) {
        $event['event_source_url'] = $eventSourceUrl;
    }

    if (!preg_match('/^v\d+\.\d+$/', $graphApiVersion)) {
        $graphApiVersion = 'v24.0';
    }

    $requestBody = json_encode(['data' => [$event]], JSON_UNESCAPED_SLASHES);
    if ($requestBody === false) {
        error_log('Turma Hecate Meta CAPI: falha ao serializar o evento.');
        return;
    }

    $url = sprintf(
        'https://graph.facebook.com/%s/%s/events?%s',
        $graphApiVersion,
        rawurlencode($pixelId),
        http_build_query(['access_token' => $accessToken])
    );
    $curl = curl_init($url);
    if ($curl === false) {
        error_log('Turma Hecate Meta CAPI: nao foi possivel iniciar o envio.');
        return;
    }

    curl_setopt_array($curl, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $requestBody,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 2,
        CURLOPT_TIMEOUT => 5,
    ]);

    $result = curl_exec($curl);
    $httpStatus = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
    $curlError = curl_error($curl);
    curl_close($curl);

    if ($result === false || $httpStatus < 200 || $httpStatus >= 300) {
        error_log(sprintf(
            'Turma Hecate Meta CAPI: envio falhou (HTTP %d, %s).',
            $httpStatus,
            $curlError !== '' ? $curlError : 'sem detalhe cURL'
        ));
    }
}

function sendLeadNotification(
    string $name,
    string $email,
    string $whatsapp,
    array $utmLabels,
    array $utmValues,
    DateTimeImmutable $receivedAt
): void {
    $smtpHost = app_env('SMTP_HOST', 'smtp.hostinger.com');
    $smtpPort = (int) app_env('SMTP_PORT', '465');
    $smtpUsername = app_env('SMTP_USERNAME');
    $smtpPassword = app_env('SMTP_PASSWORD');
    $mailTo = app_env('MAIL_TO', $smtpUsername);
    $smtpSecure = strtolower(app_env('SMTP_SECURE', 'smtps'));

    if ($smtpUsername === '' || $smtpPassword === '' || $mailTo === '') {
        throw new RuntimeException('Configuracao SMTP ausente.');
    }

    $autoload = __DIR__ . '/vendor/autoload.php';
    if (!is_file($autoload)) {
        throw new RuntimeException('PHPMailer nao encontrado.');
    }
    require_once $autoload;

    $safeName = app_h($name);
    $safeEmail = app_h($email);
    $safeWhatsapp = app_h($whatsapp);
    $submittedAt = $receivedAt->format('d/m/Y \à\s H:i:s');
    $utmHtmlRows = [];
    $utmTextRows = [];
    foreach ($utmLabels as $utmKey => $utmLabel) {
        if (($utmValues[$utmKey] ?? '') === '') {
            continue;
        }

        $safeUtmValue = app_h($utmValues[$utmKey]);
        $utmHtmlRows[] = '<p><strong>' . app_h($utmLabel) . ':</strong> ' . $safeUtmValue . '</p>';
        $utmTextRows[] = $utmLabel . ': ' . $utmValues[$utmKey];
    }
    $utmHtml = $utmHtmlRows !== []
        ? '<hr style="border:0;border-top:1px solid #d8dde2"><p><strong>Origem do lead</strong></p>' . implode('', $utmHtmlRows)
        : '';
    $utmText = $utmTextRows !== []
        ? "\n\nOrigem do lead\n" . implode("\n", $utmTextRows)
        : '';

    $mail = new PHPMailer(true);
    $mail->isSMTP();
    $mail->Host = $smtpHost;
    $mail->Port = $smtpPort;
    $mail->SMTPAuth = true;
    $mail->Username = $smtpUsername;
    $mail->Password = $smtpPassword;
    $mail->SMTPSecure = $smtpSecure === 'starttls'
        ? PHPMailer::ENCRYPTION_STARTTLS
        : PHPMailer::ENCRYPTION_SMTPS;
    $mail->CharSet = PHPMailer::CHARSET_UTF8;
    $mail->Timeout = 15;

    $mail->setFrom($smtpUsername, 'Formulário Turma Hécate');
    $mail->addAddress($mailTo);
    $mail->addReplyTo($email, $name);
    $mail->Subject = 'Nova inscrição — Turma Hécate';
    $mail->isHTML(true);
    $mail->Body = <<<HTML
        <div style="font-family:Arial,sans-serif;color:#17212b;line-height:1.6">
          <h2 style="color:#8a672c">Nova inscrição — Turma Hécate</h2>
          <p><strong>Nome:</strong> {$safeName}</p>
          <p><strong>E-mail:</strong> {$safeEmail}</p>
          <p><strong>WhatsApp:</strong> {$safeWhatsapp}</p>
          {$utmHtml}
          <p style="color:#65717d;font-size:12px">Recebido em {$submittedAt} (America/Sao_Paulo).</p>
        </div>
        HTML;
    $mail->AltBody = "Nova inscrição — Turma Hécate\n\nNome: {$name}\nE-mail: {$email}\nWhatsApp: {$whatsapp}{$utmText}\nRecebido em: {$submittedAt} (America/Sao_Paulo)";
    $mail->send();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    respond(405, ['ok' => false, 'message' => 'Método não permitido.']);
}

if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 8192) {
    respond(413, ['ok' => false, 'message' => 'Conteúdo muito grande.']);
}

$originHeader = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
$requestHost = strtolower((string) parse_url('http://' . ($_SERVER['HTTP_HOST'] ?? ''), PHP_URL_HOST));
$originHost = strtolower((string) parse_url($originHeader, PHP_URL_HOST));
if ($originHost !== '' && $requestHost !== '' && $originHost !== $requestHost) {
    respond(403, ['ok' => false, 'message' => 'Origem não permitida.']);
}

$rawPayload = (string) file_get_contents('php://input', false, null, 0, 8193);
if (strlen($rawPayload) > 8192) {
    respond(413, ['ok' => false, 'message' => 'Conteúdo muito grande.']);
}

$payload = json_decode($rawPayload, true);
if (!is_array($payload)) {
    respond(400, ['ok' => false, 'message' => 'Dados inválidos.']);
}

if (!empty($payload['empresa'])) {
    respond(200, ['ok' => true]);
}

$name = app_clean_text((string) ($payload['nome'] ?? ''), 8192);
$email = app_clean_text((string) ($payload['email'] ?? ''), 8192);
$whatsapp = app_clean_text((string) ($payload['whatsapp'] ?? ''), 8192);
$whatsappDigits = preg_replace('/\D+/', '', $whatsapp) ?? '';
$metaEventId = preg_replace('/[^A-Za-z0-9._:-]/', '', (string) ($payload['meta_event_id'] ?? '')) ?? '';
$metaEventId = substr($metaEventId, 0, 100);
if ($metaEventId === '') {
    $metaEventId = 'lead-' . bin2hex(random_bytes(16));
}

$eventSourceUrl = app_clean_text((string) ($payload['event_source_url'] ?? ''), 2048);
$utmLabels = [
    'utm_source' => 'UTM Source',
    'utm_medium' => 'UTM Medium',
    'utm_campaign' => 'UTM Campaign',
    'utm_content' => 'UTM Content',
    'utm_term' => 'UTM Term',
];
$utmValues = [];
foreach ($utmLabels as $utmKey => $utmLabel) {
    $utmValues[$utmKey] = app_clean_text((string) ($payload[$utmKey] ?? ''), 255);
}

$nameLength = function_exists('mb_strlen') ? mb_strlen($name, 'UTF-8') : strlen($name);
if ($nameLength < 2 || $nameLength > 120) {
    respond(422, ['ok' => false, 'message' => 'Nome inválido.']);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 190) {
    respond(422, ['ok' => false, 'message' => 'E-mail inválido.']);
}
if (strlen($whatsapp) > 32 || strlen($whatsappDigits) < 10 || strlen($whatsappDigits) > 13) {
    respond(422, ['ok' => false, 'message' => 'WhatsApp inválido.']);
}

// Um unico instante, no fuso exigido, alimenta banco, e-mail e Meta CAPI.
$receivedAt = app_now();
$receivedAtMysql = $receivedAt->format('Y-m-d H:i:s');

try {
    $pdo = app_database();
    $duplicateThreshold = $receivedAt->modify('-30 seconds')->format('Y-m-d H:i:s');
    $duplicate = $pdo->prepare(
        'SELECT id
         FROM leads
         WHERE email = :email AND telefone = :telefone AND criado_em >= :limite
         ORDER BY criado_em DESC, id DESC
         LIMIT 1'
    );
    $duplicate->execute([
        'email' => $email,
        'telefone' => $whatsapp,
        'limite' => $duplicateThreshold,
    ]);

    if ($duplicate->fetchColumn() !== false) {
        respond(200, ['ok' => true]);
    }

    $originLength = min(app_database_column_length($pdo, 'leads', 'origem', 255), 2048);
    $userAgentLength = min(app_database_column_length($pdo, 'leads', 'user_agent', 512), 512);
    $origin = buildLeadOrigin($eventSourceUrl, $utmValues, $originLength);
    $userAgent = app_clean_text((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), $userAgentLength);
    $clientIp = app_request_ip();

    $insert = $pdo->prepare(
        'INSERT INTO leads (nome, email, telefone, origem, ip, user_agent, criado_em)
         VALUES (:nome, :email, :telefone, :origem, :ip, :user_agent, :criado_em)'
    );
    $insert->execute([
        'nome' => $name,
        'email' => $email,
        'telefone' => $whatsapp,
        'origem' => $origin,
        'ip' => $clientIp,
        'user_agent' => $userAgent,
        'criado_em' => $receivedAtMysql,
    ]);
} catch (Throwable $exception) {
    error_log('Turma Hecate CRM: nao foi possivel salvar o lead: ' . $exception->getMessage());
    respond(503, [
        'ok' => false,
        'message' => 'Não foi possível concluir sua inscrição agora. Tente novamente em instantes.',
    ]);
}

try {
    sendLeadNotification($name, $email, $whatsapp, $utmLabels, $utmValues, $receivedAt);
} catch (Throwable $exception) {
    // A inscricao permanece valida: o banco e a fonte principal dos leads.
    error_log('Turma Hecate SMTP: notificacao falhou: ' . $exception->getMessage());
}

try {
    $metaPixelId = preg_replace('/\D+/', '', app_env('META_PIXEL_ID', '1388634156007268')) ?? '';
    sendMetaLeadEvent(
        $metaPixelId,
        app_env('META_ACCESS_TOKEN'),
        app_env('META_GRAPH_API_VERSION', 'v24.0'),
        $metaEventId,
        $eventSourceUrl,
        $name,
        $email,
        $whatsappDigits,
        $receivedAt->getTimestamp()
    );
} catch (Throwable $exception) {
    error_log('Turma Hecate Meta CAPI: erro inesperado: ' . $exception->getMessage());
}

respond(200, ['ok' => true]);
