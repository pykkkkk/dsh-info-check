$ErrorActionPreference = 'Stop'
$testScript = Join-Path $PSScriptRoot 'ui.e2e.mjs'

$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if ($null -ne $nodeCommand) {
  & $nodeCommand.Source $testScript
  exit $LASTEXITCODE
}

$candidates = @(
  (Join-Path $env:USERPROFILE '.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'),
  (Join-Path $env:LOCALAPPDATA 'Programs\nodejs\node.exe'),
  'C:\Program Files\nodejs\node.exe'
)
foreach ($candidate in $candidates) {
  if (Test-Path -LiteralPath $candidate) {
    & $candidate $testScript
    exit $LASTEXITCODE
  }
}

if ((-not [string]::IsNullOrWhiteSpace($env:DSH_NODE_EXECUTABLE)) -and
    ((Split-Path -Leaf $env:DSH_NODE_EXECUTABLE) -ieq 'node.exe')) {
  & $env:DSH_NODE_EXECUTABLE $testScript
  exit $LASTEXITCODE
}

Write-Error 'Node.js 20+ was not found. Install Node or set DSH_NODE_EXECUTABLE to node.exe.'
exit 1
