let editingUnitId = null;
let unitsCache = [];
let currentUnitsTab = 'all';

document.addEventListener("DOMContentLoaded", () => {
  loadDropdowns();
  loadUnits();

  document.getElementById("btnNew").addEventListener("click", () => {
    editingUnitId = null;
    document.getElementById("itemForm").reset();
    document.getElementById("itemModalLabel").textContent = "New Unit";
    $("#itemUnits").modal("show");
  });

  document.getElementById("btnEdit").addEventListener("click", handleEdit);
  const editBtn = document.getElementById("btnEdit");
  if (editBtn) editBtn.addEventListener("click", handleEdit);
  document.getElementById("btnDelete").addEventListener("click", handleDelete);
  document.getElementById("btnRefresh").addEventListener("click", loadUnits);

  document.getElementById("itemSelect").addEventListener("change", e => {
    populateModelDropdown(e.target.value);
  });

  document.getElementById("itemForm").addEventListener("submit", handleSubmit);

  // Tab switching
  document.querySelectorAll('#unitsTabs a[data-tab]').forEach(tabLink => {
    tabLink.addEventListener('click', (e) => {
      e.preventDefault();
      const target = tabLink.getAttribute('data-tab');
      if (!target) return;
      currentUnitsTab = target;
      document.querySelectorAll('#unitsTabs li').forEach(li => li.classList.remove('active'));
      tabLink.parentElement.classList.add('active');
      renderUnitsTable();
    });
  });
});

// Format datetime as yyyy-MMM-dd hh:mm
function formatDateTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const yyyy = date.getFullYear();
  const mmm = months[date.getMonth()];
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mmm}-${dd} ${hh}:${min}`;
}

// Format date only as yyyy-MMM-dd (for table display)
function formatDateOnly(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const yyyy = date.getFullYear();
  const mmm = months[date.getMonth()];
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mmm}-${dd}`;
}

// LOAD ITEMS
async function loadDropdowns() {
  const itemsRes = await fetch("/api/items");
  const items = await itemsRes.json();

  const itemSelect = document.getElementById("itemSelect");
  itemSelect.innerHTML = `<option value="">Select Item</option>`;
  items.forEach(item => {
    const opt = document.createElement("option");
    opt.value = item.id;
    opt.textContent = item.name;
    itemSelect.appendChild(opt);
  });
}

// LOAD MODELS BASED ON ITEM
async function populateModelDropdown(selectedItemId, selectedModelId = null) {
  const modelSelect = document.getElementById("modelSelect");
  modelSelect.innerHTML = `<option>Loading models...</option>`;

  if (!selectedItemId) return;

  try {
    const res = await fetch(`/api/models/by-item/${selectedItemId}`);
    if (!res.ok) throw new Error("Failed to fetch models");

    const models = await res.json();
    modelSelect.innerHTML = `<option value="">Select Model</option>`;

    models.forEach(model => {
      const opt = document.createElement("option");
      opt.value = model.id;
      opt.textContent = model.name;
      modelSelect.appendChild(opt);
    });

    if (selectedModelId) {
      modelSelect.value = selectedModelId;
    }
  } catch (err) {
    console.error("Error loading models:", err);
    modelSelect.innerHTML = `<option>Error loading models</option>`;
  }
}

