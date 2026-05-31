<?php
/**
 * cPanel / Apache uyumlu kie.ai Nano Banana 2 proxy
 * Dosyayı /api/generate-image.php olarak yükleyin
 * KIE_API_KEY sabitini aşağıya girin veya .env'den okuyun
 */

define('KIE_API_KEY',   'ab4be97736bdc31f675cd89a20258bea');
define('CREATE_URL',    'https://api.kie.ai/api/v1/jobs/createTask');
define('STATUS_URL',    'https://api.kie.ai/api/v1/jobs/recordInfo');
define('MODEL',         'nano-banana-2');
define('STYLE_SUFFIX',  'photorealistic, cinematic lighting, 4K ultra detail, professional photography, deep blue ocean industrial tones, high contrast');
define('POLL_INTERVAL', 4);   // saniye
define('MAX_POLLS',     30);  // maks 120 saniye

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST')    { http_response_code(405); echo json_encode(['error' => 'Method not allowed']); exit; }

$body   = json_decode(file_get_contents('php://input'), true);
$prompt = trim($body['prompt'] ?? '');

if (strlen($prompt) < 3) {
    http_response_code(400);
    echo json_encode(['error' => 'Geçerli bir prompt gerekli.']);
    exit;
}

$safePrompt = mb_substr($prompt, 0, 500) . ', ' . STYLE_SUFFIX;
$aspectRatio = $body['aspectRatio'] ?? '16:9';

// ── 1. Görev oluştur ─────────────────────────────────────────────────────
$createPayload = json_encode([
    'model' => MODEL,
    'input' => ['prompt' => $safePrompt, 'aspect_ratio' => $aspectRatio],
]);

$ch = curl_init(CREATE_URL);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $createPayload,
    CURLOPT_HTTPHEADER     => [
        'Authorization: Bearer ' . KIE_API_KEY,
        'Content-Type: application/json',
    ],
    CURLOPT_TIMEOUT        => 15,
    CURLOPT_SSL_VERIFYPEER => true,
]);

$createResponse = curl_exec($ch);
$createHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($createHttpCode !== 200) {
    http_response_code(502);
    echo json_encode(['error' => 'Görev oluşturulamadı.', 'status' => $createHttpCode]);
    exit;
}

$createData = json_decode($createResponse, true);
if (($createData['code'] ?? 0) !== 200) {
    http_response_code(502);
    echo json_encode(['error' => 'API hatası.', 'detail' => $createData['msg'] ?? '']);
    exit;
}

$taskId = $createData['data']['taskId'] ?? null;
if (!$taskId) {
    http_response_code(502);
    echo json_encode(['error' => 'Task ID alınamadı.']);
    exit;
}

// ── 2. Polling ───────────────────────────────────────────────────────────
for ($i = 0; $i < MAX_POLLS; $i++) {
    sleep(POLL_INTERVAL);

    $ch = curl_init(STATUS_URL . '?taskId=' . urlencode($taskId));
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . KIE_API_KEY],
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_SSL_VERIFYPEER => true,
    ]);
    $statusResponse = curl_exec($ch);
    $statusHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($statusHttpCode !== 200) continue;

    $statusData = json_decode($statusResponse, true);
    if (($statusData['code'] ?? 0) !== 200) continue;

    $state = $statusData['data']['state'] ?? '';

    if ($state === 'success') {
        $resultJson = $statusData['data']['resultJson'] ?? '';
        $result     = json_decode($resultJson, true);
        $imageUrl   = $result['resultUrls'][0] ?? null;

        if ($imageUrl) {
            header('Cache-Control: public, max-age=300');
            echo json_encode(['image_url' => $imageUrl]);
            exit;
        }
    }

    if ($state === 'fail') {
        http_response_code(502);
        echo json_encode(['error' => 'Görsel üretimi başarısız.', 'detail' => $statusData['data']['failMsg'] ?? '']);
        exit;
    }
}

http_response_code(504);
echo json_encode(['error' => 'Zaman aşımı: görsel üretimi tamamlanamadı.']);
