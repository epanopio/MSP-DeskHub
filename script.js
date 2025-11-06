function showTab(tabId, event) {
  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

  // Show selected tab
  document.getElementById(tabId).style.display = 'block';
  event.target.classList.add('active');
}
