const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

const PORT = 3000;
const cloudflaredExe = path.join(__dirname, 'cloudflared.exe');

console.log('===============================================================');
console.log('   INICIANDO APP FINANÇAS PESSOAIS COM LINK ONLINE SEGURO     ');
console.log('===============================================================\n');

function checkLocalServer() {
    return new Promise((resolve) => {
        const req = http.get(`http://localhost:${PORT}/api/status`, (res) => {
            resolve(res.statusCode === 200);
        });
        req.on('error', () => resolve(false));
        req.setTimeout(1500, () => {
            req.destroy();
            resolve(false);
        });
    });
}

async function main() {
    const isRunning = await checkLocalServer();
    if (!isRunning) {
        console.log('[*] Iniciando servidor local na porta ' + PORT + '...');
        const srv = spawn('node', ['server.js'], { stdio: 'inherit' });
        srv.on('error', (err) => console.error('[!] Erro no servidor:', err));
        await new Promise(r => setTimeout(r, 2000));
    } else {
        console.log('[*] Servidor local já está em execução na porta ' + PORT + '.');
    }

    if (!fs.existsSync(cloudflaredExe)) {
        console.error('[!] Executável cloudflared.exe não encontrado!');
        return;
    }

    console.log('[*] Gerando link público oficial com HTTPS (Cloudflare)...');
    const tunnel = spawn(cloudflaredExe, ['tunnel', '--url', `http://localhost:${PORT}`], {
        stdio: ['ignore', 'pipe', 'pipe']
    });

    let foundUrl = false;
    function handleLog(data) {
        const text = data.toString();
        const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
        if (match && !foundUrl) {
            foundUrl = true;
            const publicUrl = match[0];
            fs.writeFileSync(path.join(__dirname, 'link_online.txt'), publicUrl, 'utf8');

            console.log('\n===============================================================');
            console.log('🎉 LINK ONLINE PRONTO E ATIVO (ACESSO GLOBAL):');
            console.log('👉 ' + publicUrl);
            console.log('===============================================================');
            console.log('📱 No Celular: Abra o link acima no Chrome/Safari e toque em:');
            console.log('   "Instalar aplicativo" ou "Adicionar à tela de início"');
            console.log('💻 No Computador: Abra no navegador para instalar e usar!');
            console.log('===============================================================\n');

            // Abre o navegador automaticamente
            const openCmd = process.platform === 'win32' ? 'start' : 'open';
            spawn('cmd.exe', ['/c', openCmd, '""', publicUrl]);
        }
    }

    tunnel.stdout.on('data', handleLog);
    tunnel.stderr.on('data', handleLog);

    tunnel.on('close', (code) => {
        console.log('[*] Túnel encerrado com código:', code);
    });
}

main();
