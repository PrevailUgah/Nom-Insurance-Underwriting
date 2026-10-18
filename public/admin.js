const API = ''; // same origin
let accessToken = localStorage.getItem('gt_token') || null;
let adminPasskey = sessionStorage.getItem('gt_passkey') || null;
let currentReviewId = null;
let editingCompanyId = null;

// ---------- Gate ----------
function showError(msg) {
  const el = document.getElementById('gateError');
  el.textContent = msg;
  el.classList.remove('hidden');
}

function showLogin() {
  document.getElementById('loginSection').classList.remove('hidden');
  document.getElementById('signupSection').classList.add('hidden');
  document.getElementById('passkeySection').classList.add('hidden');
}

function showSignup() {
  document.getElementById('loginSection').classList.add('hidden');
  document.getElementById('signupSection').classList.remove('hidden');
}

async function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  try {
    const res = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');

    accessToken = data.session.access_token;
    localStorage.setItem('gt_token', accessToken);

    if (data.profile?.role !== 'admin') {
      showError('This account is not an admin.');
      return;
    }
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('passkeySection').classList.remove('hidden');
    document.getElementById('adminEmail').textContent = data.user.email;
  } catch (err) {
    showError(err.message);
  }
}

async function doSignup() {
  const fullName = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  try {
    const res = await fetch(`${API}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, fullName })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Signup failed');
    alert('Account created. Ask an existing admin to promote you, then login.');
    showLogin();
  } catch (err) {
    showError(err.message);
  }
}

function verifyPasskey() {
  const key = document.getElementById('passkeyInput').value;
  if (!key) return showError('Enter passkey');
  adminPasskey = key;
  sessionStorage.setItem('gt_passkey', key);
  openDashboard();
}

function openDashboard() {
  document.getElementById('gate').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
  loadApplications();
}

function logout() {
  localStorage.removeItem('gt_token');
  sessionStorage.removeItem('gt_passkey');
  accessToken = null;
  adminPasskey = null;
  location.reload();
}

// Auto-restore if already unlocked in this session
if (accessToken && adminPasskey) {
  document.getElementById('gate').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
  loadApplications();
}

// ---------- Tabs ----------
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('tab-active'));
    btn.classList.add('tab-active');
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    document.getElementById(`tab-${btn.dataset.tab}`).classList.remove('hidden');

    if (btn.dataset.tab === 'applications') loadApplications();
    if (btn.dataset.tab === 'companies') loadCompanies();
    if (btn.dataset.tab === 'users') loadUsers();
  });
});

// ---------- Helpers ----------
function adminHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
    'x-admin-passkey': adminPasskey
  };
}

// ---------- Applications ----------
async function loadApplications() {
  const status = document.getElementById('filterStatus').value;
  const url = status
    ? `${API}/api/admin/applications?status=${status}`
    : `${API}/api/admin/applications`;

  const res = await fetch(url, { headers: adminHeaders() });
  const data = await res.json();
  if (!res.ok) return alert(data.error || 'Failed to load');

  const tbody = document.getElementById('appsTable');
  tbody.innerHTML = (data.applications || []).map(a => `
    <tr class="border-b border-slate-800 hover:bg-slate-900/50">
      <td class="py-2 pr-4">${a.id}</td>
      <td class="py-2 pr-4">${a.full_name}</td>
      <td class="py-2 pr-4">${a.email}</td>
      <td class="py-2 pr-4">${a.asset_type || '—'}</td>
      <td class="py-2 pr-4">₦${Number(a.asset_value).toLocaleString()}</td>
      <td class="py-2 pr-4">${a.risk_level}</td>
      <td class="py-2 pr-4">${a.decision}</td>
      <td class="py-2 pr-4"><span class="px-2 py-0.5 rounded text-xs ${
        a.status === 'pending' ? 'bg-yellow-900 text-yellow-300' :
        a.status === 'approved' ? 'bg-green-900 text-green-300' :
        a.status === 'declined' ? 'bg-red-900 text-red-300' : 'bg-slate-700'
      }">${a.status}</span></td>
      <td class="py-2"><button onclick="openReview(${a.id})" class="text-blue-400 hover:underline">Review</button></td>
    </tr>
  `).join('');
}

async function openReview(id) {
  currentReviewId = id;
  const res = await fetch(`${API}/api/admin/applications/${id}`, { headers: adminHeaders() });
  const data = await res.json();
  if (!res.ok) return alert(data.error);

  const a = data.application;
  document.getElementById('reviewContent').innerHTML = `
    <p><strong>Name:</strong> ${a.full_name}</p>
    <p><strong>Email:</strong> ${a.email}</p>
    <p><strong>Phone:</strong> ${a.phone_number || '—'}</p>
    <p><strong>Asset:</strong> ${a.asset_type || '—'} | Age: ${a.asset_age ?? '—'} yrs</p>
    <p><strong>Value:</strong> ₦${Number(a.asset_value).toLocaleString()}</p>
    <p><strong>Claims (5yr):</strong> ${a.claims_history}</p>
    <p><strong>AI Decision:</strong> ${a.decision} (${a.risk_level}, score ${a.risk_score})</p>
    <p><strong>Premium:</strong> ₦${Number(a.estimated_premium).toLocaleString()}</p>
    <p><strong>AI Analysis:</strong> ${a.ai_analysis || '—'}</p>
    <p><strong>Submitted:</strong> ${new Date(a.created_at).toLocaleString()}</p>
  `;
  document.getElementById('reviewStatus').value = a.status;
  document.getElementById('reviewNotes').value = a.admin_notes || '';
  document.getElementById('reviewModal').classList.remove('hidden');
  document.getElementById('reviewModal').classList.add('flex');
}

function closeReview() {
  document.getElementById('reviewModal').classList.add('hidden');
  document.getElementById('reviewModal').classList.remove('flex');
}

async function saveReview() {
  const status = document.getElementById('reviewStatus').value;
  const admin_notes = document.getElementById('reviewNotes').value;
  const res = await fetch(`${API}/api/admin/applications/${currentReviewId}`, {
    method: 'PATCH',
    headers: adminHeaders(),
    body: JSON.stringify({ status, admin_notes })
  });
  const data = await res.json();
  if (!res.ok) return alert(data.error);
  closeReview();
  loadApplications();
}

// ---------- Companies ----------
async function loadCompanies() {
  const res = await fetch(`${API}/api/admin/companies`, { headers: adminHeaders() });
  const data = await res.json();
  if (!res.ok) return alert(data.error);

  const container = document.getElementById('companiesList');
  container.innerHTML = (data.companies || []).map(c => `
    <div class="glass rounded-xl p-4">
      <div class="flex justify-between items-start">
        <div>
          <h3 class="font-bold text-lg">${c.name} <span class="text-xs text-slate-400">${c.short_code || ''}</span></h3>
          <p class="text-sm text-blue-300">${c.rating || ''}</p>
          <p class="text-sm mt-1 text-slate-300">${c.description || ''}</p>
          <p class="text-xs mt-2 text-slate-500">
            ${c.is_coming_soon ? '🚧 Coming Soon' : '✅ Live'} ·
            ${c.is_active ? 'Active' : 'Inactive'} · Order ${c.sort_order}
          </p>
        </div>
        <div class="flex gap-2">
          <button onclick='editCompany(${JSON.stringify(c)})' class="text-blue-400 text-sm">Edit</button>
          <button onclick="removeCompany('${c.id}')" class="text-red-400 text-sm">Remove</button>
        </div>
      </div>
    </div>
  `).join('');
}

function showAddCompany() {
  editingCompanyId = null;
  document.getElementById('companyModalTitle').textContent = 'Add Company';
  document.getElementById('cName').value = '';
  document.getElementById('cCode').value = '';
  document.getElementById('cRating').value = '';
  document.getElementById('cDesc').value = '';
  document.getElementById('cSpecialties').value = '';
  document.getElementById('cSort').value = 0;
  document.getElementById('cComingSoon').checked = false;
  document.getElementById('cActive').checked = true;
  document.getElementById('companyModal').classList.remove('hidden');
  document.getElementById('companyModal').classList.add('flex');
}

function editCompany(c) {
  editingCompanyId = c.id;
  document.getElementById('companyModalTitle').textContent = 'Edit Company';
  document.getElementById('cName').value = c.name || '';
  document.getElementById('cCode').value = c.short_code || '';
  document.getElementById('cRating').value = c.rating || '';
  document.getElementById('cDesc').value = c.description || '';
  document.getElementById('cSpecialties').value = (c.specialties || []).join(', ');
  document.getElementById('cSort').value = c.sort_order || 0;
  document.getElementById('cComingSoon').checked = !!c.is_coming_soon;
  document.getElementById('cActive').checked = c.is_active !== false;
  document.getElementById('companyModal').classList.remove('hidden');
  document.getElementById('companyModal').classList.add('flex');
}

function closeCompanyModal() {
  document.getElementById('companyModal').classList.add('hidden');
  document.getElementById('companyModal').classList.remove('flex');
}

async function saveCompany() {
  const payload = {
    name: document.getElementById('cName').value.trim(),
    short_code: document.getElementById('cCode').value.trim() || null,
    rating: document.getElementById('cRating').value.trim() || null,
    description: document.getElementById('cDesc').value.trim() || null,
    specialties: document.getElementById('cSpecialties').value.split(',').map(s => s.trim()).filter(Boolean),
    sort_order: Number(document.getElementById('cSort').value) || 0,
    is_coming_soon: document.getElementById('cComingSoon').checked,
    is_active: document.getElementById('cActive').checked
  };
  if (!payload.name) return alert('Name is required');

  const url = editingCompanyId
    ? `${API}/api/admin/companies/${editingCompanyId}`
    : `${API}/api/admin/companies`;
  const method = editingCompanyId ? 'PATCH' : 'POST';

  const res = await fetch(url, {
    method,
    headers: adminHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) return alert(data.error);
  closeCompanyModal();
  loadCompanies();
}

async function removeCompany(id) {
  if (!confirm('Deactivate this company?')) return;
  const res = await fetch(`${API}/api/admin/companies/${id}`, {
    method: 'DELETE',
    headers: adminHeaders()
  });
  const data = await res.json();
  if (!res.ok) return alert(data.error);
  loadCompanies();
}

// ---------- Users ----------
async function loadUsers() {
  const res = await fetch(`${API}/api/admin/users`, { headers: adminHeaders() });
  const data = await res.json();
  if (!res.ok) return alert(data.error);

  const tbody = document.getElementById('usersTable');
  tbody.innerHTML = (data.users || []).map(u => `
    <tr class="border-b border-slate-800">
      <td class="py-2 pr-4">${u.email}</td>
      <td class="py-2 pr-4">${u.full_name || '—'}</td>
      <td class="py-2 pr-4"><span class="px-2 py-0.5 rounded text-xs ${u.role === 'admin' ? 'bg-purple-900 text-purple-300' : 'bg-slate-700'}">${u.role}</span></td>
      <td class="py-2 pr-4">${new Date(u.created_at).toLocaleDateString()}</td>
      <td class="py-2">
        ${u.role === 'admin'
          ? `<button onclick="revokeAdmin('${u.id}')" class="text-red-400 text-sm">Revoke Admin</button>`
          : `<button onclick="grantAdmin('${u.id}')" class="text-emerald-400 text-sm">Make Admin</button>`
        }
      </td>
    </tr>
  `).join('');
}

async function grantAdmin(userId) {
  if (!confirm('Grant admin role to this user?')) return;
  const res = await fetch(`${API}/api/admin/grant-admin`, {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify({ userId })
  });
  const data = await res.json();
  if (!res.ok) return alert(data.error);
  loadUsers();
}

async function revokeAdmin(userId) {
  if (!confirm('Revoke admin role?')) return;
  const res = await fetch(`${API}/api/admin/revoke-admin`, {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify({ userId })
  });
  const data = await res.json();
  if (!res.ok) return alert(data.error);
  loadUsers();
}