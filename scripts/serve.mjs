import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const allowedFiles = new Set(['/index.html', '/report-io.js', '/sw.js', '/workspace-crypto.js']);
const mimeTypes = new Map([
    ['.css', 'text/css; charset=utf-8'],
    ['.html', 'text/html; charset=utf-8'],
    ['.ico', 'image/x-icon'],
    ['.jpeg', 'image/jpeg'],
    ['.jpg', 'image/jpeg'],
    ['.js', 'text/javascript; charset=utf-8'],
    ['.json', 'application/json; charset=utf-8'],
    ['.png', 'image/png'],
    ['.svg', 'image/svg+xml'],
    ['.webmanifest', 'application/manifest+json; charset=utf-8']
]);

const server = createServer(async (request, response) => {
    if (!['GET', 'HEAD'].includes(request.method || '')) {
        response.writeHead(405, { Allow: 'GET, HEAD' }).end();
        return;
    }

    let pathname;
    try {
        pathname = decodeURIComponent(new URL(request.url || '/', 'http://localhost').pathname);
    } catch {
        response.writeHead(400).end('Bad request');
        return;
    }

    if (pathname === '/') pathname = '/index.html';
    if (!allowedFiles.has(pathname) && !pathname.startsWith('/images/')) {
        response.writeHead(404).end('Not found');
        return;
    }
    const candidatePath = path.resolve(rootDirectory, `.${pathname}`);
    if (candidatePath !== rootDirectory && !candidatePath.startsWith(`${rootDirectory}${path.sep}`)) {
        response.writeHead(403).end('Forbidden');
        return;
    }

    try {
        const filePath = await realpath(candidatePath);
        if (filePath !== rootDirectory && !filePath.startsWith(`${rootDirectory}${path.sep}`)) {
            response.writeHead(403).end('Forbidden');
            return;
        }
        const fileStat = await stat(filePath);
        if (!fileStat.isFile()) {
            response.writeHead(404).end('Not found');
            return;
        }
        const content = request.method === 'HEAD' ? undefined : await readFile(filePath);
        response.writeHead(200, {
            'Content-Length': fileStat.size,
            'Content-Type': mimeTypes.get(path.extname(filePath).toLowerCase()) || 'application/octet-stream',
            'X-Content-Type-Options': 'nosniff',
            'Referrer-Policy': 'no-referrer',
            'Cache-Control': 'no-cache'
        });
        response.end(content);
    } catch (error) {
        response.writeHead(error.code === 'ENOENT' || error.code === 'ENOTDIR' ? 404 : 500).end('Not found');
    }
});

const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 8000);
server.listen(port, host, () => {
    const address = server.address();
    process.stdout.write(`POS available at http://${host}:${address.port}/index.html\n`);
});
