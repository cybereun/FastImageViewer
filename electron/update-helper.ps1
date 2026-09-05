param([Parameter(Mandatory=$true)][string] $JobPath)
$ErrorActionPreference = 'Stop'
$job = Get-Content -LiteralPath $JobPath -Raw -Encoding UTF8 | ConvertFrom-Json
$jobDirectory = (Get-Item -LiteralPath (Split-Path -Parent $JobPath)).FullName
$statusPath = Join-Path $jobDirectory 'status.json'
$ackPath = Join-Path $jobDirectory 'launch.json'
$stagingPath = "$($job.targetPath).fastimage-new-$($job.id)"
$backupPath = "$($job.targetPath).fastimage-backup-$($job.id)"
$lock = $null
$launched = $null
$oldExited = $false
$replaced = $false
$progressWindow = $null
$progressLabel = $null

function Show-Progress {
    if (-not $job.showProgress) { return }
    Add-Type -AssemblyName System.Windows.Forms
    $script:progressWindow = New-Object Windows.Forms.Form
    $script:progressWindow.Text = 'FastImage 업데이트'
    $script:progressWindow.ClientSize = New-Object Drawing.Size(440, 100)
    $script:progressWindow.StartPosition = 'CenterScreen'
    $script:progressWindow.FormBorderStyle = 'FixedDialog'
    $script:progressWindow.ControlBox = $false
    $script:progressLabel = New-Object Windows.Forms.Label
    $script:progressLabel.Location = New-Object Drawing.Point(20, 20)
    $script:progressLabel.Size = New-Object Drawing.Size(400, 60)
    $script:progressWindow.Controls.Add($script:progressLabel)
    $script:progressWindow.Show()
}

