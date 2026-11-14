import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const distDirectory = join(projectRoot, 'dist');
const thankYouDirectory = join(distDirectory, 'obrigado');

await mkdir(thankYouDirectory, { recursive: true });
await copyFile(
  join(distDirectory, 'index.html'),
  join(thankYouDirectory, 'index.html'),
);
console.log('Rota física criada: dist/obrigado/index.html');

console.log('.env preservado fora do dist; configure-o diretamente na hospedagem.');
