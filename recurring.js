// --- CONFIG ---
const SUPABASE_URL = "https://oybyvwcpyegfeedepktt.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95Ynl2d2NweWVnZmVlZGVwa3R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2Njc4MjEsImV4cCI6MjA2MDI0MzgyMX0.pn9ka-JxwN_psXlqMKash9iDuP6lEsYvBCmOEJcFDP0";
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- DOM ---
const addBtn = document.getElementById("add-rec");
const tableBody = document.getElementById("rec-table-body");

// --- Add Recurring Transaction ---
addBtn.addEventListener("click", async () => {
  const name = document.getElementById("rec-name").value;
  const amount = parseFloat(document.getElementById("rec-amount").value);
  const date = document.getElementById("rec-date").value;
  const user = document.getElementById("rec-user").value;

  if (!name || isNaN(amount) || !date) {
    alert("Fill out all fields correctly!");
    return;
  }

  await db.from("recurring").insert([{ name, amount, date, user_name: user }]);
  loadRecurring();
  document.getElementById("rec-name").value = "";
  document.getElementById("rec-amount").value = "";
  document.getElementById("rec-date").value = "";
});

// --- Load Recurring Transactions ---
async function loadRecurring() {
  const { data } = await db.from("recurring").select("*").order("date");

  tableBody.innerHTML = "";

  (data || []).forEach(item => {
    const tr = document.createElement("tr");

    const daysLeft = Math.ceil((new Date(item.date) - new Date()) / (1000 * 60 * 60 * 24));

    tr.innerHTML = `
      <td>${item.user_name}</td>
      <td contenteditable="true" onblur="updateRec(${item.id}, 'name', this.textContent)">${item.name}</td>
      <td contenteditable="true" onblur="updateRec(${item.id}, 'amount', parseFloat(this.textContent))">$${item.amount.toFixed(2)}</td>
      <td><input type="date" value="${item.date}" onchange="updateRec(${item.id}, 'date', this.value)" /></td>
      <td>${daysLeft} day(s)</td>
      <td><button onclick="deleteRec(${item.id})">🗑️ Delete</button></td>
    `;
    tableBody.appendChild(tr);
  });
}

// --- Update Entry ---
async function updateRec(id, field, value) {
  await db.from("recurring").update({ [field]: value }).eq("id", id);
  loadRecurring();
}

// --- Delete Entry ---
async function deleteRec(id) {
  if (confirm("Are you sure you want to delete this recurring transaction?")) {
    await db.from("recurring").delete().eq("id", id);
    loadRecurring();
  }
}

loadRecurring();
