```

> Put a small **`logo-crowbar.png`** in the same folder for the header logo (optional; it hides itself if missing).

---

## 3) Host & Routing (Vercel / Netlify / GitHub Pages)

Because we use path style like `/CWB-001`, configure a **SPA fallback** so every path serves `index.html`, and the script parses the path.

### Vercel

* Add `vercel.json` at project root:

```json
{ "rewrites": [ { "source": "/(.*)", "destination": "/index.html" } ] }
```

* In Vercel dashboard, add domain `verify.crowbarltd.com` to the project.

### Netlify

* Add a `_redirects` file at project root:

```
/*    /index.html   200
```

* Connect repo/folder to Netlify and deploy.

### GitHub Pages (less ideal for path routing)

* Serve at root and rely on `?id=CWB-001` pattern during testing, or add a 404.html redirect back to index (advanced).

---

## 4) DNS Setup for `verify.crowbarltd.com`

Ask the domain owner (Crowbar Ltd) to create a **CNAME** record:

* **Host/Name**: `verify`
* **Type**: CNAME
* **Value/Target**: your host target

  * Vercel: `cname.vercel-dns.com`
  * Netlify: `<yoursite>.netlify.app`
* TTL: default

Propagation may take a few minutes.

---

## 5) Branding Checklist

* Font: **Montserrat** (fallback **Arial**)
* Color: **Crowbar Gold `#C7A43F`** (already used as accent)
* Elements: Crowbar logo (small), text “Powered by Talentezee Global”, footer link to **[www.crowbarltd.com](http://www.crowbarltd.com)**

---

## 6) Quick Test Plan

1. **Happy Path (Active)**: `/CWB-001` shows name + ✅ Active + issued date.
2. **Inactive Case**: a row with `Status = Inactive` shows ⚠️ Inactive (red style).
3. **Not Found**: `/CWB-999` shows the ❌ message with the support email.
4. **CORS**: open DevTools → Network → the API request returns 200 + JSON.
5. **URL Fallback**: Visiting `/?id=CWB-001` also works (handy for GitHub Pages/local).

---

## 7) What to Send Back to the Client (for the 48‑hour prototype)

* Live URL examples:

  * `https://verify.crowbarltd.com/CWB-001`
  * `https://verify.crowbarltd.com/CWB-002`
* API URL (Apps Script Web App URL) used by the page.
* A screenshot of **Active**, **Inactive**, and **Not Found** states.
* The Sheet link in the shared Crowbar Workspace.

---

## 8) Optional Enhancements (later)

* Add a **QR code** on staff cards that points to `/CWB-###`.
* Rate‑limit or add a secret token in the Apps Script if you need basic abuse protection.
* Connect to CRM (replace Sheet with API or use Apps Script to sync).
* Add caching headers or CDN caching for API responses.

---

### Done. Paste your Apps Script URL into `API_BASE`, deploy to Vercel/Netlify with the rewrite, point the CNAME, and you’re live.


# Crowbar Verification Micro‑Site — End‑to‑End Guide (Code Included)

This doc gives you everything to go from zero to a live prototype at **[https://verify.crowbarltd.com/CWB-###](https://verify.crowbarltd.com/CWB-###)** in a few hours.

---

## 0) Google Sheet (Data Source)

Create a Google Sheet with **exact** headers in Row 1:

```
CWB_ID | Full_Name | Status | Issued_Date
```

Example rows:

```
CWB-001 | John Smith | Active  | 2025-11-04
CWB-002 | Jane Doe   | Active  | 2025-11-04
CWB-003 | Alex Kim   | Inactive| 2025-11-05
```

> Keep the sheet in the shared **Crowbar Workspace Drive**. You’ll paste its **Spreadsheet ID** into the Apps Script below. (Spreadsheet ID is the long ID in the sheet URL.)

---

## 1) Google Apps Script (Read‑only JSON API)

This script exposes the Sheet as a tiny read‑only JSON API, filtered by `CWB_ID`.

**Steps**

1. Open the Sheet → **Extensions → Apps Script**.
2. Create a new script file `api.gs` and paste the code below.
3. Replace `SPREADSHEET_ID_HERE` with your actual Google Sheet ID.
4. Click **Deploy → New deployment → Type: Web app**.

   * **Execute as:** Me (your account)
   * **Who has access:** Anyone with the link
   * Copy the **Web App URL** (we’ll use it in `index.html`).

**Code (`api.gs`)**

```javascript
const SHEET_ID = 'SPREADSHEET_ID_HERE';
const SHEET_NAME = 'Sheet1'; // change if your tab name differs

function doGet(e) {
  const id = (e.parameter.id || '').toUpperCase().trim();
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sh = ss.getSheetByName(SHEET_NAME);
  const values = sh.getDataRange().getValues();

  const headers = values[0];
  const dataRows = values.slice(1);

  let record = null;
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowObj = headers.reduce((o, h, idx) => {
      o[String(h).trim()] = row[idx];
      return o;
    }, {});
    if (String(rowObj['CWB_ID']).toUpperCase().trim() === id) {
      record = rowObj;
      break;
    }
  }

  const payload = record ? { ok: true, record } : { ok: false, error: 'NOT_FOUND' };
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
```

> **CORS**: Apps Script web apps allow cross‑origin fetches by default for public “Anyone with the link”. If your host blocks it, we can add a simple proxy later—usually not needed.

---

## 2) Static Site (Single‑file HTML + JS)

This file parses the `CWB-###` from the path and calls the API to render the card. It also handles “not found”.

Save as `index.html`:

