# 💰 Financial Bestie

### Smart Personal Finance & Wealth Tracker

Financial Bestie is a personal finance management web application designed for students and young professionals. It helps users manage daily expenses, multiple wallets, budgets, savings, and charitable giving from one place.

> 🎓 Developed as part of our **Web Programming Lab** course.

---

## ✨ Features

- 💳 **Multi-Wallet Management** — Manage Cash, bKash, Nagad, Rocket, and Bank balances.
- 🧾 **Expense Tracking** — Record expenses with amount, category, wallet, and notes.
- 📊 **Spending Analytics** — View category-wise and monthly spending through charts.
- 🎯 **Budget Management** — Set category limits and monitor spending progress.
- 🏦 **Savings Vaults** — Create savings goals and track progress.
- 🤲 **Sadaqa & Charity Tracker** — Record Sadaqa and charitable donations.
- 📒 **Transaction Ledger** — Search and filter transaction history.

---

## 🛠️ Tech Stack

**Frontend:** HTML5, CSS3, JavaScript (ES6+), Chart.js, Font Awesome

**Backend:** PHP, Laravel, RESTful APIs

**Database:** MySQL

**Tools:** Git, GitHub, Postman, VS Code

---

## 📁 Project Structure

```text
financial-bestie/
├── frontend/
│   ├── css/
│   ├── js/
│   ├── index.html
│   ├── dashboard.html
│   ├── analytics.html
│   ├── wallets.html
│   ├── budgets.html
│   ├── savings.html
│   └── sadaqa.html
│
├── backend/
│   ├── app/
│   ├── routes/
│   └── config/
│
├── database/
│   ├── schema.sql
│   └── seeders.sql
│
├── docs/
└── README.md
```

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/<org-or-username>/financial-bestie.git
cd financial-bestie
```

### 2. Set Up the Database

```bash
mysql -u root -p < database/schema.sql
```

### 3. Configure Laravel

```bash
cd backend
cp .env.example .env
composer install
php artisan key:generate
php artisan migrate --seed
```

Update the database credentials in `.env`.

### 4. Start the Backend

```bash
php artisan serve
```

Backend will run at:

`http://127.0.0.1:8000`

### 5. Run the Frontend

Open `frontend/index.html` in your browser or use **VS Code Live Server**.

---

## 🌿 Git Workflow

We use a feature-branch workflow to keep development organized.

```text
main
 └── dev
      ├── feature/auth
      ├── feature/dashboard
      ├── feature/expense-modal
      ├── feature/wallet-management
      ├── feature/analytics
      ├── feature/budgets
      ├── feature/savings
      └── feature/sadaqa
```

### Basic Workflow

```bash
git checkout dev
git pull origin dev
git checkout -b feature/your-feature-name

git add .
git commit -m "feat: add your feature"

git push -u origin feature/your-feature-name
```

Create a Pull Request to `dev` after completing the feature.

---

## 📝 Commit Convention

| Prefix | Purpose |
|---|---|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation |
| `style:` | Styling / formatting |
| `refactor:` | Code restructuring |
| `test:` | Tests |
| `chore:` | Maintenance |

---

## 👥 Team

| Name | Role | GitHub |
|---|---|---|
| **S M Hasibur Rahman** | Frontend Leader | [@smhasiburrahman](https://github.com/smhasiburrahman) |
| **Fardin Mustafi** | Frontend | [@fardinmustafi](https://github.com/fardinmustafi) |
| **Md. Sami Chowdhury** | Backend Leader | [@RotenZen](https://github.com/RotenZen) |
| **Md. Mahamud Hasan** | Backend | [@Mahamud-Hasan123](https://github.com/Mahamud-Hasan123) |

---

## 🔮 Future Improvements

- 📱 Responsive mobile design
- 🔔 Smart budget notifications
- 📤 CSV/PDF transaction export
- 🔄 Recurring expense tracking
- 🌙 Dark mode
- 📈 Advanced financial reports
- ☁️ Cloud deployment

---

## ☕ Acknowledgements

Built with teamwork, learning, debugging, and lots of tea as part of our **Web Programming Lab** course.
