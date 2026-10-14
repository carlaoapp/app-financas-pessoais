<#
  LANÇAR NOVA VERSÃO - FINANÇAS PESSOAIS
  Uso: powershell -ExecutionPolicy Bypass -File .\release.ps1 -Version 1.4.3 [-Message "o que mudou"]

  Faz tudo sozinho:
   1. Atualiza versão nos arquivos
   2. Valida sintaxe dos scripts
   3. Copia public/ para a raiz (GitHub Pages)
   4. Commit + push na branch main
   Depois do push, o Render e GitHub Pages atualizam automaticamente.
#>
param(
  [Parameter(Mandatory = $true)][string]$Version,
  [string]$Message = ""
)

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

if ($Version -notmatch '^\d+\.\d+\.\d+$') { throw "Versão inválida '$Version'. Use o formato 1.4.3" }

$current = (Get-Content "public\version.json" -Raw | ConvertFrom-Json).version
Write-Host "Versão atual: $current  ->  Nova versão: $Version"

$files = @("public\version.json", "public\sw.js", "public\index.html", "public\auto-update.js")
foreach ($f in $files) {
  $text = [IO.File]::ReadAllText((Resolve-Path $f))
  if ($text.Contains($current)) {
    [IO.File]::WriteAllText((Resolve-Path $f), $text.Replace($current, $Version), (New-Object Text.UTF8Encoding($false)))
    Write-Host "  atualizado: $f"
  }
}

Copy-Item -Path "public\*" -Destination "." -Recurse -Force
Write-Host "  public/ copiado para a raiz"

$msg = "v$Version"
if ($Message) { $msg += ": $Message" }
git add -A
git commit -m "$msg"
$prevEA = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
git push origin main
$ErrorActionPreference = $prevEA
Write-Host "Versão $Version publicada com sucesso no GitHub e Render!"