function Write-Status($phase, $message = '') {
    if ($progressLabel) {
        $labels = @{ 'waiting-for-exit'='앱 종료를 기다리고 있습니다.'; 'installing'='새 버전을 설치하고 있습니다.';
            'launching'='새 버전을 실행하고 있습니다. 창이 열릴 때까지 기다려주세요.';
            'retrying-launch'='앱 실행을 다시 시도하고 있습니다.'; 'recovering'='이전 버전으로 복구하고 있습니다.';
            'completed'='업데이트와 재실행이 완료되었습니다.'; 'rolled-back'='이전 버전으로 복구했습니다.'; 'failed'='업데이트를 완료하지 못했습니다.' }
        $progressLabel.Text = $labels[$phase]
        [Windows.Forms.Application]::DoEvents()
    }
    @{ phase=$phase; message=$message; version=$job.expectedVersion; helperPid=$PID; time=[DateTime]::UtcNow.ToString('o') } |
        ConvertTo-Json | Set-Content -LiteralPath "$statusPath.tmp" -Encoding UTF8
    Move-Item -LiteralPath "$statusPath.tmp" -Destination $statusPath -Force
}
function Wait-Until($predicate, $timeoutMs) {
    $timer = [Diagnostics.Stopwatch]::StartNew()
    do {
        if (& $predicate) { return $true }
        if ($progressWindow) { [Windows.Forms.Application]::DoEvents() }
        Start-Sleep -Milliseconds 200
    } while ($timer.ElapsedMilliseconds -lt $timeoutMs)
    return $false
}
function Move-WithRetry($source, $target) {
    $timer = [Diagnostics.Stopwatch]::StartNew()
    while ($true) {
        try { Move-Item -LiteralPath $source -Destination $target -Force; return }
        catch {
            if ($timer.ElapsedMilliseconds -ge $job.exitTimeoutMs) { throw }
            Start-Sleep -Milliseconds 250
        }
    }
}
function Start-App {
    Remove-Item -LiteralPath $ackPath -Force -ErrorAction SilentlyContinue
    # Explicit quoting preserves spaces, Korean names, and shell metacharacters.
    $arguments = @("--fastimage-update-token=$($job.id)", "`"--user-data-dir=$($job.userData)`"")
    Start-Process -FilePath $job.targetPath -WorkingDirectory (Split-Path -Parent $job.targetPath) -ArgumentList $arguments -PassThru -WindowStyle Normal
}
function Confirm-App($version) {
    Wait-Until {
        try {
            $ack = Get-Content -LiteralPath $ackPath -Raw -Encoding UTF8 | ConvertFrom-Json
            $ackTarget = (Get-Item -LiteralPath $ack.targetPath).FullName
            if ($ack.id -ne $job.id -or $ack.version -ne $version -or $ackTarget -ine $job.targetPath) { return $false }
            $process = Get-Process -Id $ack.pid -ErrorAction SilentlyContinue
            if (-not $process) { return $false }
            # Only the application's mounted renderer writes this acknowledgement.
            return $true
        } catch { return $false }
    } $job.launchTimeoutMs
}
function Stop-LaunchedTree {
    if (-not $script:launched -or $script:launched.HasExited) { return }
    # Only stop descendants of the executable started by this transaction.
    $processes = @(Get-CimInstance Win32_Process)
    $ids = [Collections.Generic.List[int]]::new()
    $ids.Add($script:launched.Id)
    for ($i = 0; $i -lt $ids.Count; $i++) {
        foreach ($child in $processes | Where-Object ParentProcessId -EQ $ids[$i]) { $ids.Add([int]$child.ProcessId) }
    }
    for ($i = $ids.Count - 1; $i -ge 0; $i--) { Stop-Process -Id $ids[$i] -Force -ErrorAction SilentlyContinue }
}

try {
    $lock = [IO.File]::Open((Join-Path (Split-Path -Parent $jobDirectory) 'update.lock'), 'OpenOrCreate', 'ReadWrite', 'None')
    Write-Status 'preparing'
    if ((Get-FileHash -LiteralPath $job.sourcePath -Algorithm SHA256).Hash -ine $job.sha256) { throw 'The downloaded update checksum did not match.' }
    if (-not (Test-Path -LiteralPath $job.targetPath -PathType Leaf)) { throw 'The current FastImage executable was not found.' }
    # Expand Windows 8.3 paths before constructing sibling files that do not exist yet.
    $job.sourcePath = (Get-Item -LiteralPath $job.sourcePath).FullName
    $job.targetPath = (Get-Item -LiteralPath $job.targetPath).FullName
    $job.userData = (Get-Item -LiteralPath $job.userData).FullName
    $stagingPath = "$($job.targetPath).fastimage-new-$($job.id)"
    $backupPath = "$($job.targetPath).fastimage-backup-$($job.id)"
    if ($job.distribution -eq 'portable') {
        Copy-Item -LiteralPath $job.sourcePath -Destination $stagingPath
        if ((Get-FileHash -LiteralPath $stagingPath -Algorithm SHA256).Hash -ine $job.sha256) { throw 'The replacement copy checksum did not match.' }
    }
    Write-Status 'ready'
    Set-Content -LiteralPath (Join-Path $jobDirectory 'ready') -Value $job.id
    if (-not (Wait-Until { Test-Path -LiteralPath (Join-Path $jobDirectory 'commit') } 30000)) { throw 'Update was not committed. FastImage was left open.' }
    Show-Progress
    Write-Status 'waiting-for-exit'
    if (-not (Wait-Until { -not (Get-Process -Id $job.processId -ErrorAction SilentlyContinue) } $job.exitTimeoutMs)) { throw 'FastImage did not exit. No files were replaced.' }
    $oldExited = $true
    Write-Status 'installing'
    if ($job.distribution -eq 'portable') {
        Move-WithRetry $job.targetPath $backupPath
        Move-WithRetry $stagingPath $job.targetPath
        $replaced = $true
    } else {
        # Assisted NSIS stays closed in silent mode. This helper owns the relaunch.
        $installer = Start-Process -FilePath $job.sourcePath -ArgumentList '/S', '--updated' -PassThru -WindowStyle Hidden
        if (-not (Wait-Until { $installer.HasExited } 600000)) { throw 'The installer is still running. Please wait for installation to finish.' }
        $installer.WaitForExit()
        if ($installer.ExitCode -ne 0) { throw "Installer exited with code $($installer.ExitCode)." }
    }
    Write-Status 'launching'
    $launched = Start-App
    if (-not (Confirm-App $job.expectedVersion)) {
        Stop-LaunchedTree
        Write-Status 'retrying-launch'
        $launched = Start-App
        if (-not (Confirm-App $job.expectedVersion)) { throw 'The new version did not confirm that its window opened.' }
    }
    Write-Status 'completed'
    # Keep the last working portable EXE until the new renderer confirms startup.
    foreach ($file in @($backupPath, $stagingPath, $job.sourcePath, $job.pendingPath)) {
        # Cleanup is best effort; it must never roll back a confirmed successful launch.
        try { [IO.File]::Delete($file) } catch { }
    }
} catch {
    $failure = $_.Exception.Message
    $_ | Out-String | Add-Content -LiteralPath (Join-Path $jobDirectory 'helper.log') -Encoding UTF8
    if ($oldExited -and $job.distribution -eq 'portable') {
        try {
            Stop-LaunchedTree
            if (Test-Path -LiteralPath $backupPath) {
                if (Test-Path -LiteralPath $job.targetPath) {
                    Move-WithRetry $job.targetPath "$($job.targetPath).fastimage-failed-$($job.id)"
                }
                Move-WithRetry $backupPath $job.targetPath
            }
            Write-Status 'recovering' $failure
            $launched = Start-App
            if (Confirm-App $job.previousVersion) { Write-Status 'rolled-back' $failure }
            else { Write-Status 'failed' "$failure The previous version was restored but startup could not be confirmed." }
        } catch { Write-Status 'failed' "$failure Recovery: $($_.Exception.Message)" }
    } else {
        # If installation failed but an executable remains, reopen it instead of staying silent.
        if ($oldExited -and (Test-Path -LiteralPath $job.targetPath) -and (-not $installer -or $installer.HasExited)) {
            try { $launched = Start-App } catch { }
        }
        Write-Status 'failed' $failure
    }
    if ($progressWindow) { $progressWindow.Close() }
    if ($lock) { $lock.Dispose(); $lock = $null }
    if ($job.showErrors) {
        Add-Type -AssemblyName System.Windows.Forms
        [Windows.Forms.MessageBox]::Show("FastImage 업데이트를 완료하지 못했습니다. 복구 상태와 원인은 아래 로그에서 확인할 수 있습니다.`n`n$failure`n`n로그: $jobDirectory", 'FastImage 업데이트', 'OK', 'Warning') | Out-Null
    }
} finally {
    try { [IO.File]::Delete($stagingPath) } catch { }
    if ($lock) { $lock.Dispose() }
    if ($progressWindow) { $progressWindow.Dispose() }
}
