
  // ===== CONFIG =====
  // Use EITHER your /exec URL OR the long googleusercontent URL (post-redirect).
  const API_BASE = 'https://script.google.com/macros/s/AKfycbyPzgfbQeVfySIxARJiLc_QzIEkw-QAvpcvitXcdyZAF7CdY6uIJEzR9cA16jlBkHelVA/exec';

  // Build a URL safely whether API_BASE already has query params or not.
  function buildUrl(id){
    const hasQuery = API_BASE.includes('?');
    const sep = hasQuery ? '&' : '?';
    return `${API_BASE}${sep}id=${encodeURIComponent(id)}`;
  }

  // Accept /CWB-001, ?id=CWB-001, and #/CWB-001 for local-file testing.
  function parseIdFromPath(){
    const qp = new URLSearchParams(location.search).get('id');
    if (qp && /^CWB-\d{3}$/i.test(qp)) return qp.toUpperCase();

    const h = (location.hash || '').replace(/^#\/?/, '').trim();
    if (h && /^CWB-\d{3}$/i.test(h)) return h.toUpperCase();

    const segs = (location.pathname || '/').split('/').filter(Boolean);
    const last = segs[segs.length - 1] || '';
    if (/^CWB-\d{3}$/i.test(last)) return last.toUpperCase();

    return '';
  }

  function renderFound(r){
    const isActive = String(r.Status).toLowerCase() === 'active';
    const statusClass = isActive ? 'status-ok' : 'status-bad';
    const statusIcon = isActive ? '✅' : '⚠️';
    document.getElementById('content').innerHTML = `
      <div class="row">
        <span class="label">Verified ID</span>
        <span class="value">${r.Full_Name}<div class="verification-badge">${r.CWB_ID}</div></span>
      </div>
      <div class="row">
        <span class="label">Role</span>
        <span class="value">Authorized Crowbar Sales Specialist</span>
      </div>
      <div class="row">
        <span class="label">Company</span>
        <span class="value">Crowbar Ltd, a Crowbar Ventures company</span>
      </div>
      <div class="row">
        <span class="label">Status</span>
        <span class="value ${statusClass}">${statusIcon} ${r.Status}</span>
      </div>
      <div class="row">
        <span class="label">Issued</span>
        <span class="value">${r.Issued_Date || '-'}</span>
      </div>
      <div class="row">
        <span class="label">Support</span>
        <span class="value">
          <a href="mailto:verification@crowbarltd.com" class="contact-link">
            verification@crowbarltd.com
          </a>
        </span>
      </div>
    `;
  }

  function renderNotFound(){
    document.getElementById('content').innerHTML = `
      <div class="error">
        ❌ No record found. Please contact 
        <a href="mailto:verification@crowbarltd.com">verification@crowbarltd.com</a>.
      </div>
    `;
  }

  async function bootstrap(){
    const id = parseIdFromPath();
    if(!id){
      document.getElementById('content').innerHTML = `
        <div class="error">
          Please open a URL like <strong>/CWB-001</strong>, or add 
          <code>?id=CWB-001</code> (or <code>#/CWB-001</code>) for local testing.
        </div>
      `;
      return;
    }
    try{
      const url = buildUrl(id);
      const res = await fetch(url, { method:'GET' });

      // Read as text, then try to parse JSON (helps if API returns HTML on error)
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        if(json.ok && json.record){
          // Some deployments return record as a JSON string—normalize it:
          const rec = (typeof json.record === 'string') ? JSON.parse(json.record) : json.record;
          renderFound(rec);
        } else {
          renderNotFound();
        }
      } catch(parseErr){
        document.getElementById('content').innerHTML =
          `<div class="error">API error ${res.status}: ${text.slice(0,200)}</div>`;
        console.error('Non-JSON response', res.status, text);
      }
    } catch(err){
      document.getElementById('content').innerHTML =
        `<div class="error">Could not contact verification service. Please try again later.</div>`;
      console.error(err);
    }
  }

  bootstrap();
