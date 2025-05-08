const SUPABASE_URL = "https://oybyvwcpyegfeedepktt.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95Ynl2d2NweWVnZmVlZGVwa3R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2Njc4MjEsImV4cCI6MjA2MDI0MzgyMX0.pn9ka-JxwN_psXlqMKash9iDuP6lEsYvBCmOEJcFDP0";
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.getElementById("load-summary").addEventListener("click", loadSummary);
document.getElementById("export-csv").addEventListener("click", exportCSV);

async function loadSummary() {

    // --- GET FILTERS ---
    const selectedUser = document.getElementById("user-filter").value;
    const mode = document.getElementById("summary-mode").value;

    let dateFrom = document.getElementById("summary-date-from").value;
    let dateTo = document.getElementById("summary-date-to").value;

    if (mode === "weekly") {
        const today = new Date();
        const lastWeek = new Date();
        lastWeek.setDate(today.getDate() - 7);
        dateFrom = lastWeek.toISOString().split("T")[0];
        dateTo = today.toISOString().split("T")[0];
    } 
    else if (mode === "monthly") {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        dateFrom = firstDay.toISOString().split("T")[0];
        dateTo = today.toISOString().split("T")[0];
    }

    // --- LOAD ALL CATEGORIES ---
    const { data: allCategories } = await db.from('categories').select('*');

    // --- LOAD TRANSACTIONS ---
    let query = db.from('transactions').select('*');

    if (selectedUser !== "All") {
        query = query.eq('user_name', selectedUser);
    }
    if (dateFrom) {
        query = query.gte('date', dateFrom);
    }
    if (dateTo) {
        query = query.lte('date', dateTo);
    }

    const { data: transactions } = await query;

    // --- BUILD SUMMARY ---
    const summary = {};

    // Add all categories FIRST
    (allCategories || []).forEach(cat => {
        summary[cat.category_name] = {
            type: cat.type,
            income: 0,
            expense: 0
        };
    });

    // Add transaction amounts
    (transactions || []).forEach(tx => {
        if (summary[tx.category]) {
            if (tx.type === "income") {
                summary[tx.category].income += tx.amount;
            } else {
                summary[tx.category].expense += tx.amount;
            }
        }
    });

    // --- RENDER TO TABLE ---
    const tbody = document.querySelector("#summary-table tbody");
    tbody.innerHTML = "";

    let totalIncome = 0;
    let totalExpense = 0;

    Object.keys(summary).forEach(catName => {
        const data = summary[catName];

        const row = document.createElement("tr");

        const catCell = document.createElement("td");
        catCell.textContent = catName;
        row.appendChild(catCell);

        const incomeCell = document.createElement("td");
        incomeCell.textContent = `$${data.income.toFixed(2)}`;
        incomeCell.style.color = "green";
        row.appendChild(incomeCell);

        const expenseCell = document.createElement("td");
        expenseCell.textContent = `$${data.expense.toFixed(2)}`;
        expenseCell.style.color = "red";
        row.appendChild(expenseCell);

        const netCell = document.createElement("td");
        netCell.textContent = (data.income - data.expense).toFixed(2);
        row.appendChild(netCell);

        tbody.appendChild(row);

        totalIncome += data.income;
        totalExpense += data.expense;
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
