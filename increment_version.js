const fs = require('fs');
const path = require('path');

const versionFile = path.join(__dirname, 'public', 'version.json');
let version = '1.0.0';

try {
    if (fs.existsSync(versionFile)) {
        const data = JSON.parse(fs.readFileSync(versionFile, 'utf8'));
        const parts = (data.version || '1.0.0').split('.');
        if (parts.length === 3) {
            parts[2] = parseInt(parts[2], 10) + 1;
            version = parts.join('.');
        } else {
            version = '1.0.1';
        }
    }
} catch (e) {
    version = '1.0.1';
}

const payload = {
    version: version,
    updatedAt: Date.now()
};

fs.writeFileSync(versionFile, JSON.stringify(payload, null, 2), 'utf8');
console.log(`[Versão Atualizada] Nova versão gerada: v${version}`);
