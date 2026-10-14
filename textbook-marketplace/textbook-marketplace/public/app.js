(function () {
  const app = document.getElementById('app');
  const nav = document.getElementById('nav');
  const CONDITIONS = ['New', 'Like New', 'Good', 'Fair', 'Poor'];

  const store = {
    get token() { try { return localStorage.getItem('token'); } catch { return null; } },
    set token(v) { try { v ? localStorage.setItem('token', v) : localStorage.removeItem('token'); } catch {} },
    get user() { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } },
    set user(v) { try { v ? localStorage.setItem('user', JSON.stringify(v)) : localStorage.removeItem('user'); } catch {} },
  };

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rand = (n) => 'R' + Number(n).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2800);
  }

  async function api(path, opts = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (store.token) headers.Authorization = 'Bearer ' + store.token;
    let r;
    try {
      r = await fetch('/api' + path, { method: opts.method || 'GET', headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
    } catch {
      throw new Error('Cannot reach the server. Check your connection and try again.');
    }
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      if (r.status === 401 && store.token) { store.token = null; store.user = null; renderNav(); }
      const err = new Error(data.error?.message || 'Request failed');
      err.status = r.status;
      throw err;
    }
    return data;
  }

  function renderNav() {
    const u = store.user;
    nav.innerHTML = u
      ? `<a class="btn" href="#/">Browse</a><a class="btn primary" href="#/new">Sell a book</a><a class="btn" href="#/mine">My listings</a><span class="meta">${esc(u.name)}</span><button id="logout">Log out</button>`
      : `<a class="btn" href="#/">Browse</a><a class="btn" href="#/login">Log in</a><a class="btn primary" href="#/register">Sign up</a>`;
    const lo = document.getElementById('logout');
    if (lo) lo.onclick = () => { store.token = null; store.user = null; renderNav(); location.hash = '#/'; toast('Logged out'); };
  }

  const needLogin = () => { toast('Please log in first'); location.hash = '#/login'; };

  // ---------- Browse ----------
  async function browse() {
    app.innerHTML = `
      <h1>Find your textbooks</h1>
      <form class="filters" id="f">
        <div><label for="s">Search by title</label><input id="s" placeholder="e.g. Programming"></div>
        <div><label for="c">Course code</label><input id="c" placeholder="CSE101"></div>
        <div><label for="d">Department</label><input id="d" placeholder="e.g. Engineering"></div>
        <button class="primary">Search</button>
      </form>
      <div id="list" class="grid"><p class="empty">Loading…</p></div>`;
    const load = async () => {
      const p = new URLSearchParams();
      const s = app.querySelector('#s').value.trim(), c = app.querySelector('#c').value.trim(), d = app.querySelector('#d').value.trim();
      if (s) p.set('search', s); if (c) p.set('courseCode', c); if (d) p.set('department', d);
      const list = app.querySelector('#list');
      try {
        const { books } = await api('/books?' + p);
        list.innerHTML = books.length ? books.map(card).join('') : '<p class="empty">No available books match. Try fewer filters.</p>';
      } catch (e) { list.innerHTML = `<p class="error">${esc(e.message)}</p>`; }
    };
    app.querySelector('#f').onsubmit = (e) => { e.preventDefault(); load(); };
    load();
  }

  function card(b) {
    return `<article class="card">
      <span class="pill ${esc(b.status)}">${esc(b.status)}</span>
      <h3>${esc(b.title)}</h3>
      <div class="meta">${esc(b.courseCode)} · ${esc(b.department)}</div>
      <div class="price">${rand(b.price)}</div>
      <div class="meta">Condition: ${esc(b.condition)}</div>
      <div class="row"><a class="btn" href="#/book/${b.id}">View details</a></div>
    </article>`;
  }

  // ---------- Details ----------
  async function details(id) {
    app.innerHTML = '<p class="empty">Loading…</p>';
    try {
      const b = await api('/books/' + id);
      app.innerHTML = `<div class="panel wide">
        <a href="#/">← Back</a>
        <h1>${esc(b.title)}</h1>
        <span class="pill ${esc(b.status)}">${esc(b.status)}</span>
        <p class="meta">${esc(b.courseCode)} · ${esc(b.department)}</p>
        <p class="price">${rand(b.price)}</p>
        <p>Condition: <strong>${esc(b.condition)}</strong></p>
        <div id="contact"></div>
        ${b.status === 'Available' ? '<button class="primary" id="cbtn">Contact seller</button>' : '<p class="meta">This book has been sold.</p>'}
      </div>`;
      const btn = app.querySelector('#cbtn');
      if (btn) btn.onclick = async () => {
        if (!store.token) return needLogin();
        btn.disabled = true;
        try {
          const c = await api(`/books/${id}/contact`);
          app.querySelector('#contact').innerHTML = `<div class="contact"><strong>${esc(c.sellerName)}</strong><br>${esc(c.sellerContact)}<div class="meta">Arrange payment and handover directly with the seller.</div></div>`;
          btn.remove();
        } catch (e) { toast(e.message); btn.disabled = false; }
      };
    } catch (e) { app.innerHTML = `<div class="panel"><p class="error">${esc(e.message)}</p><a href="#/">← Back</a></div>`; }
  }

  // ---------- Auth ----------
  function authForm(mode) {
    const reg = mode === 'register';
    app.innerHTML = `<div class="panel"><h1>${reg ? 'Create account' : 'Log in'}</h1>
      <form id="a" novalidate>
        ${reg ? '<div class="field"><label for="n">Name</label><input id="n" autocomplete="name" required></div>' : ''}
        <div class="field"><label for="e">Email</label><input id="e" type="email" autocomplete="email" required></div>
        ${reg ? '<div class="field"><label for="ph">Phone (optional)</label><input id="ph" type="tel" autocomplete="tel"></div>' : ''}
        <div class="field"><label for="p">Password${reg ? ' (8+ characters)' : ''}</label><input id="p" type="password" autocomplete="${reg ? 'new-password' : 'current-password'}" required></div>
        <div id="err" class="error"></div>
        <button class="primary">${reg ? 'Sign up' : 'Log in'}</button>
      </form>
      <p class="meta">${reg ? 'Already have an account? <a href="#/login">Log in</a>' : 'New here? <a href="#/register">Create an account</a>'}</p></div>`;
    app.querySelector('#a').onsubmit = async (ev) => {
      ev.preventDefault();
      const g = (id) => app.querySelector('#' + id)?.value ?? '';
      const body = reg ? { name: g('n'), email: g('e'), phone: g('ph'), password: g('p') } : { email: g('e'), password: g('p') };
      const btn = ev.target.querySelector('button'); btn.disabled = true;
      try {
        const r = await api('/auth/' + mode, { method: 'POST', body });
        store.token = r.token; store.user = r.user; renderNav();
        toast('Welcome, ' + r.user.name); location.hash = '#/';
      } catch (e) { app.querySelector('#err').textContent = e.message; btn.disabled = false; }
    };
  }

  // ---------- Create listing ----------
  function newListing() {
    if (!store.token) return needLogin();
    const u = store.user || {};
    app.innerHTML = `<div class="panel wide"><h1>Sell a book</h1>
      <form id="l" novalidate>
        <div class="field"><label for="t">Title</label><input id="t" maxlength="200" required></div>
        <div class="two">
          <div class="field"><label for="cc">Course code</label><input id="cc" placeholder="CSE101" required></div>
          <div class="field"><label for="dp">Department</label><input id="dp" required></div>
        </div>
        <div class="two">
          <div class="field"><label for="pr">Price (R)</label><input id="pr" type="number" min="1" step="0.01" required></div>
          <div class="field"><label for="co">Condition</label><select id="co">${CONDITIONS.map((c) => `<option${c === 'Good' ? ' selected' : ''}>${c}</option>`).join('')}</select></div>
        </div>
        <div class="two">
          <div class="field"><label for="sn">Your display name</label><input id="sn" value="${esc(u.name || '')}" required></div>
          <div class="field"><label for="sc">Contact number</label><input id="sc" type="tel" placeholder="0712345678" required></div>
        </div>
        <p class="meta">Your contact number is shown only to logged-in students who tap “Contact seller”.</p>
        <div id="err" class="error"></div>
        <button class="primary">Post listing</button>
      </form></div>`;
    app.querySelector('#l').onsubmit = async (ev) => {
      ev.preventDefault();
      const g = (id) => app.querySelector('#' + id).value;
      const btn = ev.target.querySelector('button'); btn.disabled = true;
      try {
        await api('/books', { method: 'POST', body: { title: g('t'), courseCode: g('cc'), department: g('dp'), price: g('pr'), condition: g('co'), sellerName: g('sn'), sellerContact: g('sc') } });
        toast('Listing posted'); location.hash = '#/mine';
      } catch (e) { app.querySelector('#err').textContent = e.message; btn.disabled = false; }
    };
  }

  // ---------- My listings ----------
  async function mine() {
    if (!store.token) return needLogin();
    app.innerHTML = '<h1>My listings</h1><div id="list" class="grid"><p class="empty">Loading…</p></div>';
    const list = app.querySelector('#list');
    try {
      const { books } = await api('/books/mine');
      if (!books.length) { list.innerHTML = '<p class="empty">You have no listings yet. <a href="#/new">Sell a book</a></p>'; return; }
      list.innerHTML = books.map((b) => `<article class="card">
        <span class="pill ${esc(b.status)}">${esc(b.status)}</span>
        <h3>${esc(b.title)}</h3>
        <div class="meta">${esc(b.courseCode)} · ${esc(b.department)}</div>
        <div class="price">${rand(b.price)}</div>
        <div class="row">
          ${b.status === 'Available' ? `<button data-sold="${b.id}">Mark as sold</button><button data-price="${b.id}">Change price</button>` : ''}
          <button class="danger" data-del="${b.id}">Delete</button>
        </div></article>`).join('');
      list.onclick = async (e) => {
        const t = e.target;
        try {
          if (t.dataset.sold) { await api(`/books/${t.dataset.sold}/status`, { method: 'PATCH', body: { status: 'Sold' } }); toast('Marked as sold'); mine(); }
          else if (t.dataset.price) {
            const v = prompt('New price in rand:'); if (v === null) return;
            await api('/books/' + t.dataset.price, { method: 'PATCH', body: { price: v } }); toast('Price updated'); mine();
          } else if (t.dataset.del) {
            if (!confirm('Delete this listing?')) return;
            await api('/books/' + t.dataset.del, { method: 'DELETE' }); toast('Listing deleted'); mine();
          }
        } catch (err) { toast(err.message); }
      };
    } catch (e) { list.innerHTML = `<p class="error">${esc(e.message)}</p>`; }
  }

  // ---------- Router ----------
  function router() {
    renderNav();
    const h = location.hash.replace(/^#/, '') || '/';
    const m = h.match(/^\/book\/(\d+)$/);
    if (m) return details(m[1]);
    ({ '/': browse, '/login': () => authForm('login'), '/register': () => authForm('register'), '/new': newListing, '/mine': mine }[h] || browse)();
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', router);
  router();
})();
