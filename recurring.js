// --- CONFIG ---
const SUPABASE_URL = "https://oybyvwcpyegfeedepktt.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95Ynl2d2NweWVnZmVlZGVwa3R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2Njc4MjEsImV4cCI6MjA2MDI0MzgyMX0.pn9ka-JxwN_psXlqMKash9iDuP6lEsYvBCmOEJcFDP0";
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const tbody = document.getElementById("rec-table-body");
const addBtn = document.getElementById("add-rec");

addBtn.addEventListener("click", async () => {
  const name = document.getElementById("rec-name").value;
  const amount = parseFloat(document.getElementById("rec-amount").value);
  const date = document.getElementById("rec-date").value;

  if (!name || isNaN(amount) || !date) {
    alert("Fill in all fields!");
    return;
  }

  await db.from("recurring").insert([{ name, amount, date }]);
  loadRecurring();
});

async function loadRecurring() {
  const { data } = await db.from("recurring").select("*").order("date", { ascending: true });
  tbody.innerHTML = "";

  const today = new Date();

  (data || []).forEach(entry => {
    const row = document.createElement("tr");

    // Editable Name
    const nameCell = document.createElement("td");
    nameCell.contentEditable = true;
    nameCell.textContent = entry.name;
    nameCell.addEventListener("blur", () =>
      updateEntry(entry.id, "name", nameCell.textContent)
    );
    row.appendChild(nameCell);

    // Editable Amount
    const amountCell = document.createElement("td");
    amountCell.contentEditable = true;
    amountCell.textContent = entry.amount.toFixed(2);
    amountCell.addEventListener("blur", () =>
      updateEntry(entry.id, "amount", parseFloat(amountCell.textContent))
    );
    row.appendChild(amountCell);

    // Editable Date
    const dateCell = document.createElement("td");
    const dateInput = document.createElement("input");
    dateInput.type = "date";
    dateInput.value = entry.date;
    dateInput.addEventListener("change", () =>
      updateEntry(entry.id, "date", dateInput.value)
    );
    dateCell.appendChild(dateInput);
    row.appendChild(dateCell);

    // Days Remaining
    const dateObj = new Date(entry.date);
    let daysDiff = Math.ceil((dateObj - today) / (1000 * 60 * 60 * 24));
    if (daysDiff < 0) {
      // Auto-forward 1 month
      const newDate = new Date(dateObj.setMonth(dateObj.getMonth() + 1));
      const newStr = newDate.toISOString().split("T")[0];
      updateEntry(entry.id, "date", newStr);
      daysDiff = Math.ceil((newDate - today) / (1000 * 60 * 60 * 24));
    }

    const daysCell = document.createElement("td");
    daysCell.textContent = `${daysDiff} day${daysDiff !== 1 ? "s" : ""}`;
    row.appendChild(daysCell);

    // Delete Button
    const delCell = document.createElement("td");
    const delBtn = document.createElement("button");
    delBtn.textContent = "🗑";
    delBtn.addEventListener("click", () => deleteEntry(entry.id));
    delCell.appendChild(delBtn);
    row.appendChild(delCell);

    tbody.appendChild(row);
  });
}

async function updateEntry(id, field, value) {
  await db.from("recurring").update({ [field]: value }).eq("id", id);
  loadRecurring();
}

async function deleteEntry(id) {
  await db.from("recurring").delete().eq("id", id);
  loadRecurring();
}

loadRecurring();
