document.addEventListener("DOMContentLoaded", () => {
  const tableBody = document.getElementById("unitsTableBody");
  const btnNew = document.getElementById("btnNew");
  const btnEdit = document.getElementById("btnEdit");
  const btnDelete = document.getElementById("btnDelete");
  const btnRefresh = document.getElementById("btnRefresh");

  const unitForm = document.getElementById("unitForm");
  const unitModalElem = document.getElementById("unitModal");
  const unitModal = new bootstrap.Modal(unitModalElem);

  let selectedRow = null;
  let units = [];

  function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toISOString().slice(0, 10); // YYYY-MM-DD
  }

  function populateTable() {
    tableBody.innerHTML = "";
    units.forEach((unit) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${unit.id}</td>
        <td>${unit.item_name || ""}</td>
        <td>${unit.model_name || ""}</td>
        <td>${unit.serial_number || ""}</td>
        <td>${unit.brand || ""}</td>
        <td>${formatDate(unit.purchase_date)}</td>
        <td>${formatDate(unit.last_calibration)}</td>
        <td>${formatDate(unit.next_calibration)}</td>
        <td>${unit.po_number || ""}</td>
        <td>${unit.invoice_number || ""}</td>
        <td>${formatDate(unit.invoice_date)}</td>
        <td>${unit.amount || ""}</td>
        <td>${unit.subscription_info || ""}</td>
        <td>${formatDate(unit.last_updated)}</td>
        <td>${unit.last_updated_by || ""}</td>
        <td>${unit.remarks || ""}</td>
      `;
      row.addEventListener("click", () => {
        document.querySelectorAll("#unitsTable tbody tr").forEach(r => r.classList.remove("selected"));
        row.classList.add("selected");
        selectedRow = unit;
      });
      tableBody.appendChild(row);
    });
  }

  async function fetchUnits() {
    try {
      const res = await fetch("/api/units");
      units = await res.json();
      populateTable();
    } catch (err) {
      console.error("Error loading units:", err);
      alert("Failed to load units");
    }
  }

  async function loadItems() {
    const itemSelect = document.getElementById("itemSelect");
    itemSelect.innerHTML = "";
    const res = await fetch("/api/items");
    const items = await res.json();
    items.forEach(item => {
      const opt = document.createElement("option");
      opt.value = item.id;
      opt.textContent = item.name;
      itemSelect.appendChild(opt);
    });
  }

  async function loadModels() {
    const modelSelect = document.getElementById("modelSelect");
    modelSelect.innerHTML = "";
    const res = await fetch("/api/models");
    const models = await res.json();
    models.forEach(model => {
      const opt = document.createElement("option");
      opt.value = model.id;
      opt.textContent = model.name;
      modelSelect.appendChild(opt);
    });
  }

  btnNew.addEventListener("click", async () => {
    selectedRow = null;
    unitForm.reset();
    document.getElementById("unitId").value = "";
    await loadItems();
    await loadModels();
    unitModal.show();
  });

  btnEdit.addEventListener("click", async () => {
    if (!selectedRow) return alert("Select a row to edit.");
    await loadItems();
    await loadModels();
    document.getElementById("unitId").value = selectedRow.id;
    document.getElementById("itemSelect").value = selectedRow.item_id;
    document.getElementById("modelSelect").value = selectedRow.model_id;
    document.getElementById("serialNumber").value = selectedRow.serial_number || "";
    document.getElementById("brand").value = selectedRow.brand || "";
    document.getElementById("purchaseDate").value = formatDate(selectedRow.purchase_date);
    document.getElementById("lastCalibration").value = formatDate(selectedRow.last_calibration);
    document.getElementById("nextCalibration").value = formatDate(selectedRow.next_calibration);
    document.getElementById("poNumber").value = selectedRow.po_number || "";
    document.getElementById("invoiceNumber").value = selectedRow.invoice_number || "";
    document.getElementById("invoiceDate").value = formatDate(selectedRow.invoice_date);
    document.getElementById("amount").value = selectedRow.amount || "";
    document.getElementById("subscriptionInfo").value = selectedRow.subscription_info || "";
    document.getElementById("unitRemarks").value = selectedRow.remarks || "";
    unitModal.show();
  });

  btnDelete.addEventListener("click", async () => {
    if (!selectedRow) return alert("Select a row to delete.");
    if (!confirm("Are you sure you want to delete this unit?")) return;
    await fetch(`/api/units/${selectedRow.id}`, { method: "DELETE" });
    await fetchUnits();
  });

  unitForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const unit = {
      item_id: document.getElementById("itemSelect").value,
      model_id: document.getElementById("modelSelect").value,
      serial_number: document.getElementById("serialNumber").value,
      brand: document.getElementById("brand").value,
      purchase_date: document.getElementById("purchaseDate").value,
      last_calibration: document.getElementById("lastCalibration").value,
      next_calibration: document.getElementById("nextCalibration").value,
      po_number: document.getElementById("poNumber").value,
      invoice_number: document.getElementById("invoiceNumber").value,
      invoice_date: document.getElementById("invoiceDate").value,
      amount: document.getElementById("amount").value,
      subscription_info: document.getElementById("subscriptionInfo").value,
      remarks: document.getElementById("unitRemarks").value
    };

    const id = document.getElementById("unitId").value;
    const method = id ? "PUT" : "POST";
    const url = id ? `/api/units/${id}` : `/api/units`;

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(unit)
    });

    unitModal.hide();
    await fetchUnits();
  });

  btnRefresh.addEventListener("click", fetchUnits);

  fetchUnits();
});
