import fs from 'fs';
import path from 'path';
import os from 'os';
import http from 'http';
import https from 'https';
import { fileURLToPath } from 'url';
import { getInstalledPrinters, printDocumentToWindows, printTestPage } from './windows_printer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const configPath = path.join(rootDir, 'config.json');
const tempDir = path.join(rootDir, 'temp');
const logsDir = path.join(rootDir, 'logs');

if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

function log(msg, ...args) {
  const ts = new Date().toLocaleTimeString();
  const line = `[${ts}] ${msg}`;
  console.log(line, ...args);
  try {
    fs.appendFileSync(path.join(logsDir, 'connector.log'), line + ' ' + (args.length ? JSON.stringify(args) : '') + '\n');
  } catch {}
}

function loadConfig() {
  const defaultConfig = {
    serverUrl: process.env.SMART_XEROX_SERVER_URL || 'https://xerox-oys6.onrender.com',
    connectorToken: null,
    pairedShopId: null,
    pairedShopName: null,
    heartbeatIntervalMs: 15000,
    pollIntervalMs: 4000,
  };

  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), 'utf8');
    return defaultConfig;
  }

  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    return { ...defaultConfig, ...JSON.parse(raw) };
  } catch {
    return defaultConfig;
  }
}

function saveConfig(cfg) {
  fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), 'utf8');
}

/**
 * Minimal HTTP/HTTPS request helper without external dependencies
 */
function request(urlStr, options = {}, postData = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(urlStr);
    const lib = parsedUrl.protocol === 'https:' ? https : http;

    const reqOpts = {
      protocol: parsedUrl.protocol,
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: options.timeout || 15000,
    };

    const req = lib.request(reqOpts, (res) => {
      const chunks = [];
      res.on('data', (d) => chunks.push(d));
      res.on('end', () => {
        const bodyBuffer = Buffer.concat(chunks);
        const contentType = res.headers['content-type'] || '';
        let body = bodyBuffer;
        if (contentType.includes('application/json')) {
          try {
            body = JSON.parse(bodyBuffer.toString('utf8'));
          } catch {}
        }
        resolve({
          statusCode: res.statusCode || 200,
          headers: res.headers,
          body,
          rawBuffer: bodyBuffer,
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out.'));
    });

    if (postData) {
      if (typeof postData === 'string' || Buffer.isBuffer(postData)) {
        req.write(postData);
      } else {
        req.write(JSON.stringify(postData));
      }
    }

    req.end();
  });
}

/**
 * Download file helper that writes to a local file stream
 */
function downloadFile(urlStr, targetPath) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(urlStr);
    const lib = parsedUrl.protocol === 'https:' ? https : http;

    const fileStream = fs.createWriteStream(targetPath);
    const req = lib.get(urlStr, (res) => {
      if (res.statusCode !== 200) {
        fileStream.close();
        if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
        return reject(new Error(`Download failed with status ${res.statusCode}`));
      }
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        resolve(targetPath);
      });
    });

    req.on('error', (err) => {
      fileStream.close();
      if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
      reject(err);
    });
  });
}

/**
 * Pairs the connector with a shop using the 6-digit code.
 */
async function pair(pairingCode) {
  const config = loadConfig();
  log(`Initiating pairing with Smart Xerox server: ${config.serverUrl}`);
  log(`Using pairing code: ${pairingCode}`);

  const postBody = {
    pairingCode: pairingCode.trim(),
    deviceName: os.hostname(),
    osInfo: `${os.type()} ${os.release()} (${os.arch()})`,
  };

  try {
    const res = await request(`${config.serverUrl}/api/printers/connector/pair`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, postBody);

    if (res.statusCode !== 200) {
      const errMsg = res.body?.error || `Pairing failed with status ${res.statusCode}`;
      console.error(`\n❌ Pairing Error: ${errMsg}`);
      process.exit(1);
    }

    const { connectorToken, shop } = res.body;
    config.connectorToken = connectorToken;
    config.pairedShopId = shop.id;
    config.pairedShopName = shop.name;
    saveConfig(config);

    console.log('\n======================================================');
    console.log('✅ PAIRING SUCCESSFUL!');
    console.log(`Paired with Shop: "${shop.name}"`);
    console.log(`Device ID:        ${os.hostname()}`);
    console.log('Credentials securely saved to config.json');
    console.log('======================================================\n');
  } catch (err) {
    console.error(`\n❌ Network Connection Error: ${err.message}`);
    process.exit(1);
  }
}

/**
 * Main loop: periodic heartbeat & job processing
 */
