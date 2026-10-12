# SMART XEROX — SHOP INSTALLER & HANDOVER FIELD GUIDE

> **Target Audience:** Field installer visiting local Indian Xerox / Photocopy shops, and non-technical shop owners operating Windows 10/11 computers.

---

## 1. On-Site Installation Checklist (Installer Field Guide)

Follow this 12-step checklist during every shop deployment visit:

| Step | Task | Verification Command / Check |
|---|---|---|
| **1** | **Verify PC & OS** | Windows 10 or 11 (64-bit). Verify internet connectivity & browser (Chrome / Edge). |
| **2** | **Verify Printer Drivers** | Open **Windows Settings > Bluetooth & devices > Printers & scanners**. Verify USB or Wi-Fi printer is listed as *Ready* or *Idle*. |
| **3** | **Test Printer Outside App** | Open Notepad, type `Test`, and print to target shop printer (e.g. Epson L3150 / HP LaserJet). Confirm physical paper prints clearly. |
| **4** | **Launch Smart Xerox App** | Open browser to `http://localhost:5000/owner/login` (or shop domain). Log in with owner credentials. |
| **5** | **Launch Guided Setup Wizard** | Click **"Setup Wizard"** in sidebar navigation (`/owner/setup-wizard`) to configure the shop in 6 guided steps. |
| **6** | **Configure Shop Profile (Step 1 & 2)** | Enter Shop Name, Owner Name, Address, Landmark, PIN code, and upload/set Logo. |
| **7** | **Pair Windows Connector (Step 3)** | Click **"Pair Windows PC"** to generate 6-digit code. In folder `windows-connector`, double-click `install.bat` and enter code. |
| **8** | **Set Primary Shop Printer** | Select the default shop printer in the setup wizard list. Send a test page and verify paper feed. |
| **9** | **Configure Printing Prices (Step 4)** | Set A4 Black & White (e.g. ₹2/page), A4 Color (e.g. ₹10/page), Legal size, and Double-Sided discount. |
| **10** | **Generate & Print Counter QR Poster (Step 5)** | Click **"Print A4 Poster"** (`/owner/qr`). Print high-res counter poster with the shop's QR code. Place on customer counter. |
| **11** | **Test End-to-End Customer Order** | Scan counter QR code on smartphone. Upload sample PDF. Submit order without phone number. Confirm order appears in owner dashboard. |
| **12** | **Test Both Printing Modes** | Test **"Print Directly"** (Mode B via Windows Spooler) and **"Manual Print"** (Mode A fallback). |

---

## 2. Printing Modes: Direct Spooler vs. Manual Fallback

Smart Xerox provides two printing modes to ensure 100% uptime:

```
                          ┌──────────────────────────┐
                          │  Customer Scans Shop QR  │
                          │   & Uploads Document     │
                          └─────────────┬────────────┘
                                        │
                                        ▼
                          ┌──────────────────────────┐
                          │ Owner Dashboard (Review) │
                          └──────┬─────────────┬─────┘
                                 │             │
                [Print Directly] │             │ [Manual Print]
                                 ▼             ▼
                   ┌───────────────────┐  ┌───────────────────┐
                   │  Windows Spooler  │  │  Browser / System │
                   │ Desktop Connector │  │   Print Dialog    │
                   │     (Mode B)      │  │     (Mode A)      │
                   └─────────┬─────────┘  └─────────┬─────────┘
                             │                      │
                             ▼                      ▼
                   ┌──────────────────────────────────────────┐
                   │   Physical Shop Printer (Paper Output)   │
                   └──────────────────────────────────────────┘
```

### Mode B: Direct Windows Desktop Connector (`windows-connector/`)
- **How it works:** Standalone lightweight background service on the shop PC.
- **Benefits:** One-click direct printing from the web dashboard straight to Epson, HP, Canon, or Brother printers without opening extra dialogs.
- **Security:**
  - Authenticates via revocable 256-bit device token generated during 6-digit code pairing.
  - Downloads authorized documents using single-use, 15-minute job tokens.
  - Shreds and deletes local temporary files immediately after handing over to the Windows Spooler.
  - Zero arbitrary shell commands or remote execution allowed.

