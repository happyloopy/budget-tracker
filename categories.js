window.addEventListener("load", () => {

// --- CONFIG ---
const SUPABASE_URL = "https://oybyvwcpyegfeedepktt.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95Ynl2d2NweWVnZmVlZGVwa3R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2Njc4MjEsImV4cCI6MjA2MDI0MzgyMX0.pn9ka-JxwN_psXlqMKash9iDuP6lEsYvBCmOEJcFDP0";
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- DOM ---
const addCategoryBtn = document.getElementById("add-category-btn");
const categoriesList = document.getElementById("categories-list");

addCategoryBtn.addEventListener('click', async () => {
    const type = document.getElementById("new-category-type").value;
    const name = document.getElementById("new-category-name").value.trim();

    if (!name) {
        alert("Please enter a category name");
        return;
    }

    await db.from('categories').insert([{ type, category_name: name }]);
    document.getElementById("new-category-name").value = "";
    loadCategories();
});

async function loadCategories() {
    const { data } = await db.from('categories').select('*').order('type').order('category_name');
    const expenseList = document.getElementById("expense-categories-list");
    const incomeList = document.getElementById("income-categories-list");

    expenseList.innerHTML = "";
    incomeList.innerHTML = "";

    (data || []).forEach(cat => {
        const li = document.createElement('li');
        li.textContent = cat.category_name;

        const btn = document.createElement('button');
        btn.textContent = "Delete";
        btn.addEventListener('click', async () => {
            await db.from('categories').delete().eq('id', cat.id);
            loadCategories();
        });
        li.appendChild(btn);

        if (cat.type === "expense") {
            expenseList.appendChild(li);
        } else {
            incomeList.appendChild(li);
        }
    });
}


loadCategories();

});
