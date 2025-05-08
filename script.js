document.addEventListener("DOMContentLoaded", () => {

// --- CONFIG ---
const SUPABASE_URL = "https://oybyvwcpyegfeedepktt.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95Ynl2d2NweWVnZmVlZGVwa3R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2Njc4MjEsImV4cCI6MjA2MDI0MzgyMX0.pn9ka-JxwN_psXlqMKash9iDuP6lEsYvBCmOEJcFDP0";

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- STATE ---
let currentUser = localStorage.getItem('currentUser') || "Anna";

// --- DOM ---
const currentUserSpan = document.getElementById('current-user');
const beginningBalanceSpan = document.getElementById('beginning-balance');
const currentBalanceSpan = document.getElementById('current-balance');
const addTransactionBtn = document.getElementById('add-transaction-btn');
const transactionsList = document.getElementById('transactions');
const categoryContainer = document.getElementById("category-container");
let userButtons;

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

    await db.from('transactions').insert([
        { user_name: currentUser, amount, type, category, note }
    ]);

    await loadBalances();
    await loadTransactions();

    document.getElementById('amount').value = "";
    document.getElementById('category').value = "";
    document.getElementById('note').value = "";
});

// --- FUNCTIONS ---
function setupUserButtons() {
    userButtons = document.querySelectorAll('.user-btn');

    userButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            currentUser = btn.dataset.user;
            localStorage.setItem('currentUser', currentUser);
            updateUserDisplay();
            loadBalances();
            loadTransactions();
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

    if (currentUser === "Joint") {
        currentUserSpan.textContent = "Joint 👫";
    } else {
        currentUserSpan.textContent = currentUser + (currentUser === "Anna" ? " 👧" : " 👦");
    }
}

function renderCategoryInput() {
    const type = document.getElementById("type").value;
    if (type === "expense") {
        categoryContainer.innerHTML = `
            <select id="category">
                <option value="Addiction">Addiction</option>
                <option value="Debt">Debt</option>
                <option value="Emergency Funds">Emergency Funds</option>
                <option value="Food">Food</option>
                <option value="Hangouts">Hangouts</option>
                <option value="Health/Medical">Health/Medical</option>
                <option value="Home">Home</option>
                <option value="Normal Drinks">Normal Drinks</option>
                <option value="Personal Enjoyment">Personal Enjoyment</option>
                <option value="Pets">Pets</option>
                <option value="Rent">Rent</option>
                <option value="Transportation">Transportation</option>
                <option value="Utilities">Utilities</option>
            </select>
        `;
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

async function loadTransactions() {
    const transactionsTableBody = document.querySelector("#transactions tbody");
    transactionsTableBody.innerHTML = "";

    let query = db.from('transactions').select('*').order('date', { ascending: false });

    if (currentUser !== "Joint") {
        query = query.eq('user_name', currentUser);
    }

    const { data } = await query;

    if (data) {
        data.forEach(tx => {
            const row = document.createElement('tr');
            if (tx.user_name === "Anna") {
                row.classList.add("anna-row");
            } else if (tx.user_name === "Husband") {
                row.classList.add("husband-row");
            }

            const userCell = document.createElement('td');
            userCell.textContent = tx.user_name;
            row.appendChild(userCell);

            const dateCell = document.createElement('td');
            dateCell.textContent = new Date(tx.date).toLocaleDateString();
            row.appendChild(dateCell);

            const categoryCell = document.createElement('td');
            categoryCell.textContent = tx.category;
            categoryCell.contentEditable = "true";
            categoryCell.addEventListener("blur", () => updateTransaction(tx.id, "category", categoryCell.textContent));
            row.appendChild(categoryCell);

            const incomeCell = document.createElement('td');
            const expenseCell = document.createElement('td');

            if (tx.type === "income") {
                incomeCell.textContent = `$${tx.amount}`;
                incomeCell.className = "income";
                incomeCell.contentEditable = "true";
                incomeCell.addEventListener("blur", () => updateTransaction(tx.id, "amount", parseFloat(incomeCell.textContent.replace("$",""))));
                expenseCell.textContent = "-";
            } else {
                expenseCell.textContent = `$${tx.amount}`;
                expenseCell.className = "expense";
                expenseCell.contentEditable = "true";
                expenseCell.addEventListener("blur", () => updateTransaction(tx.id, "amount", parseFloat(expenseCell.textContent.replace("$",""))));
                incomeCell.textContent = "-";
            }

            row.appendChild(incomeCell);
            row.appendChild(expenseCell);

            const noteCell = document.createElement('td');
            noteCell.textContent = tx.note || "-";
            noteCell.contentEditable = "true";
            noteCell.addEventListener("blur", () => updateTransaction(tx.id, "note", noteCell.textContent));
            row.appendChild(noteCell);

            const deleteCell = document.createElement('td');
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = "Delete";
            deleteBtn.className = "delete-btn";
            deleteBtn.addEventListener("click", () => deleteTransaction(tx.id));
            deleteCell.appendChild(deleteBtn);
            row.appendChild(deleteCell);

            transactionsTableBody.appendChild(row);
        });
    }

    updateCurrentBalance();
}

async function updateTransaction(id, field, value) {
    await db.from('transactions').update({ [field]: value }).eq('id', id);
    updateCurrentBalance();
}

async function deleteTransaction(id) {
    await db.from('transactions').delete().eq('id', id);
    loadTransactions();
}

async function updateCurrentBalance() {
    let { data: transactions } = await db.from('transactions').select('*').eq('user_name', currentUser);

    if (currentUser === "Joint") {
        const { data: all } = await db.from('transactions').select('*');
        transactions = all;
    }

    const { data: balanceRow } = await db.from('balances').select('*').eq('user_name', currentUser).single();
    let balance = balanceRow ? balanceRow.amount : 0;

    if (transactions) {
        transactions.forEach(tx => {
            if (tx.type === 'income') {
                balance += tx.amount;
            } else {
                balance -= tx.amount;
            }
        });
    }

    currentBalanceSpan.textContent = balance.toFixed(2);
}

setupUserButtons();
renderCategoryInput();
loadBalances();
loadTransactions();

}); // END OF DOMContentLoaded
