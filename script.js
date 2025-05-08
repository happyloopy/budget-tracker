// --- CONFIG ---
const SUPABASE_URL = "https://oybyvwcpyegfeedepktt.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95Ynl2d2NweWVnZmVlZGVwa3R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2Njc4MjEsImV4cCI6MjA2MDI0MzgyMX0.pn9ka-JxwN_psXlqMKash9iDuP6lEsYvBCmOEJcFDP0";

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- STATE ---
let currentUser = localStorage.getItem('currentUser') || "Anna";

// --- DOM ---
const currentUserSpan = document.getElementById('current-user');
const switchUserBtn = document.getElementById('switch-user-btn');
const beginningBalanceSpan = document.getElementById('beginning-balance');
const currentBalanceSpan = document.getElementById('current-balance');
const addTransactionBtn = document.getElementById('add-transaction-btn');
const transactionsList = document.getElementById('transactions');

updateUserDisplay();

// --- EVENTS ---
switchUserBtn.addEventListener('click', () => {
    currentUser = (currentUser === "Anna") ? "Husband" : "Anna";
    localStorage.setItem('currentUser', currentUser);
    updateUserDisplay();
    loadBalances();
    loadTransactions();
});

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
function updateUserDisplay() {
    currentUserSpan.textContent = currentUser + (currentUser === "Anna" ? " 👧" : " 👦");
}

async function loadBalances() {
    const { data, error } = await db.from('balances').select('*').eq('user_name', currentUser).single();
    if (data) {
        beginningBalanceSpan.textContent = data.amount.toFixed(2);
    }
    updateCurrentBalance();
}

async function loadTransactions() {
    transactionsList.innerHTML = "";
    const { data, error } = await db.from('transactions').select('*').eq('user_name', currentUser);
    if (data) {
        data.forEach(tx => {
            const li = document.createElement('li');
            li.className = (tx.user_name === "Anna") ? 'anna-transaction' : 'husband-transaction';
            li.textContent = `${tx.type === 'expense' ? '-' : '+'}$${tx.amount} | ${tx.category} | ${tx.note || ''}`;
            transactionsList.appendChild(li);
        });
    }
    updateCurrentBalance();
}

async function updateCurrentBalance() {
    const { data: transactions } = await db.from('transactions').select('*').eq('user_name', currentUser);
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

loadBalances();
loadTransactions();
