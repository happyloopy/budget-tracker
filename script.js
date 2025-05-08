window.addEventListener("load", () => {

// --- CONFIG ---
const SUPABASE_URL = "https://oybyvwcpyegfeedepktt.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95Ynl2d2NweWVnZmVlZGVwa3R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2Njc4MjEsImV4cCI6MjA2MDI0MzgyMX0.pn9ka-JxwN_psXlqMKash9iDuP6lEsYvBCmOEJcFDP0";
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- STATE ---
let currentUser = localStorage.getItem('currentUser') || "Anna";
let userButtons;

let currentCategoryFilter = "";
let currentDateFrom = "";
let currentDateTo = "";

// --- DOM ---
const currentUserSpan = document.getElementById('current-user');
const beginningBalanceSpan = document.getElementById('beginning-balance');
const currentBalanceSpan = document.getElementById('current-balance');
const addTransactionBtn = document.getElementById('add-transaction-btn');
const categoryContainer = document.getElementById("category-container");

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
        if (btn.dataset.user === currentUser) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
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
    if (currentUser === "Joint") {
        beginningBalanceSpan.textContent = "N/A";
        updateCurrentBalance();
        return;
    }

    const { data } = await db.from('balances').select('*').eq('user_name', currentUser).single();
    if (data) {
        beginningBalanceSpan.textContent = data.amount.toFixed(2);
    }
    updateCurrentBalance();
}

async function loadTransactions(userFilter) {
    const transactionsTableBody = document.querySelector("#transactions tbody");
    transactionsTableBody.innerHTML = "";

    let query = db.from('transactions').select('*').order('date', { ascending: false });

    if (userFilter !== "Joint") {
        query = query.eq('user_name', userFilter);
    }

    if (currentCategoryFilter) {
        query = query.eq('category', currentCategoryFilter);
    }

    if (currentDateFrom) {
        query = query.gte('date', currentDateFrom);
    }

    if (currentDateTo) {
        query = query.lte('date', currentDateTo);
    }

    const { data } = await query;

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
        
        dateInput.addEventListener('change', () => {
            updateTransaction(tx.id, "date", dateInput.value);
        });
        
        dateCell.appendChild(dateInput);
        row.appendChild(dateCell);


        const categoryCell = document.createElement('td');
        categoryCell.textContent = tx.category;
        row.appendChild(categoryCell);

        const incomeCell = document.createElement('td');
        const expenseCell = document.createElement('td');

        if (tx.type === "income") {
            incomeCell.textContent = `$${tx.amount}`;
            incomeCell.className = "income";
            expenseCell.textContent = "-";
            totalAmount += tx.amount;
        } else {
            expenseCell.textContent = `$${tx.amount}`;
            expenseCell.className = "expense";
            incomeCell.textContent = "-";
            totalAmount -= tx.amount;
        }

        row.appendChild(incomeCell);
        row.appendChild(expenseCell);

        const noteCell = document.createElement('td');
        noteCell.textContent = tx.note || "-";
        row.appendChild(noteCell);

        const deleteCell = document.createElement('td');
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = "Delete";
        deleteBtn.addEventListener("click", () => deleteTransaction(tx.id));
        deleteCell.appendChild(deleteBtn);
        row.appendChild(deleteCell);

        transactionsTableBody.appendChild(row);
    });
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
    if (currentUser === "Joint") {
        const { data: all } = await db.from('transactions').select('*');
        transactions = all;
    }

    const { data: balanceRow } = await db.from('balances').select('*').eq('user_name', currentUser).single();
    let balance = balanceRow ? balanceRow.amount : 0;

    (transactions || []).forEach(tx => {
        if (tx.type === 'income') balance += tx.amount;
        else balance -= tx.amount;
    });

    currentBalanceSpan.textContent = balance.toFixed(2);
}


document.getElementById("apply-filter").addEventListener("click", () => {
    currentCategoryFilter = document.getElementById("filter-category").value;
    currentDateFrom = document.getElementById("filter-date-from").value;
    currentDateTo = document.getElementById("filter-date-to").value;
    loadTransactions(currentUser);
});

document.getElementById("clear-filter").addEventListener("click", () => {
    currentCategoryFilter = "";
    currentDateFrom = "";
    currentDateTo = "";

    document.getElementById("filter-category").value = "";
    document.getElementById("filter-date-from").value = "";
    document.getElementById("filter-date-to").value = "";

    loadTransactions(currentUser);
});

async function refreshCategoryFilter() {
    const { data: allCategories } = await db.from('categories').select('*').order('category_name');
    const filterSelect = document.getElementById("filter-category");

    filterSelect.innerHTML = `<option value="">All Categories</option>`;

    (allCategories || []).forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.category_name;
        opt.textContent = cat.category_name;
        filterSelect.appendChild(opt);
    });
}

refreshCategoryFilter();
setupUserButtons();
renderCategoryInput();
loadBalances();
loadTransactions(currentUser);

});
