window.addEventListener("load", () => {

// --- CONFIG ---
const SUPABASE_URL = "https://oybyvwcpyegfeedepktt.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95Ynl2d2NweWVnZmVlZGVwa3R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2Njc4MjEsImV4cCI6MjA2MDI0MzgyMX0.pn9ka-JxwN_psXlqMKash9iDuP6lEsYvBCmOEJcFDP0";
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- STATE ---
let currentUser = localStorage.getItem('currentUser') || "Anna";
let userButtons;
let currentCategoryFilter = [];
let currentDateFrom = "";
let currentDateTo = "";

// --- DOM ---
const currentUserSpan = document.getElementById('current-user');
const beginningBalanceSpan = document.getElementById('beginning-balance');
const currentBalanceSpan = document.getElementById('current-balance');
const addTransactionBtn = document.getElementById('add-transaction-btn');
const categoryContainer = document.getElementById("category-container");

// --- Beginning Balance Edit ---
beginningBalanceSpan.addEventListener("blur", saveBeginningBalance);
beginningBalanceSpan.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        beginningBalanceSpan.blur();
    }
});

async function saveBeginningBalance() {
    const value = parseFloat(beginningBalanceSpan.textContent);
    if (isNaN(value)) {
        alert("Invalid number!");
        loadBalances();
        return;
    }
    await db.from('balances').upsert([{ user_name: currentUser, amount: value }]);
    updateCurrentBalance();
}

// --- EVENTS ---
addTransactionBtn.addEventListener('click', async () => {
    const amount = parseFloat(document.getElementById('amount').value);
    const type = document.getElementById('type').value;
    const category = document.getElementById('category').value;
    const note = document.getElementById('note').value;

    if (isNaN(amount) || !category) {
        alert("Please fill in all fields properly!");
        return;
    }

    const dateInput = document.getElementById('transaction-date').value;
    const date = dateInput ? new Date(dateInput) : new Date();

    await db.from('transactions').insert([
        { user_name: currentUser, amount, type, category, note, date }
    ]);

    await loadBalances();
    await loadTransactions(currentUser);

    document.getElementById('amount').value = "";
    document.getElementById('category').value = "";
    document.getElementById('note').value = "";
});

function setupUserButtons() {
    userButtons = document.querySelectorAll('.user-btn');
    userButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            currentUser = btn.dataset.user;
            localStorage.setItem('currentUser', currentUser);
            updateUserDisplay();
            loadBalances();
            loadTransactions(currentUser);
        });
    });
}

function updateUserDisplay() {
    userButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.user === currentUser);
    });
    currentUserSpan.textContent = currentUser;
}

async function renderCategoryInput() {
    const type = document.getElementById("type").value;
    const { data: categories } = await db.from('categories').select('*').eq('type', type).order('category_name', { ascending: true });

    if (categories.length > 0) {
        categoryContainer.innerHTML = `<select id="category"></select>`;
        const select = document.getElementById('category');
        categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.category_name;
            opt.textContent = cat.category_name;
            select.appendChild(opt);
        });
    } else {
        categoryContainer.innerHTML = `<input type="text" id="category" placeholder="Category">`;
    }
}

document.getElementById("type").addEventListener("change", renderCategoryInput);

async function loadBalances() {
    const { data } = await db.from('balances').select('*').eq('user_name', currentUser).single();
    const balance = data ? data.amount : 0;
    beginningBalanceSpan.textContent = balance.toFixed(2);
    updateCurrentBalance();
}

