import authRouter from "../modules/auth/auth.routes.js";
import usersRouter from "../modules/users/users.routes.js";
import transactionsRouter from "../modules/transactions/transactions.routes.js";
import accountsRouter from "../modules/accounts/accounts.routes.js";
import budgetsRouter from "../modules/budgets/budgets.routes.js";
import categoriesRouter from "../modules/categories/categories.routes.js";
import billsRouter from "../modules/bills/bills.routes.js";
import { authenticate } from "../middleware/authenticate.js";

/**
 * Mounts all API routers onto the Express app.
 * Each feature module is mounted under /api/v1/<resource>.
 */
export const loadRoutes = (app) => {
  app.get("/api/v1/health", (_req, res) => {
    res.json({
      success: true,
      data: { status: "ok" },
      meta: { timestamp: new Date().toISOString() },
    });
  });

  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/users", usersRouter);

  app.use("/api/v1/transactions", authenticate, transactionsRouter);
  app.use("/api/v1/accounts", authenticate, accountsRouter);
  app.use("/api/v1/budgets", authenticate, budgetsRouter);
  app.use("/api/v1/categories", authenticate, categoriesRouter);
  app.use("/api/v1/bills", authenticate, billsRouter);

  // app.use('/api/v1/savings-goals', authenticate, savingsGoalsRouter);
  // app.use('/api/v1/debts',         authenticate, debtsRouter);
  // app.use('/api/v1/notifications', authenticate, notificationsRouter);
};
