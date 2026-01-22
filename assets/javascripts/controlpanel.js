document.addEventListener('DOMContentLoaded', () => {
let selectedUser = null;
let usersCache = [];
let editingProfileUser = null;
let profileMode = 'edit';
let currentSort = { key: 'id', dir: 'desc' };

const tableBody = document.getElementById('usersTableBody');
const btnNew = document.getElementById('btnNew');
const btnEdit = document.getElementById('btnEdit');
const btnDelete = document.getElementById('btnDelete');
  const btnRefresh = document.getElementById('btnRefresh');
  const btnResetPassword = document.getElementById('btnResetPassword');

  const rowCount = document.getElementById('rowCount');
  const searchInput = document.getElementById('searchInput');
  const searchButton = document.getElementById('searchButton');

  const passwordModal = $('#passwordModal');
  const passwordForm = document.getElementById('passwordForm');
  const resetPassword = document.getElementById('resetPassword');
  const resetConfirmPassword = document.getElementById('resetConfirmPassword');

  function formatDate(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
  }

  function clearSelection() {
    document.querySelectorAll('#usersTable tbody tr').forEach(tr => tr.classList.remove('selected'));
    selectedUser = null;
  }

  let currentUsersPage = 1;

  function applyRowLimit() {
    const limit = parseInt(rowCount.value, 10) || 50;
    const rows = Array.from(tableBody.querySelectorAll('tr')).filter(r => r.dataset.match !== 'false');
    const totalPages = Math.max(1, Math.ceil(rows.length / limit));
    if (currentUsersPage > totalPages) currentUsersPage = totalPages;
    const start = (currentUsersPage - 1) * limit;
    const end = start + limit;
    rows.forEach((row, idx) => {
      row.style.display = (idx >= start && idx < end) ? '' : 'none';
    });
    const info = document.getElementById('pageInfoUsersTop');
    if (info) info.textContent = `Page ${currentUsersPage} of ${totalPages}`;
    const prev = document.getElementById('btnPrevUsersTop');
    const next = document.getElementById('btnNextUsersTop');
    if (prev) prev.disabled = currentUsersPage <= 1;
    if (next) next.disabled = currentUsersPage >= totalPages;
  }

  function applySearch() {
    const query = searchInput.value.toLowerCase();
    tableBody.querySelectorAll('tr').forEach(row => {
      const text = row.textContent.toLowerCase();
      row.dataset.match = text.includes(query);
    });
    currentUsersPage = 1;
    applyRowLimit();
  }

  function renderUsers(data) {
    // sort
    const sorted = [...data].sort((a, b) => {
      const dir = currentSort.dir === 'asc' ? 1 : -1;
      const va = (a[currentSort.key] || '').toString().toLowerCase();
      const vb = (b[currentSort.key] || '').toString().toLowerCase();
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });

    tableBody.innerHTML = '';
    sorted.forEach(u => {
      const row = document.createElement('tr');
      row.dataset.id = u.id;
      row.dataset.match = true;
      const activeLabel = u.is_active ? 'Active' : 'Inactive';
      row.innerHTML = `
        <td>${u.id}</td>
        <td>${escapeHtml(u.username)}</td>
        <td>${escapeHtml(u.full_name || '')}</td>
        <td>${escapeHtml(u.email || '')}</td>
        <td>${escapeHtml(u.role || '')}</td>
        <td>${escapeHtml(u.mobile_no || '')}</td>
        <td>${escapeHtml(u.address1 || '')}</td>
        <td>${escapeHtml(u.user_leave_total ?? '')}</td>
        <td>${escapeHtml(u.user_leave_used ?? '')}</td>
        <td>${escapeHtml(u.user_leave_balance ?? '')}</td>
        <td>${escapeHtml(u.user_claimoff_total ?? '')}</td>
        <td>${escapeHtml(u.user_claimoff_used ?? '')}</td>
        <td>${escapeHtml(u.user_claimoff_balance ?? '')}</td>
        <td>${escapeHtml(u.user_childcare_total ?? '')}</td>
        <td>${escapeHtml(u.user_childcare_used ?? '')}</td>
        <td>${escapeHtml(u.user_childcare_balance ?? '')}</td>
        <td>${escapeHtml(u.user_mc_total ?? '')}</td>
        <td>${escapeHtml(u.user_mc_used ?? '')}</td>
        <td>${escapeHtml(u.user_mc_balance ?? '')}</td>
      `;
      row.addEventListener('click', () => {
        clearSelection();
        row.classList.add('selected');
        selectedUser = u;
      });
      row.addEventListener('dblclick', () => { profileMode = 'edit'; openProfileModal(u); });
      tableBody.appendChild(row);
    });
    applyRowLimit();
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  async function fetchUsers() {
    try {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Failed to load users');
      usersCache = await res.json();
      renderUsers(usersCache);
    } catch (err) {
      console.error('Error fetching users:', err);
      alert('Failed to load users.');
    }
  }

  function openNewUserModal() {
    profileMode = 'create';
    openProfileModal(null);
  }

  function openEditUserModal() {
    if (!selectedUser) return alert('Please select a user to edit.');
    profileMode = 'edit';
    openProfileModal(selectedUser);
  }

  function openPasswordModal() {
    if (!selectedUser) return alert('Please select a user to reset password.');
    passwordForm.reset();
    passwordModal.modal('show');
  }

  async function saveUser(e) {
    if (e) e.preventDefault();
  }

  async function savePassword(e) {
    e.preventDefault();
    if (!selectedUser) return alert('Please select a user to reset password.');
    if (resetPassword.value !== resetConfirmPassword.value) {
      alert('Passwords do not match.');
      return;
    }
    if (!resetPassword.value) {
      alert('Password is required.');
      return;
    }
    try {
      const res = await fetch(`/api/users/${selectedUser.id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: resetPassword.value, updated_by: 'system' })
      });
      if (!res.ok) throw new Error('Reset failed');
      passwordModal.modal('hide');
      alert('Password updated.');
    } catch (err) {
      console.error('Error resetting password:', err);
      alert('Failed to reset password.');
    }
  }

  async function deleteUser() {
    if (!selectedUser) return alert('Please select a user to delete.');
    if (!confirm(`Delete user "${selectedUser.username}"?`)) return;
    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      clearSelection();
      fetchUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
      alert('Failed to delete user.');
    }
  }

  btnNew.addEventListener('click', openNewUserModal);
  btnEdit.addEventListener('click', openEditUserModal);
  btnResetPassword.addEventListener('click', openPasswordModal);
  btnDelete.addEventListener('click', deleteUser);
  btnRefresh.addEventListener('click', fetchUsers);
  const profileForm = document.getElementById('userProfileForm');
  if (profileForm) {
    profileForm.addEventListener('submit', saveProfile);
  }
  passwordForm.addEventListener('submit', savePassword);
  rowCount.addEventListener('change', applyRowLimit);
  searchButton.addEventListener('click', applySearch);
  const prevBtn = document.getElementById('btnPrevUsersTop');
  const nextBtn = document.getElementById('btnNextUsersTop');
  if (prevBtn) prevBtn.addEventListener('click', () => { if (currentUsersPage > 1) { currentUsersPage--; applyRowLimit(); } });
  if (nextBtn) nextBtn.addEventListener('click', () => {
    const rows = Array.from(tableBody.querySelectorAll('tr')).filter(r => r.dataset.match !== 'false');
    const limit = parseInt(rowCount.value, 10) || 50;
    const totalPages = Math.max(1, Math.ceil(rows.length / limit));
    if (currentUsersPage < totalPages) { currentUsersPage++; applyRowLimit(); }
  });

  // sortable headers
  const headerMap = [
    { id: 'sort-id', key: 'id' },
    { id: 'sort-username', key: 'username' },
    { id: 'sort-fullname', key: 'full_name' },
    { id: 'sort-email', key: 'email' },
    { id: 'sort-role', key: 'role' },
    { id: 'sort-mobile', key: 'mobile_no' },
    { id: 'sort-address', key: 'address1' },
    { id: 'sort-user-leave-total', key: 'user_leave_total' },
    { id: 'sort-used-leaves', key: 'user_leave_used' },
    { id: 'sort-balance-leaves', key: 'user_leave_balance' },
    { id: 'sort-user-claimoff-total', key: 'user_claimoff_total' },
    { id: 'sort-used-claim-offs', key: 'user_claimoff_used' },
    { id: 'sort-balance-claim-offs', key: 'user_claimoff_balance' },
    { id: 'sort-user-childcare-total', key: 'user_childcare_total' },
    { id: 'sort-used-child-care', key: 'user_childcare_used' },
    { id: 'sort-balance-child-care', key: 'user_childcare_balance' },
    { id: 'sort-user-mc-total', key: 'user_mc_total' },
    { id: 'sort-used-mc', key: 'user_mc_used' },
    { id: 'sort-balance-mc', key: 'user_mc_balance' }
  ];
  headerMap.forEach(h => {
    const el = document.getElementById(h.id);
    if (el) {
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => {
        if (currentSort.key === h.key) {
          currentSort.dir = currentSort.dir === 'asc' ? 'desc' : 'asc';
        } else {
          currentSort.key = h.key;
          currentSort.dir = 'asc';
        }
        renderUsers(usersCache);
      });
    }
  });

  fetchUsers();

  function openProfileModal(user) {
    editingProfileUser = user;
    const title = document.querySelector('#userProfileModal .modal-title');
    if (title) title.textContent = profileMode === 'create' ? 'Add User' : 'Edit User';
    const fieldIds = [
      'profileUsername','profileFullName','profileRole','profilePassword','profilePasswordConfirm',
      'profileNric','profileMobile','profileAddress1','profileAddress2','profileAddress3',
      'profileBirthdate','profileEmail',
      'profileTotalLeaves','profileTotalClaimOffs','profileTotalChildCare','profileTotalMc',
      'profileUsedLeaves','profileUsedClaimOffs','profileUsedChildCare','profileUsedMc',
      'profileLeaveBalance','profileClaimOffBalance','profileChildCareBalance','profileMcBalance'
    ];
    document.getElementById('profileUserId').value = user && user.id ? user.id : '';
    document.getElementById('profileUsername').value = user ? (user.username || '') : '';
    document.getElementById('profileFullName').value = user ? (user.full_name || '') : '';
    document.getElementById('profileRole').value = user ? (user.role || 'user').toLowerCase() : 'user';
    document.getElementById('profilePassword').value = '';
    document.getElementById('profilePasswordConfirm').value = '';
    document.getElementById('profileNric').value = user ? (user.nric_fin || '') : '';
    document.getElementById('profileMobile').value = user ? (user.mobile_no || '') : '';
    document.getElementById('profileAddress1').value = user ? (user.address1 || '') : '';
    document.getElementById('profileAddress2').value = user ? (user.address2 || '') : '';
    document.getElementById('profileAddress3').value = user ? (user.address3 || '') : '';
    document.getElementById('profileBirthdate').value = user && user.birthdate ? user.birthdate.split('T')[0] : '';
    document.getElementById('profileEmail').value = user ? (user.email || '') : '';
    document.getElementById('profileTotalLeaves').value = user && user.user_leave_total != null ? user.user_leave_total : '';
    document.getElementById('profileTotalClaimOffs').value = user && user.user_claimoff_total != null ? user.user_claimoff_total : '';
    document.getElementById('profileTotalChildCare').value = user && user.user_childcare_total != null ? user.user_childcare_total : '';
    document.getElementById('profileTotalMc').value = user && user.user_mc_total != null ? user.user_mc_total : '';
    document.getElementById('profileUsedLeaves').value = user && user.user_leave_used != null ? user.user_leave_used : '';
    document.getElementById('profileUsedClaimOffs').value = user && user.user_claimoff_used != null ? user.user_claimoff_used : '';
    document.getElementById('profileUsedChildCare').value = user && user.user_childcare_used != null ? user.user_childcare_used : '';
    document.getElementById('profileUsedMc').value = user && user.user_mc_used != null ? user.user_mc_used : '';
    document.getElementById('profileLeaveBalance').value = user && user.user_leave_balance != null ? user.user_leave_balance : '';
    document.getElementById('profileClaimOffBalance').value = user && user.user_claimoff_balance != null ? user.user_claimoff_balance : '';
    document.getElementById('profileChildCareBalance').value = user && user.user_childcare_balance != null ? user.user_childcare_balance : '';
    document.getElementById('profileMcBalance').value = user && user.user_mc_balance != null ? user.user_mc_balance : '';
    computeAllBalances();
    // Office radios
    const officeVal = (user && (user.office || user.office_location)) ? String(user.office || user.office_location) : '';
    if (officeVal.toLowerCase() === 'kuala lumpur') {
      if (document.getElementById('profileOfficeKL')) document.getElementById('profileOfficeKL').checked = true;
    } else if (officeVal.toLowerCase() === 'singapore') {
      if (document.getElementById('profileOfficeSG')) document.getElementById('profileOfficeSG').checked = true;
    } else {
      if (document.getElementById('profileOfficeSG')) document.getElementById('profileOfficeSG').checked = false;
      if (document.getElementById('profileOfficeKL')) document.getElementById('profileOfficeKL').checked = false;
    }
    // ensure all fields are editable
    fieldIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.removeAttribute('readonly');
        el.removeAttribute('disabled');
      }
    });
    document.getElementById('profileSaveStatus').textContent = '';
    $('#userProfileModal').modal('show');
  }

  function computeBalance(totalId, usedId, balanceId) {
    const totalEl = document.getElementById(totalId);
    const usedEl = document.getElementById(usedId);
    const balanceEl = document.getElementById(balanceId);
    if (!totalEl || !usedEl || !balanceEl) return;
    const totalRaw = totalEl.value;
    const usedRaw = usedEl.value;
    if (totalRaw === '' && usedRaw === '') {
      balanceEl.value = '';
      return;
    }
    const total = parseFloat(totalRaw) || 0;
    const used = parseFloat(usedRaw) || 0;
    const balance = total - used;
    balanceEl.value = Number.isFinite(balance) ? String(balance) : '';
  }

  function computeAllBalances() {
    computeBalance('profileTotalLeaves', 'profileUsedLeaves', 'profileLeaveBalance');
    computeBalance('profileTotalClaimOffs', 'profileUsedClaimOffs', 'profileClaimOffBalance');
    computeBalance('profileTotalChildCare', 'profileUsedChildCare', 'profileChildCareBalance');
    computeBalance('profileTotalMc', 'profileUsedMc', 'profileMcBalance');
  }

  ['profileTotalLeaves','profileUsedLeaves',
    'profileTotalClaimOffs','profileUsedClaimOffs',
    'profileTotalChildCare','profileUsedChildCare',
    'profileTotalMc','profileUsedMc'
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', computeAllBalances);
    }
  });

  async function saveProfile(e) {
    e.preventDefault();
    computeAllBalances();
    const isCreate = profileMode === 'create' || !editingProfileUser || !editingProfileUser.id;
    const pwd = document.getElementById('profilePassword').value;
    const pwd2 = document.getElementById('profilePasswordConfirm').value;
    if (pwd && pwd !== pwd2) {
      alert('Passwords do not match.');
      return;
    }

    const payload = {
      username: document.getElementById('profileUsername').value.trim(),
      full_name: document.getElementById('profileFullName').value.trim() || null,
      role: document.getElementById('profileRole').value || 'user',
      email: document.getElementById('profileEmail').value.trim() || null,
      is_active: !editingProfileUser || editingProfileUser.is_active !== false,
      updated_by: 'system',
      nric_fin: document.getElementById('profileNric').value.trim() || null,
      mobile_no: document.getElementById('profileMobile').value.trim() || null,
      address1: document.getElementById('profileAddress1').value.trim() || null,
      address2: document.getElementById('profileAddress2').value.trim() || null,
      address3: document.getElementById('profileAddress3').value.trim() || null,
      birthdate: document.getElementById('profileBirthdate').value || null,
      office: (document.getElementById('profileOfficeSG')?.checked ? 'Singapore' :
              document.getElementById('profileOfficeKL')?.checked ? 'Kuala Lumpur' : null),
      user_leave_total: document.getElementById('profileTotalLeaves').value || null,
      user_claimoff_total: document.getElementById('profileTotalClaimOffs').value || null,
      user_childcare_total: document.getElementById('profileTotalChildCare').value || null,
      user_mc_total: document.getElementById('profileTotalMc').value || null,
      user_leave_used: document.getElementById('profileUsedLeaves').value || null,
      user_claimoff_used: document.getElementById('profileUsedClaimOffs').value || null,
      user_childcare_used: document.getElementById('profileUsedChildCare').value || null,
      user_mc_used: document.getElementById('profileUsedMc').value || null,
      user_leave_balance: document.getElementById('profileLeaveBalance').value || null,
      user_claimoff_balance: document.getElementById('profileClaimOffBalance').value || null,
      user_childcare_balance: document.getElementById('profileChildCareBalance').value || null,
      user_mc_balance: document.getElementById('profileMcBalance').value || null
    };

    try {
      let saved;
      if (isCreate) {
        if (!payload.username) throw new Error('Username is required.');
        if (!pwd) throw new Error('Password required for new user');
        payload.password = pwd;
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Save failed');
        saved = await res.json();
      } else {
        if (pwd) {
          await fetch(`/api/users/${editingProfileUser.id}/password`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: pwd, updated_by: 'system' })
          });
        }
        const res = await fetch(`/api/users/${editingProfileUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Save failed');
        saved = await res.json();
      }
      document.getElementById('profileSaveStatus').textContent = 'Saved.';
      document.getElementById('profileSaveStatus').style.color = 'green';
      $('#userProfileModal').modal('hide');
      fetchUsers();
      editingProfileUser = saved;
      selectedUser = saved;
    } catch (err) {
      console.error('Error saving profile:', err);
      document.getElementById('profileSaveStatus').textContent = 'Failed to save.';
      document.getElementById('profileSaveStatus').style.color = 'red';
    }
  }
});
