document.addEventListener('DOMContentLoaded', () => {
  let selectedItem = null;

  const tableBody = document.getElementById('itemsTableBody');
  const itemForm = document.getElementById('itemForm');
  const modal = $('#itemModal');
  const btnNew = document.getElementById('btnNew');
  const btnEdit = document.getElementById('btnEdit');
  const btnDelete = document.getElementById('btnDelete');
  const btnRefresh = document.getElementById('btnRefresh');

  const itemId = document.getElementById('itemId');
  const itemName = document.getElementById('itemName');
  const itemRemarks = document.getElementById('itemRemarks');
  const currentUser = JSON.parse(localStorage.getItem('user') || 'null');

  function formatDate(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
  }

  function clearSelection() {
    document.querySelectorAll('#itemsTable tbody tr').forEach(tr => {
      tr.classList.remove('selected');
    });
    selectedItem = null;
  }

  // Show item details in a view-only modal (opened on double-click)
  function showItemView(item) {
    document.getElementById('viewItemId').textContent = item.id;
    document.getElementById('viewItemName').textContent = item.name || '';
    document.getElementById('viewItemRemarks').textContent = item.items_remarks1 || item.remarks || '';
    document.getElementById('viewItemUpdated').textContent = item.last_updated_on || '';
    $('#itemViewModal').modal('show');
  }

  function fetchItems() {
    fetch('/api/items')
      .then(res => res.json())
      .then(data => {
        tableBody.innerHTML = '';
        data.forEach(item => {
          const remarkText = item.items_remarks1 || item.remarks || '';
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${item.id}</td>
            <td>${item.name}</td>
            <td>${formatDate(item.last_updated_on)}</td>
            <td>${item.last_updated_by || ''}</td>
            <td class="remarks-cell" title="${remarkText.replace(/"/g, '&quot;')}">
              ${remarkText.split('\n')[0]}
            </td>
          `;
          row.addEventListener('click', () => {
            clearSelection();
            row.classList.add('selected');
            selectedItem = item;
          });
          tableBody.appendChild(row);
        });

        document.getElementById("rowCount").dispatchEvent(new Event("change"));
      })
      .catch(err => {
        console.error('Fetch items error:', err);
        alert('Error loading items.');
      });
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
    itemId.value = selectedItem.id;
    itemName.value = selectedItem.name;
    itemRemarks.value = selectedItem.items_remarks1 || selectedItem.remarks || '';
    modal.find('.modal-title').text('Edit Item');
    modal.modal('show');
  });

  btnDelete.addEventListener('click', () => {
    if (!selectedItem) return alert('Please select an item to delete.');
    if (!confirm('Are you sure you want to delete this item?')) return;
    fetch(`/api/items/${selectedItem.id}`, { method: 'DELETE' })
      .then(res => res.ok ? fetchItems() : Promise.reject())
      .catch(() => alert('Failed to delete item.'));
  });

  btnRefresh.addEventListener('click', fetchItems);

  itemForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = itemId.value;
    const payload = {
      name: itemName.value.trim(),
      remarks: itemRemarks.value.trim(),
      items_remarks1: itemRemarks.value.trim(),
      updated_by: currentUser ? (currentUser.fullName || currentUser.username || 'system') : 'system'
    };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/items/${id}` : '/api/items';

    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(() => {
        modal.modal('hide');
        fetchItems();
        selectedItem = null;
      })
      .catch(() => alert('Failed to save item.'));
  });

  // Ensure Cancel closes the modal in case data-dismiss is blocked
  const cancelBtn = document.getElementById('btnItemCancel');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => modal.modal('hide'));
  }

  fetchItems();
});