// Show unit details in a read-only modal (double-click)
function showUnitView(unit) {
  const r1 = unit.remarks1 ?? unit.unit_remarks1 ?? unit.remarks ?? '';
  const r2 = unit.remarks2 ?? unit.unit_remarks2 ?? '';
  const r3 = unit.remarks3 ?? unit.unit_remarks3 ?? '';
  document.getElementById('viewUnitId').textContent = unit.id || '';
  document.getElementById('viewUnitItem').textContent = unit.item_name || '';
  document.getElementById('viewUnitModel').textContent = unit.model_name || '';
  document.getElementById('viewUnitSerial').textContent = unit.serial_number || '';
  document.getElementById('viewUnitBrand').textContent = unit.brand || '';
  document.getElementById('viewUnitPurchase').textContent = formatDateOnly(unit.purchase_date) || '';
  document.getElementById('viewUnitLastCal').textContent = formatDateOnly(unit.last_calibration) || '';
  document.getElementById('viewUnitNextCal').textContent = formatDateOnly(unit.next_calibration) || '';
  document.getElementById('viewUnitPO').textContent = unit.po_number || '';
  document.getElementById('viewUnitInvoice').textContent = unit.invoice_number || '';
  document.getElementById('viewUnitInvoiceDate').textContent = formatDateOnly(unit.invoice_date) || '';
  document.getElementById('viewUnitAmount').textContent = unit.amount ?? '';
  document.getElementById('viewUnitSubscription').textContent = unit.subscription_info || '';
  document.getElementById('viewUnitRemarks1').textContent = r1;
  document.getElementById('viewUnitRemarks2').textContent = r2;
  document.getElementById('viewUnitRemarks3').textContent = r3;
  document.getElementById('viewUnitUpdated').textContent = formatDateTime(unit.last_updated_on) || '';
  $('#unitViewModal').modal('show');
}

// LOAD TABLE DATA
function loadUnits() {
  fetch("/api/units")
    .then(res => res.json())
    .then(data => {
      unitsCache = data;
      renderUnitsTable();
    });
}

function renderUnitsTable() {
  const tbody = document.getElementById("unitsTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const filterByTab = (unit) => {
    const name = (unit.item_name || '').toLowerCase();
    if (currentUnitsTab === 'total') return name.includes('total station');
    if (currentUnitsTab === 'sim') return name.includes('sim card') || name.includes('simcard');
    if (currentUnitsTab === 'others') {
      return !name.includes('total station') && !(name.includes('sim card') || name.includes('simcard'));
    }
    return true;
  };

  const filtered = unitsCache.filter(filterByTab);

  filtered.forEach(unit => {
    const r1 = unit.remarks1 ?? unit.unit_remarks1 ?? unit.remarks ?? '';
    const r2 = unit.remarks2 ?? unit.unit_remarks2 ?? '';
    const r3 = unit.remarks3 ?? unit.unit_remarks3 ?? '';
    const row = document.createElement("tr");
    row.dataset.id = unit.id;
    row.innerHTML = `
      <td>${unit.id}</td>
      <td title="${(unit.item_name||'').replace(/"/g, '&quot;')}">${unit.item_name}</td>
      <td title="${(unit.model_name||'').replace(/"/g, '&quot;')}">${unit.model_name}</td>
      <td title="${(unit.serial_number||'').replace(/"/g, '&quot;')}">${unit.serial_number || ""}</td>
      <td title="${(unit.brand||'').replace(/"/g, '&quot;')}">${unit.brand || ""}</td>
      <td title="${formatDateTime(unit.purchase_date)}">${formatDateOnly(unit.purchase_date)}</td>
      <td title="${formatDateTime(unit.last_calibration)}">${formatDateOnly(unit.last_calibration)}</td>
      <td title="${formatDateTime(unit.next_calibration)}">${formatDateOnly(unit.next_calibration)}</td>
      <td title="${(unit.po_number||'').replace(/"/g, '&quot;')}">${unit.po_number || ""}</td>
      <td title="${(unit.invoice_number||'').replace(/"/g, '&quot;')}">${unit.invoice_number || ""}</td>
      <td title="${formatDateTime(unit.invoice_date)}">${formatDateOnly(unit.invoice_date)}</td>
      <td title="${String(unit.amount ?? '')}">${unit.amount ?? ""}</td>
      <td title="${(unit.subscription_info||'').replace(/"/g, '&quot;')}">${unit.subscription_info || ""}</td>
      <td title="${r1.replace(/"/g, '&quot;')}">${r1}</td>
      <td title="${r2.replace(/"/g, '&quot;')}">${r2}</td>
      <td title="${r3.replace(/"/g, '&quot;')}">${r3}</td>
      <td title="${formatDateTime(unit.last_updated_on)}">${formatDateOnly(unit.last_updated_on)}</td>
      <td title="${(unit.last_updated_by||'').replace(/"/g, '&quot;')}">${unit.last_updated_by || ""}</td>
    `;

    row.addEventListener("click", () => {
      document.querySelectorAll("#unitsTableBody tr").forEach(r => r.classList.remove("selected"));
      row.classList.add("selected");
    });
    row.addEventListener('dblclick', () => showUnitView(unit));

    tbody.appendChild(row);
  });

  if (typeof window.applyUnitsPagination === 'function') {
    window.applyUnitsPagination();
  }
  if (typeof filterTable === 'function') {
    filterTable();
  }
}

