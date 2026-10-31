const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const publicDir = path.join(rootDir, 'public');

/**
 * Calcula a próxima versão de acordo com a regra de negócio:
 * - Começa em 1.8.5
 * - Vai até 1.8.10
 * - Depois de 1.8.10 -> 1.9.1 (patch reinicia em 1, minor avança até 9)
 * - Vai até 1.9.10
 * - Depois de 1.9.10 -> 2.1.1 (patch reinicia em 1, minor reinicia em 1, major avança)
 * - Sucessivamente para as demais versões (2.1.1 até 2.1.10 -> 2.2.1 ... 2.9.10 -> 3.1.1)
 */
function getNextVersion(currentVersion) {
    if (!currentVersion || currentVersion === '1.8.50' || currentVersion === '1.8.49') {
        return '1.8.5';
    }

    const parts = currentVersion.replace(/[^0-9.]/g, '').split('.').map(n => parseInt(n, 10) || 0);
    let major = parts[0] || 1;
    let minor = parts[1] || 8;
    let patch = parts[2] || 5;

    if (patch < 10) {
        patch++;
    } else {
        patch = 1;
        if (minor < 9) {
            minor++;
        } else {
            minor = 1;
            major++;
        }
    }
    return `${major}.${minor}.${patch}`;
}

function updateFile(filePath, updater) {
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf8');
    const newContent = updater(content);
    if (newContent !== content) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`[OK] Atualizado: ${path.relative(rootDir, filePath)}`);
    }
}

function applyVersion(targetVersion) {
    console.log(`\n==================================================`);
    console.log(`Aplicando versão v${targetVersion} no aplicativo...`);
    console.log(`==================================================\n`);

    const now = Date.now();

    // 1. version.json (raiz e public)
    const versionPayload = JSON.stringify({ version: targetVersion, updatedAt: now }, null, 2);
    fs.writeFileSync(path.join(rootDir, 'version.json'), versionPayload, 'utf8');
    fs.writeFileSync(path.join(publicDir, 'version.json'), versionPayload, 'utf8');
    console.log(`[OK] version.json e public/version.json gravados.`);

    // 2. package.json (raiz e public)
    const updatePackageJson = (content) => {
        try {
            const pkg = JSON.parse(content);
            pkg.version = targetVersion;
            return JSON.stringify(pkg, null, 2) + '\n';
        } catch (e) {
            return content.replace(/"version":\s*"[^"]+"/, `"version": "${targetVersion}"`);
        }
    };
    updateFile(path.join(rootDir, 'package.json'), updatePackageJson);
    updateFile(path.join(publicDir, 'package.json'), updatePackageJson);

    // 3. sw.js (raiz e public)
    const updateSw = (content) => {
        let res = content.replace(/\/\/ Service Worker - APP Finanças Pessoais v[^\r\n]+/, `// Service Worker - APP Finanças Pessoais v${targetVersion}`);
        res = res.replace(/const CACHE_NAME = ['"]financas-pessoais-v[^'"]+['"];/, `const CACHE_NAME = 'financas-pessoais-v${targetVersion}';`);
        return res;
    };
    updateFile(path.join(rootDir, 'sw.js'), updateSw);
    updateFile(path.join(publicDir, 'sw.js'), updateSw);

    // 4. auto-update.js (raiz e public)
    const updateAutoUpdate = (content) => {
        let res = content;
        // Assegura getCurrentRunningVersion() fallback
        res = res.replace(/(function getCurrentRunningVersion\(\)[\s\S]*?return\s+['"])[^'"]+(['"];)/, `$1${targetVersion}$2`);
        return res;
    };
    updateFile(path.join(rootDir, 'auto-update.js'), updateAutoUpdate);
    updateFile(path.join(publicDir, 'auto-update.js'), updateAutoUpdate);

    // 5. index.html (raiz e public)
    const updateIndexHtml = (content) => {
        let res = content;
        // meta build version
        res = res.replace(/<meta\s+name="app-build-version"\s+content="[^"]*">/, `<meta name="app-build-version" content="${targetVersion}">`);
        // window.APP_BUILD_VERSION
        res = res.replace(/window\.APP_BUILD_VERSION\s*=\s*['"][^'"]*['"];/, `window.APP_BUILD_VERSION = '${targetVersion}';`);
        // badge title e text
        res = res.replace(/title="Versão do sistema v[^"]*"/, `title="Versão do sistema v${targetVersion}"`);
        res = res.replace(/<span id="lblVersaoApp" class="version-text">v[^<]*<\/span>/, `<span id="lblVersaoApp" class="version-text">v${targetVersion}</span>`);
        
        // Query params de scripts e css: ?v=...
        res = res.replace(/\.css\?v=[0-9.]+/g, `.css?v=${targetVersion}`);
        res = res.replace(/\.js\?v=[0-9.]+/g, `.js?v=${targetVersion}`);

        return res;
    };
    updateFile(path.join(rootDir, 'index.html'), updateIndexHtml);
    updateFile(path.join(publicDir, 'index.html'), updateIndexHtml);

    // 6. server.js (fallback endpoint /api/version)
    updateFile(path.join(rootDir, 'server.js'), (content) => {
        return content.replace(/res\.json\(\{\s*version:\s*['"][0-9.]+['"],\s*updatedAt:\s*Date\.now\(\)\s*\}\);/, `res.json({ version: '${targetVersion}', updatedAt: Date.now() });`);
    });

    console.log(`\n✅ Versão v${targetVersion} aplicada com sucesso em todos os arquivos!`);
}

// Execução CLI apenas quando chamado diretamente
if (require.main === module) {
    const args = process.argv.slice(2);
    let target = null;

    if (args[0] === 'set' && args[1]) {
        target = args[1].trim().replace(/^v/i, '');
    } else if (args[0] && args[0] !== 'next') {
        target = args[0].trim().replace(/^v/i, '');
    } else {
        // Modo automático: descobre a atual e incrementa pela nova regra
        let current = '1.8.5';
        try {
            const vFile = path.join(rootDir, 'version.json');
            if (fs.existsSync(vFile)) {
                const data = JSON.parse(fs.readFileSync(vFile, 'utf8'));
                if (data && data.version) current = data.version.trim();
            }
        } catch (e) {}
        target = getNextVersion(current);
    }

    applyVersion(target);
}

module.exports = { getNextVersion, applyVersion };
