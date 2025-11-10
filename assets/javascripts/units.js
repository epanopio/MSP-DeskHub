document.addEventListener("DOMContentLoaded", () => {
  const tableBody = document.getElementById("unitsTableBody");
  const modal = new bootstrap.Modal(document.getElementById("itemModal"));
  const form = document.getElementById("itemForm");
  let selectedId = null;

  // ✅ Load Items into dropdown
  async function loadItems() {
    try {
      const res = await fetch("/api/items");
      const items = await res.json();
      const itemSelect = document.getElementById("itemName");

      itemSelect.innerHTML = '<option value="">-- Select Item --</option>';
      items.forEach(item => {
        const option = document.createElement("option");
        option.value = item.name;
        option.textContent = item.name;
        itemSelect.appendChild(option);
      });
    } catch (err) {
      console.error("Failed to load items:", err);
    }
  }

  // ✅ Load Models based on selected Item
  async function loadModelsForItem(itemName) {
    try {
      const res = await fetch("/api/models");
      const models = await res.json();
      const modelSelect = document.getElementById("model");

      modelSelect.innerHTML = '<option value="">-- Select Model --</option>';
      models
        .filter(model => model.item_name === itemName)
        .forEach(model => {
          const option = document.createElement("option");
          option.value = model.model_name;
          option.textContent = model.model_name;
          modelSelect.appendChild(option);
        });
    } catch (err) {
      console.error("Failed to load models:", err);
    }
  }

  // 🔁 Load models when item changes
  document.getElementById("itemName").addEventListener("change", (e) => {
    loadModelsForItem(e.target.value);
  });

  // 📄 Fetch and display Units
  async function fetchUnits() {
    const res = await fetch("/api/units");
    const units = await res.json();

    tableBody.innerHTML = "";
    units.forEach(unit => {
      const row = document.createElement("tr");
      row.dataset.id = unit.id;

      row.innerHTML = `
        <td>${unit.id}</td>
        <td>${unit.item}</td>
        <td>${unit.model}</td>
        <td>${unit.serial}</td>
        <td>${unit.brand}</td>
        <td>${unit.purchase_date || ""}</td>
        <td>${unit.last_calibration || ""}</td>
        <td>${unit.next_calibration || ""}</td>
        <td>${unit.po_number}</td>
        <td>${unit.invoice_number}</td>
        <td>${unit.invoice_date || ""}</td>
        <td>${unit.amount}</td>
        <td>${unit.subscription_info}</td>
        <td>${unit.remarks}</td>
        <td>${unit.last_updated || ""}</td>
      `;

      row.addEventListener("click", () => {
        [...tableBody.children].forEach(r => r.classList.remove("selected"));
        row.classList.add("selected");
        selectedId = unit.id;
      });

      tableBody.appendChild(row);
    });
  }

  // 🧾 Extract form data
  function getFormData() {
    return {
      item: document.getElementById("itemName").value,
      model: document.getElementById("model").value,
      serial: document.getElementById("serial").value,
      brand: document.getElementById("brand").value,
      purchaseDate: document.getElementById("purchaseDate").value,
      lastCalibration: document.getElementById("lastCalibration").value,
      nextCalibration: document.getElementById("nextCalibration").value,
      poNumber: document.getElementById("poNumber").value,
      invoiceNumber: document.getElementById("invoiceNumber").value,
      invoiceDate: document.getElementById("invoiceDate").value,
      amount: document.getElementById("amount").value,
      subscriptionInfo: document.getElementById("subscriptionInfo").value,
      remarks: document.getElementById("itemRemarks").value,
      lastUpdated: document.getElementById("lastUpdated").value
    };
  }

  // 📥 Fill modal with unit data
  function fillForm(unit) {
    document.getElementById("itemId").value = unit.id;
    document.getElementById("itemName").value = unit.item;
    document.getElementById("model").value = unit.model;
    document.getElementById("serial").value = unit.serial;
    document.getElementById("brand").value = unit.brand;
    document.getElementById("purchaseDate").value = unit.purchase_date || "";
    document.getElementById("lastCalibration").value = unit.last_calibration || "";
    document.getElementById("nextCalibration").value = unit.next_calibration || "";
    document.getElementById("poNumber").value = unit.po_number;
    document.getElementById("invoiceNumber").value = unit.invoice_number;
    document.getElementById("invoiceDate").value = unit.invoice_date || "";
    document.getElementById("amount").value = unit.amount;
    document.getElementById("subscriptionInfo").value = unit.subscription_info;
    document.getElementById("itemRemarks").value = unit.remarks;
    document.getElementById("lastUpdated").value = unit.last_updated || "";
  }

  // 🆕 New Unit
  document.getElementById("btnNew").addEventListener("click", () => {
    form.reset();
    selectedId = null;
    loadItems();
    document.getElementById("model").innerHTML = '<option value="">-- Select Model --</option>';
    modal.show();
  });

  // ✏️ Edit Unit
  document.getElementById("btnEdit").addEventListener("click", async () => {
    if (!selectedId) return alert("Please select a unit first.");
    const res = await fetch("/api/units");
    const units = await res.json();
    const unit = units.find(u => u.id == selectedId);
    if (unit) {
      await loadItems();
      await loadModelsForItem(unit.item);
      fillForm(unit);
      modal.show();
    }
  });

  // ❌ Delete Unit
  document.getElementById("btnDelete").addEventListener("click", async () => {
    if (!selectedId) return alert("Please select a unit to delete.");
    if (confirm("Are you sure you want to delete this unit?")) {
      await fetch(`/api/units/${selectedId}`, { method: "DELETE" });
      selectedId = null;
      fetchUnits();
    }
  });

  // 🔄 Refresh List
  document.getElementById("btnRefresh").addEventListener("click", fetchUnits);

  // 💾 Save Unit
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = getFormData();

    const method = selectedId ? "PUT" : "POST";
    const url = selectedId ? `/api/units/${selectedId}` : "/api/units";

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    modal.hide();
    selectedId = null;
    fetchUnits();
  });

  // 🔄 Load table on page load
  fetchUnits();
});
