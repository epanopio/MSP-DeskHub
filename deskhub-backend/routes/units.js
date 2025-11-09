document.addEventListener('DOMContentLoaded', () => {
  let selectedUnit = null;

  const tableBody    = document.getElementById('unitsTableBody');
  const btnNew       = document.getElementById('btnNew');
  const btnEdit      = document.getElementById('btnEdit');
  const btnDelete    = document.getElementById('btnDelete');
  const btnRefresh   = document.getElementById('btnRefresh');

  const unitForm     = document.getElementById('unitForm');
  const modalElem    = $('#unitModal');
  const unitIdInput  = document.getElementById('unitId');
  const itemSelect   = document.getElementById('itemSelect');
  const modelSelect  = document.getElementById('modelSelect');
  const serialNumber = document.getElementById('serialNumber');
  const brandInput   = document.getElementById('brand');
  const purchaseDate = document.getElementById('purchaseDate');
  const lastCalibration = document.getElementById('lastCalibration');
  const nextCalibration = document.getElementById('nextCalibration');
  const poNumber     = document.getElementById('poNumber');
  const invoiceNumber= document.getElementById('invoiceNumber');
  const invoiceDate  = document.getElementById('invoiceDate');
  const amountInput  = document.getElementById('amount');
  const subscriptionInfo = document.getElementById('subscriptionInfo');
  const remarksInput = document.getElementById('remarks');

  function formatDate(isoString) {
    if (!isoString) return '';
    const d   = new Date(isoString);
    const yyyy = d.getFullYear();
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const dd   = String(d.getDate()).padStart(2, '0');
    const hh   = String(d.getHours()).padStart(2, '0');
    const mi   = String(d.getMinutes()).padStart(2, '0');
    const ss   = String(d.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
  }

  async function loadItemsDropdown() {
    try {
      const res   = await fetch('/api/items');
      const items = await res.json();
      itemSelect.innerHTML = '<option value="">--Select Item--</option>';
      items.forEach(it => {
        const opt = document.createElement('option');
        opt.value   = it.id;
        opt.textContent = it.name;
        itemSelect.appendChild(opt);
      });
    } catch(err) {
      console.error('Error loading items:', err);
      alert('Failed to load items list.');
    }
  }

  async function loadModelsDropdown(itemId) {
    try {
      const res   = await fetch(`/api/models?item_id=${itemId}`);
      const models= await res.json();
      modelSelect.innerHTML = '<option value="">--Select Model--</option>';
      models.forEach(m => {
        const opt = document.createElement('option');
        opt.value   = m.id;
        opt.textContent = m.model_name;
        modelSelect.appendChild(opt);
      });
    } catch(err) {
      console.error('Error loading models:', err);
      alert('Failed to load models list.');
    }
  }

  async function fetchUnits() {
    try {
      const res  = await fetch('/api/units');
      const data = await res.json();
      tableBody.innerHTML = '';
      data.forEach(u => {
        const row = document.createElement('tr');
        row.dataset.id = u.id;
        row.innerHTML = `
          <td>${u.id}</td>
          <td>${u.item_name}</td>
          <td>${u.model_name}</td>
          <td>${u.serial_number || ''}</td>
          <td>${u.brand || ''}</td>
          <td>${u.purchase_date ? formatDate(u.purchase_date) : ''}</td>
          <td>${u.last_calibration ? formatDate(u.last_calibration) : ''}</td>
          <td>${u.next_calibration ? formatDate(u.next_calibration) : ''}</td>
          <td>${u.po_number || ''}</td>
          <td>${u.invoice_number || ''}</td>
          <td>${u.invoice_date ? formatDate(u.invoice_date) : ''}</td>
          <td>${u.amount != null ? u.amount : ''}</td>
          <td class="remarks-cell" title="${(u.subscription_info||'').replace(/"/g,'&quot;')}">${(u.subscription_info||'').split('\n')[0]}</td>
          <td>${u.last_updated_on ? formatDate(u.last_updated_on) : ''}</td>
          <td>${u.last_updated_by || ''}</td>
          <td class="remarks-cell" title="${(u.remarks||'').replace(/"/g,'&quot;')}">${(u.remarks||'').split('\n')[0]}</td>
        `;
        row.addEventListener('click', () => {
          tableBody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
          row.classList.add('selected');
          selectedUnit = u;
        });
        tableBody.appendChild(row);
      });
      document.getElementById("rowCount").dispatchEvent(new Event("change"));
    } catch(err) {
      console.error('Error fetching units:', err);
      alert('Failed to load units.');
    }
  }

  itemSelect.addEventListener('change', () => {
    const itemId = itemSelect.value;
    if (itemId) {
      loadModelsDropdown(itemId);
    } else {
      modelSelect.innerHTML = '<option value="">-- Select Model --</option>';
    }
  });

  btnNew.addEventListener('click', async () => {
    selectedUnit = null;
    unitForm.reset();
    unitIdInput.value = '';
    await loadItemsDropdown();
    modelSelect.innerHTML = '<option value="">--Select Model--</option>';
    modalElem.find('.modal-title').text('New Unit');
    modalElem.modal('show');
  });

  btnEdit.addEventListener('click', async () => {
    if (!selectedUnit) {
      alert('Please select a unit to edit.');
      return;
    }
    await loadItemsDropdown();
    itemSelect.value      = selectedUnit.item_id;
    await loadModelsDropdown(selectedUnit.item_id);
    modelSelect.value     = selectedUnit.model_id || '';
    unitIdInput.value     = selectedUnit.id;
    serialNumber.value    = selectedUnit.serial_number || '';
    brandInput.value      = selectedUnit.brand || '';
    purchaseDate.value    = selectedUnit.purchase_date ? selectedUnit.purchase_date.split('T')[0] : '';
    lastCalibration.value = selectedUnit.last_calibration ? selectedUnit.last_calibration.split('T')[0] : '';
    nextCalibration.value = selectedUnit.next_calibration ? selectedUnit.next_calibration.split('T')[0] : '';
    poNumber.value        = selectedUnit.po_number || '';
    invoiceNumber.value   = selectedUnit.invoice_number || '';
    invoiceDate.value     = selectedUnit.invoice_date ? selectedUnit.invoice_date.split('T')[0] : '';
    amountInput.value     = selectedUnit.amount != null ? selectedUnit.amount : '';
    subscriptionInfo.value= selectedUnit.subscription_info || '';
    remarksInput.value    = selectedUnit.remarks || '';
    modalElem.find('.modal-title').text('Edit Unit');
    modalElem.modal('show');
  });

  btnDelete.addEventListener('click', async () => {
    if (!selectedUnit) {
      alert('Please select a unit to delete.');
      return;
    }
    if (!confirm(`Delete unit with ID ${selectedUnit.id}?`)) return;
    try {
      const res = await fetch(`/api/units/${selectedUnit.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      await fetchUnits();
      selectedUnit = null;
    } catch(err) {
      console.error('Error deleting unit:', err);
      alert('Failed to delete unit.');
    }
  });

  btnRefresh.addEventListener('click', fetchUnits);

  unitForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id    = unitIdInput.value;
    const payload = {
      item_id          : itemSelect.value,
      model_id         : modelSelect.value,
      serial_number    : serialNumber.value.trim(),
      brand            : brandInput.value.trim(),
      purchase_date    : purchaseDate.value || null,
      last_calibration : lastCalibration.value || null,
      next_calibration : nextCalibration.value || null,
      po_number        : poNumber.value.trim(),
      invoice_number   : invoiceNumber.value.trim(),
      invoice_date     : invoiceDate.value || null,
      amount           : amountInput.value !== '' ? parseFloat(amountInput.value) : null,
      subscription_info: subscriptionInfo.value.trim(),
      remarks          : remarksInput.value.trim()
    };
    if (!payload.item_id || !payload.model_id) {
      alert('Item and Model are required.');
      return;
    }
    try {
      const url    = id ? `/api/units/${id}` : '/api/units';
      const method = id ? 'PUT' : 'POST';
      const res    = await fetch(url, {
        method,
        headers: { 'Content‑Type': 'application/json' },
        body   : JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Save failed');
      modalElem.modal('hide');
      await fetchUnits();
      selectedUnit = null;
    } catch(err) {
      console.error('Error saving unit:', err);
      alert('Failed to save unit.');
    }
  });

  // Initial load
  fetchUnits();
});
