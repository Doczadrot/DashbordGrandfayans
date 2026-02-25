# Find CSV file containing "Дата накладной" (using hex for stability in UTF-8)
# "Дата накладной" in hex UTF-8: D0 94 D0 B0 D1 82 D0 B0 20 D0 BD D0 B0 D0 BA D0 BB D0 B0 D0 B4 D0 BD D0 BE D0 B9
$targetPattern = [System.Text.Encoding]::UTF8.GetString(@(0xD0, 0x94, 0xD0, 0xB0, 0xD1, 0x82, 0xD0, 0xB0, 0x20, 0xD0, 0xBD, 0xD0, 0xB0, 0xD0, 0xBA, 0xD0, 0xBB, 0xD0, 0xB0, 0xD0, 0xB4, 0xD0, 0xBD, 0xD0, 0xBE, 0xD0, 0xB9))

$csvFiles = Get-ChildItem -Path . -Filter "*.csv"
$targetFile = $null

foreach ($file in $csvFiles) {
    # Read first 20 lines to check for header
    $preview = Get-Content $file.FullName -TotalCount 20 -Encoding UTF8
    if ($preview -match $targetPattern) {
        $targetFile = $file
        break
    }
}

if (-not $targetFile) {
    Write-Host "Sales CSV (containing 'Дата накладной') not found."
    exit
}

Write-Host "Using file: $($targetFile.Name)"

$lines = Get-Content $targetFile.FullName -Encoding UTF8

$rows = 0
$nov = 0
$dec = 0
$jan = 0

foreach ($l in $lines) {
    if ($l -match '^\d{1,2}\.11\.2025') { $nov++; $rows++ }
    elseif ($l -match '^\d{1,2}\.12\.2025') { $dec++; $rows++ }
    elseif ($l -match '^\d{1,2}\.01\.2026') { $jan++; $rows++ }
}

Write-Host "TOTAL ROWS WITH DATE: $rows"
Write-Host "NOVEMBER 2025: $nov"
Write-Host "DECEMBER 2025: $dec"
Write-Host "JANUARY 2026: $jan"
