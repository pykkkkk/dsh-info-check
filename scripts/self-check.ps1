#requires -Version 5.1
$ErrorActionPreference = 'Stop'
$script = Join-Path $PSScriptRoot 'self-check.mjs'

$node = $null
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if ($null -ne $nodeCommand) {
  $node = $nodeCommand.Source
}
if ($null -eq $node -and -not [string]::IsNullOrWhiteSpace($env:DSH_NODE_EXECUTABLE)) {
  if ((Split-Path -Leaf $env:DSH_NODE_EXECUTABLE) -ieq 'node.exe') {
    $node = $env:DSH_NODE_EXECUTABLE
  }
}
if ($null -eq $node) {
  $candidates = @(
    (Join-Path $env:USERPROFILE '.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'),
    (Join-Path $env:LOCALAPPDATA 'Programs\nodejs\node.exe'),
    'C:\Program Files\nodejs\node.exe'
  )
  foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath $candidate) { $node = $candidate; break }
  }
}
if ($null -eq $node) {
  Write-Error 'Node.js 20+ was not found. Install Node or set DSH_NODE_EXECUTABLE to node.exe.'
  exit 2
}

& $node $script @args
exit $LASTEXITCODE