### Mode A: Simple Manual Printing (Universal Fallback)
- **Always Available:** Works on any browser or PC without installing any connector.
- **How it works:** Owner clicks **"Manual Print"** on any order card. The authorized document opens securely in a preview tab with the standard Windows print dialog (`Ctrl+P`).
- **Confirmation:** The owner clicks *"Mark Ready for Pickup"* after physical paper comes out.

---

## 3. Windows Connector Setup & Daily Operation

The connector is located in the `windows-connector` folder.

### Files in `windows-connector/`:
- `install.bat` — Interactive setup wizard (prompts for 6-digit code and configures auto-start on Windows boot).
- `start.bat` — Starts the direct printing daemon in background/minimized window.
- `test-print.bat` — Sends a test hardware page to verify driver and spooler outside the app.
- `uninstall.bat` — Removes auto-start shortcut and resets stored credentials.
- `config.json` — Stores paired shop identity and device token.
- `logs/connector.log` — Safe diagnostic log file (no customer personal info or document content).

### How to Pair:
1. On the Shop PC, open the dashboard at `http://localhost:5000/owner/printers`.
2. Click **"Pair Windows PC"**. A 6-digit code (e.g., `495868`) will appear on screen (valid for 10 minutes).
3. Run `install.bat` (or command: `node src/connector.js --pair 495868`).
4. Enter `Y` to automatically start the connector when Windows boots up.

---

## 4. Daily Owner Operations (Non-Technical Guide)

The shop owner needs **zero technical knowledge** to run the shop:

### Receiving a Customer Order:
1. Customer walks into the shop, scans the counter QR poster, and uploads their PDF or image.
2. An order card appears on your dashboard under **Live Order Processing Queue**.
3. Click the **Eye icon** to preview the customer's document.
4. Click **"Accept"**.

### Printing the Document:
- **Fastest (Direct Print):** Click the navy-blue **"Print Directly"** button. The document sends directly to your connected printer.
- **Manual Fallback:** If the printer gives a paper jam or offline warning, click **"Manual Print"**. The document opens in your browser print window. Press Print.

### Handover to Customer:
1. Once printed, click **"Mark Ready"**.
2. When the customer comes to collect their prints and pays, click **"Complete Job"**.

---

## 5. Troubleshooting Guide

| Issue | Root Cause | Solution |
|---|---|---|
| **Printer shows Offline in app** | USB cable loose, printer powered off, or paper tray empty. | 1. Check power cord and USB/Wi-Fi connection.<br>2. Check paper tray and ink/toner LEDs.<br>3. In Windows Settings > Printers, check if "Use Printer Offline" is checked. |
| **Direct print fails or gives error** | Windows Spooler service hung or file locked. | 1. Click **"Manual Print"** fallback button on the order card immediately so the customer does not wait.<br>2. Restart Windows Print Spooler (`services.msc` > Print Spooler > Restart). |
| **Connector says "Revoked" or "Unpaired"** | Pairing token was reset or shop was re-registered. | Go to **Printer Setup** in dashboard, click **"Pair Windows PC"**, and re-run `install.bat` with the new 6-digit code. |
| **Customer cannot scan QR code** | Printed poster is damaged or reflection on glass counter. | Re-print counter poster from **Counter QR Poster** (`/owner/qr`). Laminate or place poster under clear lighting. |
| **Unrecognized file format** | Customer uploaded unsupported file format. | Customer upload validator supports `.pdf`, `.jpg`, `.jpeg`, and `.png`. For Word documents (`.docx`), advise customer to export to PDF before uploading. |

---

## 6. Document Privacy & Retention Policy

- **No Phone Numbers:** Customers never need to provide personal phone numbers. Orders are identified by 8-character references (e.g., `#SX-7K9M-2026`).
- **Private Storage:** Customer uploads are stored in private server storage, never in public web folders.
- **Access Tokens:** Access to files requires short-lived cryptographic tokens. Guessing order references will never reveal files.
- **Automatic File Shredding:** The background retention worker automatically shreds and permanently deletes customer document files after the shop's retention period (default: 24 hours).
