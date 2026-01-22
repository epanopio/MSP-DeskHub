/* Table sorting: add clickable headers that sort table rows (ascending/descending). Applies to #itemsTable, #modelsTable, #UnitsTable */
document.addEventListener('DOMContentLoaded', () => {
  function makeSortable(tableId) {
    const table = document.getElementById(tableId);
    if (!table) return;
    const tbody = table.tBodies[0];
    if (!tbody) return;

    const ths = Array.from(table.querySelectorAll('th'));

    ths.forEach((th, colIndex) => {
      th.style.cursor = 'pointer';
      // Add visual hint (will be provided via CSS when classes are toggled)
      th.addEventListener('click', () => {
        const rows = Array.from(tbody.querySelectorAll('tr'));

        // Determine current sort direction (if this header was last-sorted)
        const currentlyAsc = th.classList.contains('sort-asc');
        const ascending = !currentlyAsc; // toggle

        const getCellValue = (row, idx) => {
          const cell = row.children[idx];
          if (!cell) return '';
          const text = cell.textContent.trim();

          // Try numeric
          const num = parseFloat(text.replace(/[^0-9.+-eE]/g, ''));
          if (!isNaN(num) && text !== '') return num;

          // Try date
          const dt = Date.parse(text);
          if (!isNaN(dt)) return dt;

          // Fallback string
          return text.toLowerCase();
        };

        rows.sort((a, b) => {
          const aVal = getCellValue(a, colIndex);
          const bVal = getCellValue(b, colIndex);

          if (aVal === bVal) return 0;

          // Numbers
          if (typeof aVal === 'number' && typeof bVal === 'number') {
            return ascending ? aVal - bVal : bVal - aVal;
          }

          // Mixed (date is number)
          if (typeof aVal === 'number' || typeof bVal === 'number') {
            return ascending ? (aVal < bVal ? -1 : 1) : (aVal < bVal ? 1 : -1);
          }

          // Strings
          return ascending ? (aVal > bVal ? 1 : -1) : (aVal > bVal ? -1 : 1);
        });

        // Re-attach rows in sorted order
        rows.forEach(r => tbody.appendChild(r));

        // Update header classes
        ths.forEach(h => h.classList.remove('sort-asc', 'sort-desc'));
        th.classList.add(ascending ? 'sort-asc' : 'sort-desc');
      });
    });
  }

  ['itemsTable', 'modelsTable', 'UnitsTable'].forEach(makeSortable);
});