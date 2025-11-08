document.addEventListener('DOMContentLoaded', () => {
  let selectedRow = null;

  // Load table items on page load
  loadItems();

  // Row selection logic
  document.querySelector('#itemsTable tbody').addEventListener('click', (e) => {
    const row = e.target.closest('tr');
    if (!row) return;
    document.querySelectorAll('#itemsTable tbody tr').forEach(r => r.classList.remove('selected'));
    row.classList.add('selected');
    selectedRow = row;
  });

  // New Item
  document.querySelector('.btn.btn-primary').addEventListener('click', () => {
    selectedRow = null;
    document.getElementById('itemForm').reset();
    document.getElementById('itemId').value = '';
    document.getElementById('itemModalLabel').textContent = 'New Item';
    $('#itemModal').modal('show');
  });

  // Edit Item
  document.querySelectorAll('.btn.btn-default')[0].addEventListener('click', () => {
    if (!selectedRow) return alert('Select a row first!');
    document.getElementById('itemId').value = selectedRow.cells[0].textContent;
    document.getElementById('itemName').value = selectedRow.cells[1].textContent;
    document.getElementById('itemRemarks').value = selectedRow.cells[2].textContent;
    document.getElementById('itemModalLabel').textContent = 'Edit Item';
    $('#itemModal').modal('show');
  });

  // Delete Item
  document.querySelectorAll('.btn.btn-default')[1].addEventListener('click', () => {
    if (!selectedRow) return alert('Select a row first!');
    const id = selectedRow.cells[0].textContent;
    if (!confirm('Are you sure to delete this item?')) return;
    fetch(`/api/items/${id}`, { method: 'DELETE' })
      .then(() => loadItems());
  });

  // Save Form Submit (New or Edit)
  document.getElementById('itemForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('itemId').value;
    const name = document.getElementById('itemName').value;
    const remarks = document.getElementById('itemRemarks').value;

    const url = id ? `/api/items/${id}` : '/api/items';
    const method = id ? 'PUT' : 'POST';

    fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, remarks })
    })
    .then(() => {
      $('#itemModal').modal('hide');
      loadItems();
    });
  });
});

// Load Items from API
function loadItems() {
  fetch('/api/items')
    .then(res => res.json())
    .then(data => {
      const tbody = document.querySelector('#itemsTable tbody');
      tbody.innerHTML = '';
      data.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${item.id}</td>
          <td>${item.name}</td>
          <td>${item.remarks}</td>
          <td>${item.last_updated_on}</td>
          <td>${item.last_updated_by}</td>
        `;
        tbody.appendChild(row);
      });
      document.getElementById('rowCount').dispatchEvent(new Event('change'));
    });
}
