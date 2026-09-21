Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

[System.Windows.Forms.Application]::EnableVisualStyles()

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$downloaderPath = Join-Path $scriptRoot "yt-dlp.exe"
$denoPath = Join-Path $scriptRoot "deno.exe"
$defaultDownloadPath = Join-Path ([Environment]::GetFolderPath("UserProfile")) "Downloads"

$form = New-Object System.Windows.Forms.Form
$form.Text = "Tools4All Local Video Downloader"
$form.Size = New-Object System.Drawing.Size(720, 500)
$form.StartPosition = "CenterScreen"
$form.MinimumSize = New-Object System.Drawing.Size(650, 430)
$form.Font = New-Object System.Drawing.Font("Segoe UI", 10)

$title = New-Object System.Windows.Forms.Label
$title.Text = "Download permitted YouTube videos locally"
$title.Font = New-Object System.Drawing.Font("Segoe UI Semibold", 16)
$title.AutoSize = $true
$title.Location = New-Object System.Drawing.Point(24, 20)
$form.Controls.Add($title)

$subtitle = New-Object System.Windows.Forms.Label
$subtitle.Text = "This companion uses your own internet connection instead of the website server."
$subtitle.AutoSize = $true
$subtitle.ForeColor = [System.Drawing.Color]::DimGray
$subtitle.Location = New-Object System.Drawing.Point(27, 58)
$form.Controls.Add($subtitle)

$urlLabel = New-Object System.Windows.Forms.Label
$urlLabel.Text = "YouTube video or Shorts URL"
$urlLabel.AutoSize = $true
$urlLabel.Location = New-Object System.Drawing.Point(27, 98)
$form.Controls.Add($urlLabel)

$urlBox = New-Object System.Windows.Forms.TextBox
$urlBox.Location = New-Object System.Drawing.Point(30, 124)
$urlBox.Size = New-Object System.Drawing.Size(640, 30)
$urlBox.Anchor = "Top,Left,Right"
$form.Controls.Add($urlBox)

$folderLabel = New-Object System.Windows.Forms.Label
$folderLabel.Text = "Save folder"
$folderLabel.AutoSize = $true
$folderLabel.Location = New-Object System.Drawing.Point(27, 170)
$form.Controls.Add($folderLabel)

$folderBox = New-Object System.Windows.Forms.TextBox
$folderBox.Text = $defaultDownloadPath
$folderBox.Location = New-Object System.Drawing.Point(30, 196)
$folderBox.Size = New-Object System.Drawing.Size(530, 30)
$folderBox.Anchor = "Top,Left,Right"
$form.Controls.Add($folderBox)

$browseButton = New-Object System.Windows.Forms.Button
$browseButton.Text = "Browse..."
$browseButton.Location = New-Object System.Drawing.Point(570, 194)
$browseButton.Size = New-Object System.Drawing.Size(100, 34)
$browseButton.Anchor = "Top,Right"
$form.Controls.Add($browseButton)

$permissionBox = New-Object System.Windows.Forms.CheckBox
$permissionBox.Text = "I own this video or have permission to save it for offline use."
$permissionBox.AutoSize = $true
$permissionBox.Location = New-Object System.Drawing.Point(30, 246)
$form.Controls.Add($permissionBox)

$downloadButton = New-Object System.Windows.Forms.Button
$downloadButton.Text = "Download MP4"
$downloadButton.Font = New-Object System.Drawing.Font("Segoe UI Semibold", 10)
$downloadButton.Location = New-Object System.Drawing.Point(30, 286)
$downloadButton.Size = New-Object System.Drawing.Size(160, 42)
$downloadButton.BackColor = [System.Drawing.Color]::FromArgb(79, 70, 229)
$downloadButton.ForeColor = [System.Drawing.Color]::White
$downloadButton.FlatStyle = "Flat"
$form.Controls.Add($downloadButton)

$statusLabel = New-Object System.Windows.Forms.Label
$statusLabel.Text = "Ready"
$statusLabel.AutoSize = $true
$statusLabel.Location = New-Object System.Drawing.Point(210, 297)
$form.Controls.Add($statusLabel)

$progressBar = New-Object System.Windows.Forms.ProgressBar
$progressBar.Location = New-Object System.Drawing.Point(30, 345)
$progressBar.Size = New-Object System.Drawing.Size(640, 22)
$progressBar.Anchor = "Top,Left,Right"
$form.Controls.Add($progressBar)

$logBox = New-Object System.Windows.Forms.TextBox
$logBox.Location = New-Object System.Drawing.Point(30, 382)
$logBox.Size = New-Object System.Drawing.Size(640, 55)
$logBox.Anchor = "Top,Bottom,Left,Right"
$logBox.Multiline = $true
$logBox.ReadOnly = $true
$logBox.ScrollBars = "Vertical"
$form.Controls.Add($logBox)

