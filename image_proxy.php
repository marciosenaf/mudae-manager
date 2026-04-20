<?php
$url = $_GET['url'] ?? '';
if (!$url || !preg_match('/^https?:\/\//i', $url)) {
    http_response_code(400);
    exit('URL inválida');
}

$options = [
    'http' => [
        'method' => 'GET',
        'header' => "User-Agent: Mozilla/5.0\r\nReferer: https://mudae.net/\r\n",
        'timeout' => 20
    ]
];
$context = stream_context_create($options);
$data = @file_get_contents($url, false, $context);

if ($data === false) {
    http_response_code(502);
    exit('Falha ao baixar imagem');
}

$contentType = 'image/jpeg';
if (isset($http_response_header) && is_array($http_response_header)) {
    foreach ($http_response_header as $header) {
        if (stripos($header, 'Content-Type:') === 0) {
            $contentType = trim(substr($header, strlen('Content-Type:')));
            break;
        }
    }
}
header('Content-Type: ' . $contentType);
header('Cache-Control: public, max-age=86400');
echo $data;
