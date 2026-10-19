<?php
declare(strict_types=1);

return [
    'SUPABASE_URL' => 'https://SEU-PROJETO.supabase.co',
    'SUPABASE_ANON_KEY' => 'COLOQUE_A_CHAVE_ANON_PUBLICA_DO_SUPABASE',
    // Domínios autorizados a chamar esta API.
    // A API PHP e os ficheiros MP3 continuam hospedados em netpubli.com.br por enquanto;
    // a plataforma passou a ser servida em empreendedorsemdor.com/plataforma/.
    'ALLOWED_ORIGINS' => [
        'https://empreendedorsemdor.com',
        'https://www.empreendedorsemdor.com',
        'https://netpubli.com.br',
    ],
    'MAX_BYTES' => 157286400,
    // 'MEDIA_DIR' => '/home/UTILIZADOR/domains/netpubli.com.br/public_html/media-academia',
    // Opcional: se omitido ou vazio, o endpoint usa realpath(__DIR__ . '/../media-academia').
    // Preencha apenas se a pasta media-academia estiver noutro caminho.
    'MEDIA_BASE_URL' => 'https://netpubli.com.br/media-academia/',
];
