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
          <td>${unit.item_name}</td>
          <td>${unit.model_name}</td>
          <td>${unit.serial_number || ""}</td>
          <td>${unit.brand || ""}</td>
          <td>${formatDateTime(unit.purchase_date)}</td>
          <td>${formatDateTime(unit.last_calibration)}</td>
          <td>${formatDateTime(unit.next_calibration)}</td>
          <td>${unit.po_number || ""}</td>
          <td>${unit.invoice_number || ""}</td>
          <td>${formatDateTime(unit.invoice_date)}</td>
          <td>${unit.amount ?? ""}</td>
          <td>${unit.subscription_info || ""}</td>
          <td>${unit.remarks || ""}</td>
          <td>${formatDateTime(unit.last_updated_on)}</td>
          <td>${unit.last_updated_by || ""}</td>
        `;

        // ✅ Highlight selected row
        row.addEventListener("click", () => {
          document.querySelectorAll("#unitsTableBody tr").forEach(r => r.classList.remove("selected"));
          row.classList.add("selected");
        });

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
