// API: GET /api/search?q=...
async function fetchSearchTransactions() {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve([
        { cat: 'Food & Dining', color: 'tag-yellow', desc: 'Shawarma Palace, Bashundhara', wallet: 'bKash', amount: '-৳350', date: 'Today, 2:30 PM' },
        { cat: 'Transport', color: 'tag-blue', desc: 'Uber — Gulshan to Dhanmondi', wallet: 'Cash', amount: '-৳180', date: 'Today, 11:15 AM' },
        { cat: 'Shopping', color: 'tag-orange', desc: 'Daraz — Running Shoes', wallet: 'BRAC Bank', amount: '-৳2,100', date: 'Yesterday' },
        { cat: 'Food & Dining', color: 'tag-yellow', desc: "Gloria Jean's Coffee, Banani", wallet: 'bKash', amount: '-৳320', date: 'Yesterday' },
        { cat: 'Utilities', color: 'tag-purple', desc: 'DESCO Electric Bill — July', wallet: 'BRAC Bank', amount: '-৳1,800', date: 'Jul 22' },
        { cat: 'Groceries', color: 'tag-blue', desc: 'Shwapno Superstore, Mirpur', wallet: 'Cash', amount: '-৳1,200', date: 'Jul 22' },
        { cat: 'Entertainment', color: 'tag-orange', desc: 'Netflix — Monthly Plan', wallet: 'BRAC Bank', amount: '-৳650', date: 'Jul 20' },
        { cat: 'Transport', color: 'tag-blue', desc: 'Pathao Bike — Office commute', wallet: 'Cash', amount: '-৳120', date: 'Jul 20' },
        { cat: 'Food & Dining', color: 'tag-yellow', desc: 'Star Kabab Restaurant', wallet: 'Cash', amount: '-৳480', date: 'Jul 19' },
        { cat: 'Shopping', color: 'tag-orange', desc: 'Aarong — Eid Shopping', wallet: 'BRAC Bank', amount: '-৳3,500', date: 'Jul 18' }
      ]);
    }, 50);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const transactions = await fetchSearchTransactions();
  const tbody = document.getElementById('searchResultsBody');

  function renderRows(list) {
    tbody.innerHTML = list.map(t => `
      <tr>
        <td><span class="table-cat"><i class="fa-solid fa-receipt"></i> ${t.cat}</span></td>
        <td><strong>${t.desc}</strong></td>
        <td><span class="wallet-pill">${t.wallet}</span></td>
        <td class="amount-minus">${t.amount}</td>
        <td class="date-col">${t.date}</td>
      </tr>
    `).join('');
  }

  renderRows(transactions);

  // Live filter mock
  document.getElementById('searchInput').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = transactions.filter(t => t.desc.toLowerCase().includes(term) || t.cat.toLowerCase().includes(term));
    renderRows(filtered);
    document.getElementById('resultsCount').textContent = `${filtered.length} transactions found`;
  });
});