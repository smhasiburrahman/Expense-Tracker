// API: PUT /api/user/settings
document.getElementById('settingsForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const fullName = document.getElementById('profileFullName').value;
  const email = document.getElementById('profileEmail').value;
  const income = document.getElementById('monthlyIncome').value;

  console.log("Updated settings payload:", { fullName, email, income });
  alert("Settings updated successfully!");
});