import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { createServer } from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright-core'

const here = path.dirname(fileURLToPath(import.meta.url))
const fixtureUrl = pathToFileURL(path.join(here, 'fixture.html')).href
const artifactDir = path.join(here, 'artifacts')
mkdirSync(artifactDir, { recursive: true })

function findBrowser() {
  const candidates = [
    process.env.EDGE_PATH,
    process.env.CHROME_PATH,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ].filter(Boolean)
  const found = candidates.find(candidate => existsSync(candidate))
  if (found === undefined) throw new Error('No Edge/Chrome found; set EDGE_PATH or CHROME_PATH')
  return found
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function freePort() {
  const server = createServer()
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port
  await new Promise(resolve => server.close(resolve))
  return port
}

async function launchBrowser() {
  const executable = findBrowser()
  const userDataDir = mkdtempSync(path.join(os.tmpdir(), 'dsh-info-check-e2e-'))
  const port = await freePort()
  const endpoint = `http://127.0.0.1:${port}`
  const child = spawn(executable, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-extensions',
    '--disable-background-networking',
    '--no-first-run',
    '--no-default-browser-check',
    '--allow-file-access-from-files',
    `--remote-debugging-address=127.0.0.1`,
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    'about:blank',
  ], { stdio: 'ignore', windowsHide: true })

  let version = null
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${endpoint}/json/version`)
      if (response.ok) {
        version = await response.json()
        break
      }
    } catch {
      // Browser is still starting.
    }
    await delay(200)
  }
  if (version === null) {
    child.kill()
    throw new Error(`Edge did not expose CDP on ${endpoint}`)
  }
  const browser = await chromium.connectOverCDP(endpoint)
  const context = browser.contexts()[0]
  if (context === undefined) throw new Error('No browser context from CDP')
  const page = await context.newPage()
  return { browser, child, page, userDataDir }
}

function latestAnswer() {
  return page.evaluate(() => window.__TEST.answers.at(-1))
}

const launched = await launchBrowser()
const browser = launched.browser
const page = launched.page
await page.setViewportSize({ width: 1280, height: 900 })
page.setDefaultTimeout(10000)
const pageErrors = []
page.on('pageerror', error => pageErrors.push(error.message))

try {
  await page.goto(fixtureUrl)
  await page.waitForFunction(() => window.__TEST?.ready === true)

  // Intent card: independent number badges, one box per point, no number in text.
  await page.evaluate(() => window.__E2E.renderIntent())
  await page.waitForSelector('.ic-card')
  const pointCount = await page.locator('.ic-point-box').count()
  assert(pointCount >= 5, `expected at least 5 intent point boxes, got ${pointCount}`)
  const numbers = await page.locator('.ic-point-no').allTextContents()
  const sectionNumbers = await page.locator('.ic-sec').evaluateAll(sections => sections.map(section =>
    [...section.querySelectorAll('.ic-point-no')].map(node => node.textContent.trim())))
  for (const values of sectionNumbers) {
    assert.deepEqual(values, values.map((_, index) => String(index + 1)))
  }
  assert(numbers.includes('1'))
  const firstValue = await page.locator('.ic-point-box').first().inputValue()
  assert(!/^\d+[.)]\s/.test(firstValue), 'point text must not include a numeric prefix')

  // Auto-growing point box: content height, not a fixed short box.
  const firstBox = page.locator('.ic-point-box').first()
  await firstBox.fill('自动高度测试 '.repeat(12))
  await page.waitForTimeout(100)
  const boxMetrics = await firstBox.evaluate(node => ({
    height: node.getBoundingClientRect().height,
    scrollHeight: node.scrollHeight,
    clientHeight: node.clientHeight,
  }))
  assert(boxMetrics.height > 80, 'long text should make the point box taller')
  assert(boxMetrics.scrollHeight <= boxMetrics.clientHeight + 2, 'point box should not scroll internally')

  // Add/remove a point; numbering is owned by the number badges.
  const beforeAdd = await page.locator('.ic-point-box').count()
  await page.locator('.ic-point-add').first().click()
  await page.waitForFunction(n => document.querySelectorAll('.ic-point-box').length === n + 1, beforeAdd)
  await page.locator('.ic-point-remove').last().click()
  await page.waitForFunction(n => document.querySelectorAll('.ic-point-box').length === n, beforeAdd)

  // Right-edge resize: width must stay at or below height; double-click resets.
  const modal = page.locator('.ic-modal')
  const beforeBox = await modal.boundingBox()
  const handle = page.locator('.ic-resize')
  const handleBox = await handle.boundingBox()
  await page.mouse.move(handleBox.x + 5, handleBox.y + 20)
  await page.mouse.down()
  await page.mouse.move(handleBox.x + 360, handleBox.y + 20, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(120)
  const resizedBox = await modal.boundingBox()
  assert(resizedBox.width > beforeBox.width, 'drag should widen the dialog')
  assert(resizedBox.width <= resizedBox.height + 2, 'width must not exceed dialog height')
  await handle.dblclick()
  await page.waitForTimeout(120)
  const resetBox = await modal.boundingBox()
  assert(resetBox.width <= beforeBox.width + 1, 'double-click should reset the width')

  // The 3 detail questions must all render; the note must reach the answer payload.
  await page.locator('.ic-task').click()
  await page.getByRole('button', { name: '下一步' }).click()
  await page.waitForFunction(() => document.querySelectorAll('.ic-qgroup').length === 3)
  assert.equal(await page.locator('.ic-qgroup').count(), 3)

  // Single-select toggles off on the second click; a custom "other" answer is sent.
  const firstOption = page.locator('.ic-qgroup').first().locator('.ic-opt').first()
  await firstOption.click()
  assert.equal(await firstOption.getAttribute('aria-pressed'), 'true')
  await firstOption.click()
  assert.equal(await firstOption.getAttribute('aria-pressed'), 'false')
  await firstOption.click()
  await page.locator('.ic-other-input').nth(1).fill('E2E 自定义答案')

  await page.locator('.ic-notes textarea').fill('E2E 需求备注')
  await page.getByRole('button', { name: '提交确认' }).click()
  await page.waitForFunction(() => window.__TEST.answers.length === 1)
  const intentAnswer = await latestAnswer()
  assert.equal(intentAnswer.answers.length, 4)
  assert.match(intentAnswer.answers[0].custom, /E2E 需求备注/)
  assert(intentAnswer.answers[1].selected.includes('四道闸门（推荐）'))
  assert.equal(intentAnswer.answers[2].custom, 'E2E 自定义答案')
  await page.screenshot({ path: path.join(artifactDir, 'intent.png'), fullPage: false })

  // Plan card: notes + point boxes.
  await page.evaluate(() => window.__E2E.renderMilestone())
  await page.waitForSelector('.ic-card')
  assert((await page.locator('.ic-point-box').count()) >= 3)
  await page.locator('.ic-notes textarea').fill('E2E 方案备注')
  await page.locator('.ic-task').click()
  await page.getByRole('button', { name: '按此方案执行' }).click()
  await page.waitForFunction(() => window.__TEST.answers.length === 1)
  const planAnswer = await latestAnswer()
  assert.match(planAnswer.answers[0].custom, /E2E 方案备注/)

  // Acceptance report: read-only point boxes, notes, timer stop.
  await page.evaluate(() => window.__E2E.renderAccept())
  await page.waitForSelector('.ic-card')
  assert.equal(await page.locator('.ic-point-box').count(), 0)
  assert((await page.locator('.ic-point-text').count()) >= 4)
  assert.equal(await page.locator('.ic-file-link').count(), 2)
  await page.locator('.ic-file-link').first().click()
  await page.waitForFunction(() => window.__TEST.commands.length === 1)
  const fileCommand = await page.evaluate(() => window.__TEST.commands[0])
  assert.equal(fileCommand.sessionId, 'e2e-session')
  assert.match(fileCommand.command, /^\/dsh-info-check open D:\\work\\index\.js$/)
  await page.locator('.ic-timer-stop').click()
  await page.waitForFunction(() => window.__TEST.takeTime >= 1)
  await page.locator('.ic-notes textarea').fill('E2E 验收备注')
  await page.locator('.ic-task').click()
  await page.getByRole('button', { name: '验收通过' }).click()
  await page.waitForFunction(() => window.__TEST.answers.length === 1)
  const acceptAnswer = await latestAnswer()
  assert.equal(acceptAnswer.answers[0].custom, 'E2E 验收备注')
  await page.screenshot({ path: path.join(artifactDir, 'acceptance.png'), fullPage: false })

  // Rework reason dialog.
  await page.evaluate(() => window.__E2E.renderAccept())
  await page.waitForSelector('.ic-card')
  await page.locator('.ic-task').click()
  await page.getByRole('button', { name: '需要返工' }).click()
  await page.waitForSelector('.ic-backdrop-top')
  await page.locator('.ic-backdrop-top textarea').fill('E2E 返工理由')
  await page.getByRole('button', { name: '提交返修说明' }).click()
  await page.waitForFunction(() => window.__TEST.answers.length === 1)
  const reworkAnswer = await latestAnswer()
  assert(reworkAnswer.answers[0].selected.includes('需要返工'))
  assert.equal(reworkAnswer.answers[0].custom, 'E2E 返工理由')

  // Pause task: no checkbox required; notes travel with the paused decision.
  await page.evaluate(() => window.__E2E.renderAccept())
  await page.waitForSelector('.ic-card')
  await page.locator('.ic-notes textarea').fill('E2E 暂停备注')
  await page.getByRole('button', { name: '暂停任务' }).click()
  await page.waitForFunction(() => window.__TEST.answers.length === 1)
  const pauseAnswer = await latestAnswer()
  assert(pauseAnswer.answers[0].selected.includes('暂停任务'))
  assert.equal(pauseAnswer.answers[0].custom, 'E2E 暂停备注')

  // Delivery report: read-only + notes.
  await page.evaluate(() => window.__E2E.renderDelivery())
  await page.waitForSelector('.ic-card')
  assert.equal(await page.locator('.ic-point-box').count(), 0)
  assert((await page.locator('.ic-point-text').count()) >= 4)
  await page.locator('.ic-notes textarea').fill('E2E 交付备注')
  await page.locator('.ic-task').click()
  await page.getByRole('button', { name: '确认并交付' }).click()
  await page.waitForFunction(() => window.__TEST.answers.length === 1)
  const deliveryAnswer = await latestAnswer()
  assert.equal(deliveryAnswer.answers[0].custom, 'E2E 交付备注')

  assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join(' | ')}`)
  console.log('dsh-info-check browser E2E: ok')
} finally {
  try { await browser.close() } catch { /* already closed */ }
  try { launched.child.kill() } catch { /* already exited */ }
  await delay(300)
  try { rmSync(launched.userDataDir, { recursive: true, force: true }) } catch { /* profile may still be locked */ }
}
