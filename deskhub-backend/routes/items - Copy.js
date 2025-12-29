document.addEventListener('DOMContentLoaded', () => {
  let selectedItem = null;

  const tableBody    = document.getElementById('itemsTableBody');
  const btnNew       = document.getElementById('btnNew');
  const btnEdit      = document.getElementById('btnEdit');
  const btnDelete    = document.getElementById('btnDelete');
  const btnRefresh   = document.getElementById('btnRefresh');
  const itemForm     = document.getElementById('itemForm');
  const modal        = $('#itemModal');
  const itemId       = document.getElementById('itemId');
  const itemName     = document.getElementById('itemName');
  const itemRemarks  = document.getElementById('itemRemarks');

  function formatDate(isoString) {
    if (!isoString) return '';
    const d  = new Date(isoString);
    const yyyy = d.getFullYear();
    const mm   = String(d.getMonth()+1).padStart(2,'0');
    const dd   = String(d.getDate()).padStart(2,'0');
    const hh   = String(d.getHours()).padStart(2,'0');
    const mi   = String(d.getMinutes()).padStart(2,'0');
    const ss   = String(d.getSeconds()).padStart(2,'0');
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
  }

  function clearSelection() {
    tableBody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
    selectedItem = null;
  }

  async function fetchItems() {
    try {
      const res  = await fetch('/api/items');
      const data = await res.json();
      tableBody.innerHTML = '';
      data.forEach(item => {
        const row = document.createElement('tr');
        row.dataset.id = item.id;
        row.innerHTML = `
          <td>${item.id}</td>
          <td>${item.name}</td>
          <td>${formatDate(item.last_updated_on)}</td>
          <td>${item.last_updated_by || ''}</td>
          <td class="remarks‑cell" title="${(item.remarks||'').replace(/"/g,'&quot;')}">${(item.remarks||'').split('\n')[0]}</td>
        `;
        row.addEventListener('click', () => {
          clearSelection();
          row.classList.add('selected');
          selectedItem = item;
        });
        tableBody.appendChild(row);
      });

      document.getElementById("rowCount").dispatchEvent(new Event("change"));
    } catch(err) {
      console.error('Error fetching items:', err);
      alert('Failed to fetch items.');
    }
  }

  btnNew.addEventListener('click', () => {
    selectedItem = null;
    itemForm.reset();
    itemId.value = '';
    modal.find('.modal-title').text('New Item');
    modal.modal('show');
  });

  btnEdit.addEventListener('click', () => {
    if (!selectedItem) return alert('Please select an item to edit.');
    itemId.value        = selectedItem.id;
    itemName.value      = selectedItem.name;
    itemRemarks.value   = selectedItem.remarks || '';
    modal.find('.modal-title').text('Edit Item');
    modal.modal('show');
  });

  btnDelete.addEventListener('click', async () => {
    if (!selectedItem) return alert('Please select an item to delete.');
    if (!confirm(`Delete item "${selectedItem.name}"?`)) return;
    try {
      const res = await fetch(`/api/items/${selectedItem.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      await fetchItems();
      selectedItem = null;
    } catch(err) {
      console.error('Error deleting item:', err);
      alert('Failed to delete item.');
    }
  });

  btnRefresh.addEventListener('click', fetchItems);

  itemForm.addEventListener('submit', async e => {
    e.preventDefault();
    const id      = itemId.value;
    const payload = {
      name   : itemName.value.trim(),
      remarks: itemRemarks.value.trim()
    };
    if (!payload.name) {
      alert('Item Name is required.');
      return;
    }
    try {
      const url    = id ? `/api/items/${id}` : '/api/items';
      const method = id ? 'PUT' : 'POST';
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Save failed');
      modal.modal('hide');
      await fetchItems();
      selectedItem = null;
    } catch(err) {
      console.error('Error saving item:', err);
      alert('Failed to save item.');
    }
  });

  // initial load
  fetchItems();
});
