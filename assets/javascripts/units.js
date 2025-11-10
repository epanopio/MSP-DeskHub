document.addEventListener("DOMContentLoaded", () => {
  const tableBody = document.getElementById("unitsTableBody");
  const btnNew = document.getElementById("btnNew");
  const btnEdit = document.getElementById("btnEdit");
  const btnDelete = document.getElementById("btnDelete");
  const btnRefresh = document.getElementById("btnRefresh");
  const unitForm = document.getElementById("unitForm");
  const unitModalElem = document.getElementById("unitModal");
  const unitModal = new bootstrap.Modal(unitModalElem);

  let selectedUnit = null;
  let unitsList   = [];

  function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    const yyyy = d.getFullYear();
    const mm   = String(d.getMonth()+1).padStart(2, "0");
    const dd   = String(d.getDate()).padStart(2, "0");
    const hh   = String(d.getHours()).padStart(2, "0");
    const mi   = String(d.getMinutes()).padStart(2, "0");
    const ss   = String(d.getSeconds()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
  }

  async function fetchUnits() {
    try {
      const resp = await fetch("/api/units");
      if (!resp.ok) throw new Error("Failed to fetch units");
      unitsList = await resp.json();
      renderTable();
    } catch(err) {
      console.error("fetchUnits error:", err);
      alert("Failed to load units");
    }
  }

  async function loadItems() {
    const sel = document.getElementById("unitItem");
    sel.innerHTML = "";
    const resp = await fetch("/api/items");
    const items = await resp.json();
    items.forEach(i => {
      const opt = document.createElement("option");
      opt.value = i.id;
      opt.textContent = i.name;
      sel.appendChild(opt);
    });
  }

  async function loadModels() {
    const sel = document.getElementById("unitModel");
    sel.innerHTML = "";
    const resp = await fetch("/api/models");
    const models = await resp.json();
    models.forEach(m => {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = m.model_name || m.name;
      sel.appendChild(opt);
    });
  }

  function renderTable() {
    tableBody.innerHTML = "";
    unitsList.forEach(u => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${u.id}</td>
        <td>${u.item_name || ""}</td>
        <td>${u.model_name || ""}</td>
        <td>${u.serial_number || ""}</td>
        <td>${u.brand || ""}</td>
        <td>${formatDate(u.purchase_date)}</td>
        <td>${formatDate(u.last_calibration)}</td>
        <td>${formatDate(u.next_calibration)}</td>
        <td>${u.po_number || ""}</td>
        <td>${u.invoice_number || ""}</td>
        <td>${formatDate(u.invoice_date)}</td>
        <td>${u.amount || ""}</td>
        <td>${u.subscription_info || ""}</td>
        <td>${formatDate(u.last_updated_on)}</td>
        <td>${u.last_updated_by || ""}</td>
        <td>${u.remarks || ""}</td>
      `;
      tr.addEventListener("click", () => {
        document.querySelectorAll("#unitsTableBody tr").forEach(r => r.classList.remove("selected"));
        tr.classList.add("selected");
        selectedUnit = u;
      });
      tableBody.appendChild(tr);
    });
    document.getElementById("rowCount").dispatchEvent(new Event("change"));
  }

  btnNew.addEventListener("click", async () => {
    selectedUnit = null;
    unitForm.reset();
    document.getElementById("unitId").value = "";
    await loadItems();
    await loadModels();
    unitModal.show();
  });

  btnEdit.addEventListener("click", async () => {
    if (!selectedUnit) {
      alert("Please select a row to edit");
      return;
    }
    await loadItems();
    await loadModels();
    document.getElementById("unitId").value         = selectedUnit.id;
    document.getElementById("unitItem").value       = selectedUnit.item_id;
    document.getElementById("unitModel").value      = selectedUnit.model_id;
    document.getElementById("serialNumber").value   = selectedUnit.serial_number || "";
    document.getElementById("brand").value          = selectedUnit.brand || "";
    document.getElementById("purchaseDate").value   = selectedUnit.purchase_date?.split("T")[0] || "";
    document.getElementById("lastCalibration").value= selectedUnit.last_calibration?.split("T")[0] || "";
    document.getElementById("nextCalibration").value= selectedUnit.next_calibration?.split("T")[0] || "";
    document.getElementById("poNumber").value       = selectedUnit.po_number || "";
    document.getElementById("invoiceNumber").value  = selectedUnit.invoice_number || "";
    document.getElementById("invoiceDate").value    = selectedUnit.invoice_date?.split("T")[0] || "";
    document.getElementById("amount").value         = selectedUnit.amount || "";
    document.getElementById("subscriptionInfo").value= selectedUnit.subscription_info || "";
    document.getElementById("unitRemarks").value    = selectedUnit.remarks || "";
    unitModal.show();
  });

  btnDelete.addEventListener("click", async () => {
    if (!selectedUnit) {
      alert("Please select a row to delete");
      return;
    }
    if (!confirm("Delete selected unit?")) return;
    try {
      const resp = await fetch(`/api/units/${selectedUnit.id}`, { method: "DELETE" });
      if (!resp.ok) throw new Error("Delete failed");
      await fetchUnits();
    } catch(err) {
      console.error("Delete error:", err);
      alert("Delete failed");
    }
  });

  btnRefresh.addEventListener("click", fetchUnits);

  unitForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      item_id:       document.getElementById("unitItem").value,
      model_id:      document.getElementById("unitModel").value,
      serial_number: document.getElementById("serialNumber").value,
      brand:         document.getElementById("brand").value,
      purchase_date: document.getElementById("purchaseDate").value,
      last_calibration: document.getElementById("lastCalibration").value,
      next_calibration: document.getElementById("nextCalibration").value,
      po_number:       document.getElementById("poNumber").value,
      invoice_number:  document.getElementById("invoiceNumber").value,
      invoice_date:    document.getElementById("invoiceDate").value,
      amount:          document.getElementById("amount").value,
      subscription_info: document.getElementById("subscriptionInfo").value,
      remarks:          document.getElementById("unitRemarks").value
    };
    const id = document.getElementById("unitId").value;
    const url = id ? `/api/units/${id}` : `/api/units`;
    const method = id ? "PUT" : "POST";
    try {
      const resp = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!resp.ok) throw new Error("Save failed");
      unitModal.hide();
      await fetchUnits();
    } catch(err) {
      console.error("Save error:", err);
      alert("Save failed");
    }
  });

  // initial load
  fetchUnits();
});
