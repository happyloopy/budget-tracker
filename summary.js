const SUPABASE_URL = "https://oybyvwcpyegfeedepktt.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.getElementById("load-summary").addEventListener("click", loadSummary);
document.getElementById("export-csv").addEventListener("click", exportCSV);

async function loadSummary() {
    const user = document.getElementById("user-filter").value;
    const from = document.getElementById("from-date").value;
    const to = document.getElementById("to-date").value;

    let query = db.from('transactions').select('*');

    if (user) query = query.eq('user_name', user);
    if (from) query = query.gte('date', from);
    if (to) query = query.lte('date', to);

    const { data } = await query;

    const categories = {};
    (data || []).forEach(tx => {
        if (!categories[tx.category]) {
            categories[tx.category] = { income: 0, expense: 0 };
        }

        if (tx.type === "income") {
            categories[tx.category].income += tx.amount;
        } else {
            categories[tx.category].expense += tx.amount;
        }
    });

    const tbody = document.querySelector("#summary-table tbody");
    tbody.innerHTML = "";

    let totalIncome = 0;
    let totalExpense = 0;

    Object.keys(categories).forEach(category => {
        const income = categories[category].income;
        const expense = categories[category].expense;
        const net = income - expense;

        totalIncome += income;
        totalExpense += expense;

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${category}</td>
            <td class="summary-income">$${income.toFixed(2)}</td>
            <td class="summary-expense">$${expense.toFixed(2)}</td>
            <td>${net >= 0 ? "+" : ""}$${net.toFixed(2)}</td>
        `;
        tbody.appendChild(row);
    });

    const totalRow = document.createElement("tr");
    totalRow.innerHTML = `
        <td><strong>Total</strong></td>
        <td class="summary-income"><strong>$${totalIncome.toFixed(2)}</strong></td>
        <td class="summary-expense"><strong>$${totalExpense.toFixed(2)}</strong></td>
        <td><strong>${(totalIncome - totalExpense).toFixed(2)}</strong></td>
    `;
    tbody.appendChild(totalRow);
}

function exportCSV() {
    let rows = [["Category", "Total Income", "Total Expense", "Net"]];
    document.querySelectorAll("#summary-table tbody tr").forEach(tr => {
        const cols = Array.from(tr.querySelectorAll("td")).map(td => td.textContent);
        rows.push(cols);
    });

    const csv = rows.map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "summary_report.csv";
    a.click();
}
