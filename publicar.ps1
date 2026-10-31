# publicar.ps1 - Sincroniza public/, valida JS, faz commit e envia para o GitHub (Render atualiza sozinho)
# Uso: powershell -ExecutionPolicy Bypass -File publicar.ps1 "mensagem do commit"
param([string]$Mensagem = "Atualizacao do app")
Set-Location $PSScriptRoot

$arquivos = @(
  'index.html','app-custom.css','finance-style.css','finance-cartoes.js','finance-dashboard.js',
  'finance-auto-notificacoes.js','finance-ocr.js','finance-db.js','finance-sync.js','finance-powerbi.js',
  'auth.js','auto-update.js','sw.js','version.json','manifest.json'
)
foreach ($a in $arquivos) {
  if (Test-Path $a) { Copy-Item $a -Destination "public\$a" -Force }
}
if (Test-Path 'ocr') { Copy-Item 'ocr' -Destination 'public' -Recurse -Force }

foreach ($js in @('finance-cartoes.js','finance-dashboard.js','finance-auto-notificacoes.js','finance-ocr.js','finance-sync.js','auth.js','sw.js','server.js')) {
  node -c $js
  if ($LASTEXITCODE -ne 0) { Write-Host "ERRO de sintaxe em $js. Publicacao cancelada." -ForegroundColor Red; exit 1 }
}

git add -A
git commit -m $Mensagem
git push origin main
if ($LASTEXITCODE -eq 0) { Write-Host "Publicado no GitHub. O Render atualiza automaticamente." -ForegroundColor Green }
else { Write-Host "Falha no push. Verifique a conexao e rode novamente." -ForegroundColor Red }
