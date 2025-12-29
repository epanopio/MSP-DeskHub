let editingUnitId = null;

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
  document.getElementById("btnDelete").addEventListener("click", handleDelete);
  document.getElementById("btnRefresh").addEventListener("click", loadUnits);

  document.getElementById("itemSelect").addEventListener("change", e => {
    populateModelDropdown(e.target.value);
  });

  document.getElementById("itemForm").addEventListener("submit", handleSubmit);
});

// Format datetime as yyyy-mm-dd hh:mm
function formatDateTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

// Format date only as yyyy-mm-dd (for table display); full date-time retained in title
function formatDateOnly(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
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
  document.getElementById('viewUnitRemarks').textContent = unit.remarks || '';
  document.getElementById('viewUnitUpdated').textContent = formatDateTime(unit.last_updated_on) || '';
  $('#unitViewModal').modal('show');
}

// LOAD TABLE DATA
function loadUnits() {
  fetch("/api/units")
    .then(res => res.json())
    .then(data => {
      const tbody = document.getElementById("unitsTableBody");
      tbody.innerHTML = "";

      data.forEach(unit => {
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
          <td title="${(unit.remarks||'').replace(/"/g, '&quot;')}">${unit.remarks || ""}</td>
          <td title="${formatDateTime(unit.last_updated_on)}">${formatDateOnly(unit.last_updated_on)}</td>
          <td title="${(unit.last_updated_by||'').replace(/"/g, '&quot;')}">${unit.last_updated_by || ""}</td>
        `;

        // ✅ Highlight selected row
        row.addEventListener("click", () => {
          document.querySelectorAll("#unitsTableBody tr").forEach(r => r.classList.remove("selected"));
          row.classList.add("selected");
        });
        // double-click shows read-only view modal
        row.addEventListener('dblclick', () => showUnitView(unit));

        tbody.appendChild(row);
      });
    });
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
    remarks: remarks.value || null,
    last_updated_by: "system"
  };

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

  fetch(`/api/units/${editingUnitId}`)
    .then(res => res.json())
    .then(unit => {
      document.getElementById("itemModalLabel").textContent = "Edit Unit";

      itemSelect.value = unit.item_id;
      populateModelDropdown(unit.item_id, unit.model_id);

      serial_number.value = unit.serial_number || "";
      brand.value = unit.brand || "";
      purchase_date.value = unit.purchase_date || "";
      last_calibration.value = unit.last_calibration || "";
      next_calibration.value = unit.next_calibration || "";
      po_number.value = unit.po_number || "";
      invoice_number.value = unit.invoice_number || "";
      invoice_date.value = unit.invoice_date || "";
      amount.value = unit.amount || "";
      subscription_info.value = unit.subscription_info || "";
      remarks.value = unit.remarks || "";

      $("#itemUnits").modal("show");
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
