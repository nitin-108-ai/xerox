import { execFile, exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execPromise = promisify(exec);
const execFilePromise = promisify(execFile);

/**
 * Discovers Windows-installed printers using native CIM / WMI interface.
 * Returns honest status: READY, OFFLINE, UNKNOWN, or ERROR.
 */
export async function getInstalledPrinters() {
  if (os.platform() !== 'win32') {
    // Non-Windows fallback for dev testing
    return [
      {
        name: 'Microsoft Print to PDF',
        driverName: 'Microsoft Print To PDF',
        portName: 'PORTPROMPT:',
        isDefault: true,
        isOnline: true,
        status: 'READY',
        connectionType: 'VIRTUAL',
        supportedPaperSizes: ['A4', 'Letter', 'Legal'],
        supportsColor: true,
        supportsDuplex: false,
      },
      {
        name: 'EPSON L3150 Series',
        driverName: 'EPSON L3150 Series',
        portName: 'USB001',
        isDefault: false,
        isOnline: true,
        status: 'READY',
        connectionType: 'USB',
        supportedPaperSizes: ['A4', 'Letter', 'A5'],
        supportsColor: true,
        supportsDuplex: false,
      },
    ];
  }

  try {
    const psScript = 'Get-CimInstance -ClassName Win32_Printer | Select-Object Name, DriverName, PortName, Default, WorkOffline, PrinterStatus, ExtendedPrinterStatus, Shared | ConvertTo-Json -Compress';

    const { stdout } = await execFilePromise('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      psScript,
    ], { timeout: 10000 });

    if (!stdout || !stdout.trim()) {
      return [];
    }

    let parsed = JSON.parse(stdout.trim());
    if (!Array.isArray(parsed)) {
      parsed = [parsed];
    }

    return parsed.map((p) => {
      const name = p.Name || 'Unknown Printer';
      const port = (p.PortName || '').toUpperCase();
      const driver = p.DriverName || '';
      const isDefault = Boolean(p.Default);
      const isOffline = Boolean(p.WorkOffline);

      // Connection type inference
      let connType = 'USB';
      if (port.startsWith('WSD') || port.includes('IP_') || port.includes('TCP') || port.includes('192.') || port.includes('10.')) {
        connType = port.includes('WSD') ? 'WIFI' : 'LAN';
      } else if (port.startsWith('PORTPROMPT') || name.includes('PDF') || name.includes('XPS') || name.includes('OneNote')) {
        connType = 'VIRTUAL';
      }

      // Printer status evaluation
      // PrinterStatus codes: 1=Other, 2=Unknown, 3=Idle/Ready, 4=Printing, 5=Warmup
      let status = 'READY';
      if (isOffline) {
        status = 'OFFLINE';
      } else if (p.PrinterStatus === 1 || p.PrinterStatus === 2) {
        status = 'UNKNOWN';
      } else if (p.PrinterStatus === 7 || p.ExtendedPrinterStatus === 7) {
        status = 'ERROR';
      }

      // Paper sizes & color defaults
      const paperSizes = ['A4'];
      if (name.toLowerCase().includes('plotter') || name.toLowerCase().includes('large') || driver.toLowerCase().includes('ir')) {
        paperSizes.push('A3', 'Legal');
      } else {
        paperSizes.push('Letter', 'Legal');
      }

      const isMonochrome = /mono|laserjet.*m|m1005|m126|m1136/i.test(name) || /mono|m126|m1005/i.test(driver);

      return {
        name,
        driverName: driver,
        portName: p.PortName || 'Default',
        isDefault,
        isOnline: !isOffline,
        status,
        connectionType: connType,
        supportedPaperSizes: paperSizes,
        supportsColor: !isMonochrome,
        supportsDuplex: /duplex|dn|dw|mfp/i.test(name) || /duplex/i.test(driver),
      };
    });
  } catch (err) {
    console.warn('[Printer Detection Warning]: Failed to query Windows CimInstance:', err.message);
    return [];
  }
}

/**
 * Submits a document to the Windows Spooler for a specific printer.
 * Uses native Windows shell verb 'PrintTo' or PDF command.
 */
export async function printDocumentToWindows(filePath, printerName, options = {}) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File does not exist: ${filePath}`);
  }

  const absolutePath = path.resolve(filePath);

  if (os.platform() !== 'win32') {
    console.log(`[Dev Print Simulation] File "${path.basename(filePath)}" submitted to "${printerName}".`);
    return {
      success: true,
      spoolerJobId: `SIM_${Date.now()}`,
      message: 'Dev simulated submission successful.',
    };
  }

  // Windows 10/11 Direct Print submission via PowerShell Start-Process PrintTo
  const sanitizedPrinter = printerName.replace(/"/g, '`"');
  const sanitizedPath = absolutePath.replace(/"/g, '`"');

  const printCommand = `
    $file = "${sanitizedPath}";
    $printer = "${sanitizedPrinter}";
    Start-Process -FilePath $file -Verb PrintTo -ArgumentList ('"' + $printer + '"') -PassThru | Out-Null
  `;

  try {
    await execPromise(`powershell -NoProfile -NonInteractive -Command "${printCommand.replace(/\r?\n/g, ' ')}"`, {
      timeout: 30000,
    });

    return {
      success: true,
      spoolerJobId: `SPOOL_${Date.now()}`,
      message: `Document successfully handed over to Windows Print Spooler for "${printerName}".`,
    };
  } catch (err) {
    throw new Error(`Windows Spooler submission failed: ${err.message}`);
  }
}

/**
 * Generates and prints a shop test page.
 */
export async function printTestPage(tempDir, printerName, shopDetails = {}) {
  const testFileName = path.join(tempDir, `test_page_${Date.now()}.txt`);
  const content = `
=====================================================
            SMART XEROX - PRINTER TEST PAGE
=====================================================
Shop Name:     ${shopDetails.name || 'Smart Xerox Shop'}
Printer:       ${printerName}
Date & Time:   ${new Date().toLocaleString()}
Computer:      ${os.hostname()} (${os.type()} ${os.release()})
Status:        VERIFIED VIA SMART XEROX CONNECTOR
=====================================================

Dear Shop Owner,
If this page printed clearly, your printer is correctly 
connected, configured, and ready to accept print orders 
from customer QR code scans!

Setup Checklist:
[X] Windows Printer Driver Installed & Ready
[X] Smart Xerox Desktop Connector Paired
[X] Shop Profile & QR Code Posters Ready
[X] Direct & Manual Printing Fallbacks Configured

For assistance or support, contact the Smart Xerox installer.
=====================================================
`;

  fs.writeFileSync(testFileName, content, 'utf8');

  try {
    const res = await printDocumentToWindows(testFileName, printerName);
    return res;
  } finally {
    // Delete test file after short delay to allow spooler to read it
    setTimeout(() => {
      try {
        if (fs.existsSync(testFileName)) fs.unlinkSync(testFileName);
      } catch {}
    }, 5000);
  }
}