function Add-LogLine([string]$line) {
    if ([string]::IsNullOrWhiteSpace($line)) { return }
    if ($form.IsHandleCreated) {
        $form.BeginInvoke([Action]{
            $logBox.AppendText($line + [Environment]::NewLine)
            if ($line -match '(\d{1,3}(?:\.\d+)?)%') {
                $percent = [Math]::Min(100, [Math]::Max(0, [int][double]$matches[1]))
                $progressBar.Value = $percent
                $statusLabel.Text = "Downloading... $percent%"
            }
        }) | Out-Null
    }
}

$browseButton.Add_Click({
    $dialog = New-Object System.Windows.Forms.FolderBrowserDialog
    $dialog.Description = "Choose where the MP4 should be saved"
    $dialog.SelectedPath = $folderBox.Text
    if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
        $folderBox.Text = $dialog.SelectedPath
    }
})

$downloadButton.Add_Click({
    $url = $urlBox.Text.Trim()
    $outputFolder = $folderBox.Text.Trim()

    if (-not (Test-Path -LiteralPath $downloaderPath)) {
        [System.Windows.Forms.MessageBox]::Show("yt-dlp.exe is missing. Extract every file from the ZIP before running the companion.", "Missing component", "OK", "Error") | Out-Null
        return
    }
    if (-not (Test-Path -LiteralPath $denoPath)) {
        [System.Windows.Forms.MessageBox]::Show("deno.exe is missing. Extract every file from the ZIP before running the companion.", "Missing component", "OK", "Error") | Out-Null
        return
    }
    if ($url -notmatch '^https://(www\.)?(youtube\.com|youtu\.be)/') {
        [System.Windows.Forms.MessageBox]::Show("Paste a valid HTTPS YouTube or youtu.be URL.", "Invalid URL", "OK", "Warning") | Out-Null
        return
    }
    if (-not $permissionBox.Checked) {
        [System.Windows.Forms.MessageBox]::Show("Confirm that you own the video or have permission to save it.", "Permission required", "OK", "Information") | Out-Null
        return
    }
    if (-not (Test-Path -LiteralPath $outputFolder -PathType Container)) {
        [System.Windows.Forms.MessageBox]::Show("Choose an existing folder.", "Invalid folder", "OK", "Warning") | Out-Null
        return
    }

    $downloadButton.Enabled = $false
    $browseButton.Enabled = $false
    $urlBox.Enabled = $false
    $progressBar.Value = 0
    $logBox.Clear()
    $statusLabel.Text = "Starting..."

    $outputTemplate = Join-Path $outputFolder "%(title)s [%(id)s].%(ext)s"
    $escapedOutput = '"' + $outputTemplate.Replace('"', '\"') + '"'
    $escapedUrl = '"' + $url.Replace('"', '\"') + '"'
    $escapedDenoRuntime = '"' + ("deno:" + $denoPath).Replace('"', '\"') + '"'

    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = $downloaderPath
    $startInfo.Arguments = "--js-runtimes $escapedDenoRuntime --extractor-args `"youtube:player_client=android`" --no-playlist --windows-filenames --newline --progress -f `"18/best[ext=mp4][vcodec!=none][acodec!=none]/best`" -o $escapedOutput $escapedUrl"
    $startInfo.WorkingDirectory = $scriptRoot
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $startInfo
    $process.EnableRaisingEvents = $true
    $process.add_OutputDataReceived({ param($sender, $event) Add-LogLine $event.Data })
    $process.add_ErrorDataReceived({ param($sender, $event) Add-LogLine $event.Data })
    $process.add_Exited({
        $exitCode = $process.ExitCode
        $form.BeginInvoke([Action]{
            $downloadButton.Enabled = $true
            $browseButton.Enabled = $true
            $urlBox.Enabled = $true
            if ($exitCode -eq 0) {
                $progressBar.Value = 100
                $statusLabel.Text = "Download complete"
                [System.Windows.Forms.MessageBox]::Show("The MP4 was saved successfully.", "Download complete", "OK", "Information") | Out-Null
            } else {
                $statusLabel.Text = "Download failed - review the details below"
            }
        }) | Out-Null
    })

    try {
        $process.Start() | Out-Null
        $process.BeginOutputReadLine()
        $process.BeginErrorReadLine()
    } catch {
        $downloadButton.Enabled = $true
        $browseButton.Enabled = $true
        $urlBox.Enabled = $true
        $statusLabel.Text = "Could not start downloader"
        Add-LogLine $_.Exception.Message
    }
})

[void]$form.ShowDialog()