async function loadTransactions(userFilter) {
    const transactionsTableBody = document.querySelector("#transactions tbody");
    transactionsTableBody.innerHTML = "";

    let query = db.from('transactions').select('*').order('date', { ascending: false });
    if (userFilter !== "Joint") query = query.eq('user_name', userFilter);
    if (currentCategoryFilter.length > 0) query = query.in('category', currentCategoryFilter);
    if (currentDateFrom) query = query.gte('date', currentDateFrom);
    if (currentDateTo) query = query.lte('date', currentDateTo);

    const { data } = await query;

    const { data: allCategories } = await db.from('categories').select('*');

    let totalAmount = 0;

    (data || []).forEach(tx => {
        const row = document.createElement('tr');
        if (tx.user_name === "Anna") row.classList.add("anna-row");
        else if (tx.user_name === "Husband") row.classList.add("husband-row");

        const userCell = document.createElement('td');
        userCell.textContent = tx.user_name;
        row.appendChild(userCell);

        const dateCell = document.createElement('td');
        const dateInput = document.createElement('input');
        dateInput.type = "date";
        dateInput.value = new Date(tx.date).toISOString().split('T')[0];
        dateInput.addEventListener('change', () => updateTransaction(tx.id, "date", dateInput.value));
        dateCell.appendChild(dateInput);
        row.appendChild(dateCell);

        // --- Category dropdown (editable)
        const categoryCell = document.createElement('td');
        const categorySelect = document.createElement('select');

        const filteredCategories = allCategories.filter(cat => cat.type === tx.type);
        filteredCategories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.category_name;
            option.textContent = cat.category_name;
            if (cat.category_name === tx.category) option.selected = true;
            categorySelect.appendChild(option);
        });

        categorySelect.addEventListener('change', () => updateTransaction(tx.id, "category", categorySelect.value));
        categoryCell.appendChild(categorySelect);
        row.appendChild(categoryCell);

        // --- Amount editable
        const incomeCell = document.createElement('td');
        const expenseCell = document.createElement('td');

        if (tx.type === "income") {
            incomeCell.textContent = tx.amount.toFixed(2);
            incomeCell.className = "income";
            incomeCell.contentEditable = "true";
            incomeCell.addEventListener('blur', () => {
                updateTransaction(tx.id, "amount", parseFloat(incomeCell.textContent));
            });
            expenseCell.textContent = "-";
            totalAmount += tx.amount;
        } else {
            expenseCell.textContent = tx.amount.toFixed(2);
            expenseCell.className = "expense";
            expenseCell.contentEditable = "true";
            expenseCell.addEventListener('blur', () => {
                updateTransaction(tx.id, "amount", parseFloat(expenseCell.textContent));
            });
            incomeCell.textContent = "-";
            totalAmount -= tx.amount;
        }

        row.appendChild(incomeCell);
        row.appendChild(expenseCell);

        const noteCell = document.createElement('td');
        noteCell.textContent = tx.note || "-";
        noteCell.contentEditable = "true";
        noteCell.addEventListener('blur', () => {
            updateTransaction(tx.id, "note", noteCell.textContent);
        });
        row.appendChild(noteCell);

        const deleteCell = document.createElement('td');
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = "Delete";
        deleteBtn.addEventListener('click', () => deleteTransaction(tx.id));
        deleteCell.appendChild(deleteBtn);
        row.appendChild(deleteCell);

        transactionsTableBody.appendChild(row);
    });

    document.querySelector(".filter-info").textContent =
        `Viewing for [${currentCategoryFilter.length > 0 ? currentCategoryFilter.join(", ") : "All Categories"}] from ${currentDateFrom || "the beginning"} to ${currentDateTo || "now"}.`;
    document.getElementById("filter-total").textContent = totalAmount.toFixed(2);

    updateCurrentBalance();
}


async function updateTransaction(id, field, value) {
    await db.from('transactions').update({ [field]: value }).eq('id', id);
    updateCurrentBalance();
}

async function deleteTransaction(id) {
    await db.from('transactions').delete().eq('id', id);
    loadTransactions(currentUser);
}

async function updateCurrentBalance() {
    let { data: transactions } = await db.from('transactions').select('*').eq('user_name', currentUser);
    if (currentUser === "Joint") transactions = (await db.from('transactions').select('*')).data;

    const { data: balanceRow } = await db.from('balances').select('*').eq('user_name', currentUser).single();
    let balance = balanceRow ? balanceRow.amount : 0;

    (transactions || []).forEach(tx => {
        balance += (tx.type === 'income') ? tx.amount : -tx.amount;
    });

    currentBalanceSpan.textContent = balance.toFixed(2);
}

