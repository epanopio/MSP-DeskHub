document.addEventListener('DOMContentLoaded', () => {
  let selectedModel = null;
  
  const tableBody = document.getElementById('modelsTableBody');
  const btnNew     = document.getElementById('btnNew');
  const btnEdit    = document.getElementById('btnEdit');
  const btnDelete  = document.getElementById('btnDelete');
  const btnRefresh = document.getElementById('btnRefresh');
  
  const modelForm    = document.getElementById('modelForm');
  const modalElem    = $('#modelModal');
  const modelIdInput = document.getElementById('modelId');
  const itemSelect   = document.getElementById('itemSelect');
  const modelName    = document.getElementById('modelName');
  const modelRemarks = document.getElementById('modelRemarks');

  function formatDate(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    const yyyy = date.getFullYear();
    const mm   = String(date.getMonth() + 1).padStart(2, '0');
    const dd   = String(date.getDate()).padStart(2, '0');
    const hh   = String(date.getHours()).padStart(2, '0');
    const mi   = String(date.getMinutes()).padStart(2, '0');
    const ss   = String(date.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
  }

  async function loadItemsForDropdown() {
    try {
      const res = await fetch('/api/items');
      if (!res.ok) throw new Error('Failed to load items');
      const items = await res.json();
      itemSelect.innerHTML = '<option value="">-- Select Item --</option>';
      items.forEach(it => {
        const opt = document.createElement('option');
        opt.value = it.id;
        opt.textContent = it.name;
        itemSelect.appendChild(opt);
      });
    } catch(err) {
      console.error('Error loading items for dropdown:', err);
      alert('Could not load items list.');
    }
  }

  async function fetchModels() {
    try {
      const res = await fetch('/api/models');
      if (!res.ok) throw new Error('Failed to fetch models');
      const data = await res.json();
      tableBody.innerHTML = '';
      data.forEach(m => {
        const row = document.createElement('tr');
        row.dataset.id = m.id;
        row.innerHTML = `
          <td>${m.id}</td>
          <td>${m.item_name || ''}</td>
          <td>${m.model_name}</td>
          <td>${formatDate(m.updated_on)}</td>
          <td>${m.updated_by || ''}</td>
          <td class="remarks-cell" title="${(m.remarks||'').replace(/"/g, '&quot;')}">${(m.remarks||'').split('\n')[0]}</td>
        `;
        row.addEventListener('click', () => {
          // deselect others
          tableBody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
          row.classList.add('selected');
          selectedModel = m;
        });
        tableBody.appendChild(row);
      });
      document.getElementById('rowCount').dispatchEvent(new Event('change'));
    } catch(err) {
      console.error('Error fetching models:', err);
      alert('Failed to load models.');
    }
  }

  btnNew.addEventListener('click', async () => {
    selectedModel = null;
    modelForm.reset();
    modelIdInput.value = '';
    await loadItemsForDropdown();
    modalElem.find('.modal-title').text('New Model');
    modalElem.modal('show');
  });

  btnEdit.addEventListener('click', async () => {
    if (!selectedModel) {
      alert('Please select a model row to edit.');
      return;
    }
    await loadItemsForDropdown();
    modelIdInput.value   = selectedModel.id;
    itemSelect.value     = selectedModel.item_id;
    modelName.value      = selectedModel.model_name;
    modelRemarks.value   = selectedModel.remarks || '';
    modalElem.find('.modal-title').text('Edit Model');
    modalElem.modal('show');
  });

  btnDelete.addEventListener('click', async () => {
    if (!selectedModel) {
      alert('Please select a model row to delete.');
      return;
    }
    if (!confirm(`Delete model "${selectedModel.model_name}"?`)) return;
    try {
      const res = await fetch(`/api/models/${selectedModel.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      await fetchModels();
      selectedModel = null;
    } catch(err) {
      console.error('Error deleting model:', err);
      alert('Failed to delete model.');
    }
  });

  btnRefresh.addEventListener('click', () => {
    fetchModels();
  });

  modelForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id         = modelIdInput.value;
    const payload    = {
      item_id   : itemSelect.value,
      model_name: modelName.value.trim(),
      remarks   : modelRemarks.value.trim()
    };
    if (!payload.item_id || !payload.model_name) {
      alert('Please fill Item and Model name.');
      return;
    }
    try {
      const url    = id ? `/api/models/${id}` : '/api/models';
      const method = id ? 'PUT' : 'POST';
      const res    = await fetch(url, {
        method,
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Save failed');
      modalElem.modal('hide');
      await fetchModels();
      selectedModel = null;
    } catch(err) {
      console.error('Error saving model:', err);
      alert('Failed to save model.');
    }
  });

  // initial load
  fetchModels();
});