async function startConnector() {
  const config = loadConfig();

  if (!config.connectorToken) {
    console.log('\n======================================================');
    console.log('⚠️  SMART XEROX DESKTOP CONNECTOR IS NOT PAIRED');
    console.log('======================================================');
    console.log('To connect this computer to your shop:');
    console.log('1. Open your Owner Dashboard -> Printer Setup in your browser.');
    console.log('2. Click "Pair Windows PC" to generate a 6-digit pairing code.');
    console.log('3. Run this connector with: node src/connector.js --pair <6-digit-code>');
    console.log('   or double-click "install.bat" and enter the code.');
    console.log('======================================================\n');
    return;
  }

  console.log('\n======================================================');
  console.log('🖨️  SMART XEROX WINDOWS DIRECT PRINT CONNECTOR');
  console.log('======================================================');
  console.log(`Server URL:   ${config.serverUrl}`);
  console.log(`Shop:         ${config.pairedShopName || 'Local Shop'}`);
  console.log(`Status:       ACTIVE & MONITORING PRINT QUEUE`);
  console.log('Press Ctrl+C to stop.');
  console.log('======================================================\n');

  let isHeartbeatRunning = false;
  let isJobPollingRunning = false;

  // 1. Heartbeat Routine
  async function runHeartbeat() {
    if (isHeartbeatRunning) return;
    isHeartbeatRunning = true;
    try {
      const printers = await getInstalledPrinters();
      const res = await request(`${config.serverUrl}/api/printers/connector/heartbeat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.connectorToken}`,
        },
      }, { printers });

      if (res.statusCode === 200) {
        log(`Heartbeat synced. Discovered ${printers.length} local Windows printer(s).`);
      } else if (res.statusCode === 401) {
        log('⚠️ Connector credential was revoked by shop owner. Please re-pair.');
      }
    } catch (err) {
      log(`Heartbeat network warning: ${err.message}`);
    } finally {
      isHeartbeatRunning = false;
    }
  }

  // 2. Poll & Process Jobs Routine
  async function runJobPoll() {
    if (isJobPollingRunning) return;
    isJobPollingRunning = true;
    try {
      const res = await request(`${config.serverUrl}/api/printers/connector/jobs`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.connectorToken}`,
        },
      });

      if (res.statusCode === 200 && Array.isArray(res.body?.jobs)) {
        for (const job of res.body.jobs) {
          log(`>>> Processing Print Job ${job.jobId} (Order #${job.orderReference}) for "${job.printerName}"...`);
          const tempJobFile = path.join(tempDir, `print_job_${job.jobId}.pdf`);

          try {
            // Download authorized document
            const downloadFullUrl = `${config.serverUrl}${job.downloadUrl}`;
            await downloadFile(downloadFullUrl, tempJobFile);
            log(`Downloaded authorized document securely: ${path.basename(tempJobFile)} (${fs.statSync(tempJobFile).size} bytes)`);

            // Submit to Windows Spooler
            const printResult = await printDocumentToWindows(tempJobFile, job.printerName, {
              copies: job.copies,
              isDuplex: job.isDuplex,
            });

            log(`Spooler Accepted: ${printResult.message}`);

            // Report success
            await request(`${config.serverUrl}/api/printers/connector/jobs/${job.jobId}/status`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.connectorToken}`,
              },
            }, {
              status: 'SUBMITTED',
              spoolerJobId: printResult.spoolerJobId,
            });

          } catch (err) {
            log(`❌ Print Job ${job.jobId} Failed: ${err.message}`);
            // Report failure truthfully
            try {
              await request(`${config.serverUrl}/api/printers/connector/jobs/${job.jobId}/status`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${config.connectorToken}`,
                },
              }, {
                status: 'FAILED',
                errorMessage: err.message,
              });
            } catch {}
          } finally {
            // Immediate privacy cleanup: delete downloaded document
            try {
              if (fs.existsSync(tempJobFile)) {
                fs.unlinkSync(tempJobFile);
                log(`Temporary file shredded for privacy: ${path.basename(tempJobFile)}`);
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      // Quiet poll failures
    } finally {
      isJobPollingRunning = false;
    }
  }

  // Initial runs
  await runHeartbeat();
  await runJobPoll();

  // Intervals
  setInterval(runHeartbeat, config.heartbeatIntervalMs);
  setInterval(runJobPoll, config.pollIntervalMs);
}

// CLI Argument Routing
const args = process.argv.slice(2);
if (args[0] === '--pair') {
  const code = args[1];
  if (!code) {
    console.error('Please specify a 6-digit pairing code: node src/connector.js --pair <code-here>');
    process.exit(1);
  }
  pair(code);
} else if (args[0] === '--test-print') {
  const printer = args[1] || 'Microsoft Print to PDF';
  console.log(`Printing test page to "${printer}"...`);
  printTestPage(tempDir, printer, { name: 'Smart Xerox Local Shop' }).then((res) => {
    console.log('Result:', res);
  }).catch((err) => {
    console.error('Test print failed:', err);
  });
} else {
  startConnector();
}
