import { spawn } from 'node:child_process'

/**
 * Show a Windows tray-balloon reminder in the bottom-right corner.
 *
 * This intentionally uses Windows PowerShell + WinForms rather than a Toast
 * AUMID registration: it works without installing a shortcut or a package,
 * and it matches the "other desktop apps" reminder style the user asked for.
 */
export function notifyDialog(title, message = '') {
  if (process.platform !== 'win32') return
  const clean = (value, max) => String(value ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
  const safeTitle = clean(title, 80) || 'dsh-info-check'
  const safeMessage = clean(message, 280) || '有一个确认卡在等待你处理。'
  const quote = value => `'${value.replaceAll("'", "''")}'`
  const script = [
    'Add-Type -AssemblyName System.Windows.Forms',
    'Add-Type -AssemblyName System.Drawing',
    '$n = New-Object System.Windows.Forms.NotifyIcon',
    '$n.Icon = [System.Drawing.SystemIcons]::Information',
    '$n.Text = "DeepSeek Harness"',
    `$n.BalloonTipTitle = ${quote(safeTitle)}`,
    `$n.BalloonTipText = ${quote(safeMessage)}`,
    '$n.Visible = $true',
    '$n.ShowBalloonTip(8000)',
    'Start-Sleep -Seconds 9',
    '$n.Dispose()',
  ].join('\r\n')
  try {
    const encoded = Buffer.from(script, 'utf16le').toString('base64')
    const child = spawn('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-WindowStyle', 'Hidden',
      '-EncodedCommand', encoded,
    ], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    })
    child.unref()
  } catch {
    // A missing desktop session or blocked PowerShell must never block a card.
  }
}
