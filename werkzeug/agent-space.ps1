#requires -Version 7.3
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]] $SpaceArgs
)

$ErrorActionPreference = 'Stop'
$PSNativeCommandArgumentPassing = 'Standard'
try {
    $nodeCommand = Get-Command node -CommandType Application -ErrorAction Stop | Select-Object -First 1
    $spaceScript = Join-Path $PSScriptRoot 'agent-space.mjs'
    $nodeArguments = @($spaceScript) + @($SpaceArgs)
    & $nodeCommand.Source @nodeArguments
    exit $LASTEXITCODE
} catch {
    [Console]::Error.WriteLine('The agent space CLI could not start. Node.js 18+ and PowerShell 7.3+ are required.')
    exit 1
}