// SAVE UNIT
function handleSubmit(e) {
  e.preventDefault();

  const data = {
    item_id: itemSelect.value,
    model_id: modelSelect.value,
    serial_number: serial_number.value,
    brand: brand.value,
    purchase_date: purchase_date.value || null,
    last_calibration: last_calibration.value || null,
    next_calibration: next_calibration.value || null,
    po_number: po_number.value || null,
    invoice_number: invoice_number.value || null,
    invoice_date: invoice_date.value || null,
    amount: amount.value || null,
    subscription_info: subscription_info.value || null,
    remarks1: remarks1.value || null,
    remarks2: remarks2.value || null,
    remarks3: remarks3.value || null,
    last_updated_by: "system"
  };
  const serialLower = (serial_number.value || '').trim().toLowerCase();
  if (serialLower) {
    const dup = unitsCache.find(u =>
      (u.serial_number || '').toLowerCase() === serialLower &&
      String(u.id) !== String(editingUnitId || '')
    );
    if (dup) {
      alert('Serial number already exists.');
      return;
    }
  }

  const url = editingUnitId ? `/api/units/${editingUnitId}` : "/api/units";
  const method = editingUnitId ? "PUT" : "POST";

  fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })
    .then(res => res.json())
    .then(() => {
      $("#itemUnits").modal("hide");
      loadUnits();
    })
    .catch(() => alert("Failed to save unit"));
}

// EDIT UNIT
function handleEdit() {
  const row = document.querySelector("#unitsTableBody tr.selected");
  if (!row) return alert("Please select a unit.");

  editingUnitId = row.dataset.id;

  const toInputDate = (val) => {
    if (!val) return '';
    const s = String(val);
    return s.includes('T') ? s.split('T')[0] : s;
  };

  fetch(`/api/units/${editingUnitId}`)
    .then(res => {
      if (!res.ok) throw new Error('Failed to load unit');
      return res.json();
    })
    .then(unit => {
      document.getElementById("itemModalLabel").textContent = "Edit Unit";

      itemSelect.value = unit.item_id;
      populateModelDropdown(unit.item_id, unit.model_id);

      serial_number.value = unit.serial_number || "";
      brand.value = unit.brand || "";
      purchase_date.value = toInputDate(unit.purchase_date);
      last_calibration.value = toInputDate(unit.last_calibration);
      next_calibration.value = toInputDate(unit.next_calibration);
      po_number.value = unit.po_number || "";
      invoice_number.value = unit.invoice_number || "";
      invoice_date.value = toInputDate(unit.invoice_date);
      amount.value = unit.amount || "";
      subscription_info.value = unit.subscription_info || "";
      const r1 = unit.remarks1 ?? unit.unit_remarks1 ?? unit.remarks ?? "";
      const r2 = unit.remarks2 ?? unit.unit_remarks2 ?? "";
      const r3 = unit.remarks3 ?? unit.unit_remarks3 ?? "";
      remarks1.value = r1;
      remarks2.value = r2;
      if (document.getElementById('remarks3')) {
        document.getElementById('remarks3').value = r3;
      }

      $("#itemUnits").modal("show");
    })
    .catch(err => {
      console.error(err);
      alert('Failed to load unit details.');
    });
}

// DELETE UNIT
function handleDelete() {
  const row = document.querySelector("#unitsTableBody tr.selected");
  if (!row) return alert("Select a unit to delete.");

  if (confirm("Delete this unit?")) {
    fetch(`/api/units/${row.dataset.id}`, { method: "DELETE" })
      .then(() => loadUnits());
  }
}