document.getElementById("apply-filter").addEventListener("click", () => {
    const checkboxes = document.querySelectorAll("#filter-category-expense input[type='checkbox'], #filter-category-income input[type='checkbox']");
    currentCategoryFilter = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
    currentDateFrom = document.getElementById("filter-date-from").value;
    currentDateTo = document.getElementById("filter-date-to").value;
    loadTransactions(currentUser);
});

document.getElementById("clear-filter").addEventListener("click", () => {
    currentCategoryFilter = [];
    currentDateFrom = "";
    currentDateTo = "";

    const checkboxes = document.querySelectorAll("#filter-category-expense input[type='checkbox'], #filter-category-income input[type='checkbox']");
    checkboxes.forEach(cb => cb.checked = false);

    document.getElementById("filter-date-from").value = "";
    document.getElementById("filter-date-to").value = "";
    loadTransactions(currentUser);
});

async function refreshCategoryFilter() {
    const { data: allCategories } = await db.from('categories').select('*').order('category_name');
    const expenseContainer = document.getElementById("filter-category-expense");
    const incomeContainer = document.getElementById("filter-category-income");

    expenseContainer.innerHTML = "";
    incomeContainer.innerHTML = "";

    (allCategories || []).forEach(cat => {
        const container = cat.type === "expense" ? expenseContainer : incomeContainer;
        const label = document.createElement("label");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = cat.category_name;

        checkbox.addEventListener("change", () => {
            if (checkbox.checked && !currentCategoryFilter.includes(checkbox.value)) {
                currentCategoryFilter.push(checkbox.value);
            } else if (!checkbox.checked) {
                currentCategoryFilter = currentCategoryFilter.filter(c => c !== checkbox.value);
            }
        });

        label.appendChild(checkbox);
        label.append(" " + cat.category_name);
        container.appendChild(label);
    });
}

async function loadUpcomingRecurring() {
    const container = document.getElementById("recurring-section");
    if (!container) return;

    const today = new Date();
    const { data } = await db.from("recurring").select("*");

    const updatedEntries = [];

    const upcoming = (data || []).map(entry => {
        let dueDate = new Date(entry.date);
        while (dueDate < today) {
            dueDate.setMonth(dueDate.getMonth() + 1);
            updatedEntries.push({ id: entry.id, date: dueDate.toISOString().split("T")[0] });
        }
        const daysLeft = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        return {
            ...entry,
            dueDate,
            formattedDate: dueDate.toLocaleDateString(undefined, { month: "long", day: "numeric" }),
            daysLeft
        };
    });

    // Batch update auto-forwarded dates
    for (const u of updatedEntries) {
        await db.from("recurring").update({ date: u.date }).eq("id", u.id);
    }

    upcoming.sort((a, b) => a.dueDate - b.dueDate);

    const table = document.createElement("table");
    table.className = "recurring-table";
    table.innerHTML = `
        <thead>
            <tr>
                <th>Name</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Days Left</th>
            </tr>
        </thead>
        <tbody>
            ${upcoming.map(tx => `
                <tr style="color: ${tx.daysLeft < 0 ? 'red' : 'inherit'};">
                    <td>${tx.name}</td>
                    <td>$${tx.amount.toFixed(2)}</td>
                    <td>${tx.formattedDate}</td>
                    <td>${tx.daysLeft} day${tx.daysLeft !== 1 ? "s" : ""}</td>
                </tr>
            `).join("")}
        </tbody>
    `;

    const todayText = today.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

    container.innerHTML = `<h2>💡 Upcoming Recurring Transactions (Today: ${todayText})</h2>`;
    container.appendChild(table);
}


refreshCategoryFilter();
setupUserButtons();
renderCategoryInput();
loadTransactions(currentUser);
loadBalances();
loadTransactions(currentUser);
loadUpcomingRecurring();

});
