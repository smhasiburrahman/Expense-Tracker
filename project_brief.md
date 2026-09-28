# Expense Tracker and Management Web App - Project Brief

## Features Overview

### Authentication
Users sign up using their email and password. They then use that email and password to log in.

### Onboarding
During onboarding, users are asked about their monthly Income. 
- **Categories:** Users are shown pre-defined categories (Food & Dining, Transport, Groceries, Utilities, Shopping). They can add their own categories here or later inside the app. To add a category, they provide the Category Name, Monthly Budget Cap, select an icon from a given list, and choose a color. Users can edit and delete categories from inside the app.
- **Wallets:** Users are asked to add wallets by providing a Wallet Name, Opening Balance, selecting an icon, and choosing a wallet color. Wallet information can be edited later inside the app.
- **Recurring Transactions:** Users are asked to add recurring transactions by providing a Name, Amount, Frequency (monthly, weekly, daily, yearly via dropdown), Next Charge Date, Wallet, and an icon.

*Note: Users can choose to skip all onboarding steps and provide information later from inside the app.*

---

## In-App Pages

### 1. Global Add Expense Button
Used to log an expense entry. Clicking this button opens a modal with 3 entry types:
- **Manual Entry:** User provides Date, Amount, Category, Description, and Wallet. They can click "Add another expense" to log multiple expenses at once.
- **Quick AI**
- **Scan Receipt**

### 2. Sadaqa Tracker Page
- **UI Elements:** Monthly target (editable), total Sadaqa given, progress bar showing the percentage, Sadaqa history, and a button to log Sadaqa.
- **Log Sadaqa:** Users provide Amount, Description, Sadaqa Category, Date (defaults to today, but editable), and Wallet. The logged amount is automatically deducted from the selected wallet and the total overall balance.
- **History Table Columns:** Description, Category, Wallet, Amount, Date.

### 3. Savings Vault Page
- **UI Elements:** Total savings, total number of vaults, overall progress of the total target goal, individual saving vaults, and a Funding History log.
- **Vault Management:** Users can create, edit, and delete vaults. To create a vault, users provide Vault Name, Target Amount, Initial Savings, Target Date (optional), Emoji, and Color theme.
- **Add Funds:** Users add funds to a specific vault by providing the Amount, Source Wallet, and Date. The amount is deducted from the selected wallet and the total overall balance.

### 4. Budgets & Categories Page
- **UI Elements:** View budget categories (default and custom) and recurring transactions.
- **Categories Table Columns:** Category, Spent, Budget Cap, Progress (percentage), Status (*On track* ≤80%, *Warning* ≥80%, *Over budget* ≥100%), Limit Type (*Soft* - allows spending past limit, *Hard* - blocks new expenses), and Actions (Edit, Delete).
- **Add Category:** Provide Category Name, Monthly Budget Cap, Icon, and Color.

### 5. Recurring Transactions (Inside Budgets & Categories)
- **Table Columns:** Name, Amount, Frequency, Next Charge Date, Actions (Pause/Resume, Edit, Delete).
- **Add Recurring Transaction:** Provide Name, Amount, Frequency (monthly, weekly, daily, yearly), Next Charge Date, Wallet, and Icon.
- **Logic:** Recurring transactions are automatically deducted from the selected wallet when the "Next Charge Date" arrives. The following "Next Charge Date" is then automatically calculated based on the frequency.

### 6. Wallets Page
- **UI Elements:** View all wallets, their current balances, and all transaction history.
- **Add Wallet:** Provide Wallet Name, Opening Balance, Icon, and Color.
- **All Transactions Table Columns:** Category, Description, Amount, Wallet, Date. (Includes Actions for editing/deleting, with automatic refunds/adjustments to the wallet/vault balances).

### 7. Analytics Page
- **UI Elements:** Spending analytics filtered by Weekly or Monthly views. Includes a Spending by Category graph and a Monthly Spending Trend chart.

{UI Elements: Analytics filters for Weekly, Monthly, and Custom Range views, Spending by Category chart, Monthly Spending Trend chart, and AI Insights.
Date Range Filter: Users can select Weekly, Monthly, or a Custom Date Range to filter the analytics data.
Spending by Category: Displays a chart showing the total amount and percentage of spending for each expense category within the selected date range.
Monthly Spending Trend: Displays a chart showing spending trends over multiple months, broken down by expense categories.
AI Insights: Provides spending-related insights such as Spending Anomaly, Budget Forecast, Subscription Audit, and Price Benchmarking based on the user's financial data.
Export: Users can export the displayed analytics/report for the selected date range.}

### 8. Dashboard Page
- **UI Elements:** Daily allowance (sum of all budget caps / total month days), Total spent (sum of all category spending), Remaining budget (sum of all budget caps - total spent), Total savings (sum of all vault funds).
- Includes wallet summaries, budget category summaries, and recent transactions.

### 9. Search Page
- **UI Elements:** Search functionality for transactions, categories, and wallets.

{UI Elements: Search bar and search results for transactions, categories, and wallets.
Search Functionality: Users can enter a keyword in the search bar to find matching transactions, categories, or wallets.
Search Results: Matching results are displayed based on the entered keyword.
Transactions: Search can match transaction information such as description, category, wallet, or other relevant transaction details.
Categories: Search can find categories by category name.
Wallets: Search can find wallets by wallet name.
Result Interaction: Users can select a search result to view or access the corresponding transaction, category, or wallet details.
Empty Results: If no matching result is found, the system displays an appropriate "No results found" message.}

### 10. Settings Page
- **Account Settings:** Edit Name, Email Address, and Monthly Income.
- **Localization:** Select Currency and Region.
- **Notifications:** Toggle Over budget alerts, daily summary alerts, weekly reports alerts, and saving goals alerts.
- **Logout:** Button to exit the application.

---

## Core Logic Requirements
- **Transaction Deletion/Editing:** If a user deletes or edits a transaction, adequate actions must be taken (e.g., refunding the deleted amount back to the relevant wallet, updating savings progress, etc.).
