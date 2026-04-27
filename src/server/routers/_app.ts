import { router } from '@/server/trpc';
import { companyRouter } from './companyRouter';
import { projectRouter } from './projectRouter';
import { invoiceRouter } from './invoiceRouter';
import { expenseRouter } from './expenseRouter';
import { expenseCategoryRouter } from './expenseCategoryRouter';
import { reportingRouter } from './reportingRouter';
import { timeEntriesRouter } from './timeEntriesRouter';
import { contactRouter } from './contactRouter';
// import { contactAssociationRouter } from './contactAssociationRouter'; // TODO: Fix ctx.repos usage
import { taxRouter } from './taxRouter';
import { emailRouter } from './emailRouter';

export const appRouter = router({
  company: companyRouter,
  project: projectRouter,
  invoice: invoiceRouter,
  expense: expenseRouter,
  expenseCategory: expenseCategoryRouter,
  reporting: reportingRouter,
  timeEntries: timeEntriesRouter,
  contact: contactRouter,
  // contactAssociation: contactAssociationRouter, // TODO
  tax: taxRouter,
  email: emailRouter,
});

export type AppRouter = typeof appRouter;
