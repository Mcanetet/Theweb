<?php
/**
 * Envío de leads a contacto@theweb.cl (Hostinger / PHP mail).
 * El formulario de TheWeb llama aquí si Node no puede enviar SMTP.
 */
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  header('Access-Control-Allow-Methods: POST, OPTIONS');
  header('Access-Control-Allow-Headers: Content-Type');
  http_response_code(204);
  exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['ok' => false, 'error' => 'Método no permitido']);
  exit;
}

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!is_array($data)) {
  $data = $_POST;
}

if (!empty($data['website'])) {
  echo json_encode(['ok' => true]);
  exit;
}

$name = trim((string) ($data['name'] ?? ''));
$email = trim((string) ($data['email'] ?? ''));
$phone = trim((string) ($data['phone'] ?? ''));
$company = trim((string) ($data['company'] ?? ''));
$message = trim((string) ($data['message'] ?? ''));
$pageUrl = trim((string) ($data['pageUrl'] ?? ''));

if ($name === '' || $message === '') {
  http_response_code(400);
  echo json_encode(['ok' => false, 'error' => 'Nombre y mensaje son obligatorios']);
  exit;
}

if ($email === '' && $phone === '') {
  http_response_code(400);
  echo json_encode(['ok' => false, 'error' => 'Indica email o teléfono']);
  exit;
}

if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
  http_response_code(400);
  echo json_encode(['ok' => false, 'error' => 'Email inválido']);
  exit;
}

$to = 'contacto@theweb.cl';
$subject = '[TheWeb] Nuevo lead — ' . $name;
$body = implode("\n", [
  'Nuevo mensaje desde el formulario web',
  '',
  'Nombre: ' . $name,
  'Email: ' . ($email !== '' ? $email : '—'),
  'Teléfono: ' . ($phone !== '' ? $phone : '—'),
  'Empresa: ' . ($company !== '' ? $company : '—'),
  'Página: ' . ($pageUrl !== '' ? $pageUrl : '—'),
  '',
  'Mensaje:',
  $message,
]);

$from = 'TheWeb. <contacto@theweb.cl>';
$headers = [
  'MIME-Version: 1.0',
  'Content-Type: text/plain; charset=UTF-8',
  'From: ' . $from,
  'Reply-To: ' . ($email !== '' ? $email : $to),
  'X-Mailer: TheWeb-Lead',
];

$sent = @mail(
  $to,
  '=?UTF-8?B?' . base64_encode($subject) . '?=',
  $body,
  implode("\r\n", $headers),
  '-f contacto@theweb.cl'
);

if (!$sent) {
  http_response_code(502);
  echo json_encode(['ok' => false, 'error' => 'No se pudo enviar el correo']);
  exit;
}

echo json_encode(['ok' => true, 'emailedTo' => $to, 'via' => 'php-mail']);
