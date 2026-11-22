
// Java backend address
const API = "http://localhost:8080/api";

// Select HTML elements
const expenseForm = document.getElementById("expense-form");
const expenseList = document.getElementById("expense-list");

const totalElement = document.getElementById("total");
const budgetElement = document.getElementById("budget");
const remainingElement = document.getElementById("remaining");

const categorySummary = document.getElementById("category-summary");
const progressBar = document.getElementById("progress-bar");
const budgetMessage = document.getElementById("budget-message");

// Current date
const today = new Date();

document.getElementById("today").textContent =
    today.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });

document.getElementById("expense-date").value =
    today.getFullYear() + "-" +
    String(today.getMonth() + 1).padStart(2, "0") + "-" +
    String(today.getDate()).padStart(2, "0");

// Store data received from Java
let expenses = [];
let budget = 10000;

// Format currency
function formatMoney(amount) {
    return "₹" + Number(amount).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Show error messages
function showError(error) {
    alert(error.message || "Something went wrong. Check the Java server.");
}

// Load expenses from Java
async function loadExpenses() {

    try {

        const response = await fetch(API + "/expenses");

        if (!response.ok) {
            throw new Error("Unable to load expenses");
        }

        expenses = await response.json();

        updateDashboard();

    } catch (error) {

        showError(error);

    }
}

// Load budget from Java
async function loadBudget() {

    try {

        const response = await fetch(API + "/budget");

        if (!response.ok) {
            throw new Error("Unable to load budget");
        }

        const data = await response.json();

        budget = data.budget;

        updateDashboard();

    } catch (error) {

        showError(error);

    }
}

// Add new expense
expenseForm.addEventListener("submit", async function(event) {

    event.preventDefault();

    const amount = document.getElementById("amount").value;
    const category = document.getElementById("category").value;
    const description = document.getElementById("description").value;
    const date = document.getElementById("expense-date").value;

    if (Number(amount) <= 0 || !Number.isFinite(Number(amount))) {
        alert("Enter a valid amount.");
        return;
    }

    try {

        const response = await fetch(API + "/expenses", {

            method: "POST",

            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },

            body: new URLSearchParams({
                amount: amount,
                category: category,
                description: description,
                date: date
            })

        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Unable to add expense");
        }

        alert("Expense added successfully!");

        expenseForm.reset();

        document.getElementById("expense-date").value =
            today.getFullYear() + "-" +
            String(today.getMonth() + 1).padStart(2, "0") + "-" +
            String(today.getDate()).padStart(2, "0");

        await loadExpenses();

    } catch (error) {

        showError(error);

    }

});

// Update budget
document.getElementById("budget-btn").addEventListener("click", async function() {

    const newBudget = document.getElementById("new-budget").value;

    if (!newBudget || Number(newBudget) <= 0) {
        alert("Enter a valid budget.");
        return;
    }

    try {

        const response = await fetch(API + "/budget", {

            method: "POST",

            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },

            body: new URLSearchParams({
                budget: newBudget
            })

        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Unable to update budget");
        }

        await loadBudget();

        document.getElementById("new-budget").value = "";

        alert("Budget updated successfully!");

    } catch (error) {

        showError(error);

    }

});

// Delete expense
async function deleteExpense(id) {

    if (!confirm("Are you sure you want to delete this expense?")) {
        return;
    }

    try {

        const response = await fetch(API + "/expenses/" + id, {
            method: "DELETE"
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Unable to delete expense");
        }

        await loadExpenses();

    } catch (error) {

        showError(error);

    }
}

// Update complete dashboard
function updateDashboard() {

    const currentMonth = today.getFullYear() + "-" +
        String(today.getMonth() + 1).padStart(2, "0");

    // Only current month's expenses count toward the monthly budget
    const monthlyExpenses = expenses.filter(expense =>
        expense.date.startsWith(currentMonth)
    );

    let total = 0;

    let categories = {
        Food: 0,
        Travel: 0,
        Shopping: 0,
        Bills: 0,
        Education: 0,
        Other: 0
    };

    monthlyExpenses.forEach(expense => {

        total += Number(expense.amount);

        if (categories[expense.category] !== undefined) {
            categories[expense.category] += Number(expense.amount);
        }

    });

    const remaining = budget - total;

    // Update dashboard cards
    totalElement.textContent = formatMoney(total);
    budgetElement.textContent = formatMoney(budget);
    remainingElement.textContent = formatMoney(remaining);

    remainingElement.style.color =
        remaining < 0 ? "#dc2626" : "#16a34a";

    // Update progress bar
    const percentage = budget > 0
        ? (total / budget) * 100
        : 0;

    progressBar.style.width = Math.min(percentage, 100) + "%";

    progressBar.style.background =
        percentage > 100 ? "#dc2626" : "#16a34a";

    if (percentage > 100) {

        budgetMessage.textContent =
            "Warning! You have exceeded your monthly budget.";

        budgetMessage.style.color = "#dc2626";

    } else {

        budgetMessage.textContent =
            "You have used " + percentage.toFixed(1) +
            "% of your monthly budget.";

        budgetMessage.style.color = "#16a34a";

    }

    // Update category spending
    categorySummary.innerHTML = "";

    Object.entries(categories).forEach(([name, amount]) => {

        const percentageOfBudget = budget > 0
            ? Math.min((amount / budget) * 100, 100)
            : 0;

        const item = document.createElement("div");
        item.className = "category-item";

        const heading = document.createElement("div");
        heading.className = "category-heading";

        const categoryName = document.createElement("span");
        categoryName.textContent = name;

        const categoryAmount = document.createElement("strong");
        categoryAmount.textContent = formatMoney(amount);

        heading.append(categoryName, categoryAmount);

        const track = document.createElement("div");
        track.className = "category-track";

        const fill = document.createElement("div");
        fill.className = "category-fill";
        fill.style.width = percentageOfBudget + "%";

        track.appendChild(fill);

        item.append(heading, track);
        categorySummary.appendChild(item);

    });

    // Update transaction table
    expenseList.innerHTML = "";

    if (expenses.length === 0) {

        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 5;
        cell.textContent = "No expenses added yet.";

        row.appendChild(cell);
        expenseList.appendChild(row);

    }

    // Show newest expenses first
    [...expenses].reverse().forEach(expense => {

        const row = document.createElement("tr");

        const values = [
            expense.date,
            expense.category,
            expense.description,
            formatMoney(expense.amount)
        ];

        values.forEach(value => {

            const cell = document.createElement("td");
            cell.textContent = value;

            row.appendChild(cell);

        });

        const actionCell = document.createElement("td");

        const deleteButton = document.createElement("button");

        deleteButton.textContent = "Delete";
        deleteButton.className = "delete-btn";

        deleteButton.addEventListener("click", function() {
            deleteExpense(expense.id);
        });

        actionCell.appendChild(deleteButton);
        row.appendChild(actionCell);

        expenseList.appendChild(row);

    });

}

// Start dashboard
async function startDashboard() {

    await Promise.all([
        loadExpenses(),
        loadBudget()
    ]);

}

startDashboard();
