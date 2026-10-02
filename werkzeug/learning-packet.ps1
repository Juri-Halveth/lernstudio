#requires -Version 7.3
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]] $PacketArgs
)

$ErrorActionPreference = 'Stop'
$PSNativeCommandArgumentPassing = 'Standard'
try {
    $nodeCommand = Get-Command node -CommandType Application -ErrorAction Stop | Select-Object -First 1
    $packetScript = Join-Path $PSScriptRoot 'learning-packet.mjs'
    $nodeArguments = @($packetScript) + @($PacketArgs)
    & $nodeCommand.Source @nodeArguments
    exit $LASTEXITCODE
} catch {
    Write-Error 'The learning packet CLI could not start. Node.js 18+ and PowerShell 7.3+ are required.'
    exit 1
}
