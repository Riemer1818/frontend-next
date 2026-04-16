import { router } from '@/server/trpc';
import { companyRouter } from './companyRouter';
import { projectRouter } from './projectRouter';
// import { invoiceRouter } from './invoiceRouter'; // TODO: Fix syntax errors
// import { expenseRouter } from './expenseRouter'; // TODO: Fix syntax errors
import { expenseCategoryRouter } from './expenseCategoryRouter';
// import { reportingRouter } from './reportingRouter'; // TODO: Fix syntax errors
// import { timeEntriesRouter } from './timeEntriesRouter'; // TODO: Fix syntax errors
// import { contactRouter } from './contactRouter'; // TODO: Fix ctx.repos usage
// import { contactAssociationRouter } from './contactAssociationRouter'; // TODO: Fix ctx.repos usage
// import { invoiceIngestionRouter } from './invoiceIngestionRouter'; // TODO: Fix ctx.repos usage
import { taxRouter } from './taxRouter';
import { emailRouter } from './emailRouter';

export const appRouter = router({
  company: companyRouter,
  project: projectRouter,
  // invoice: invoiceRouter, // TODO
  // expense: expenseRouter, // TODO
  expenseCategory: expenseCategoryRouter,
  // reporting: reportingRouter, // TODO
  // timeEntries: timeEntriesRouter, // TODO
  // contact: contactRouter, // TODO
  // contactAssociation: contactAssociationRouter, // TODO
  // invoiceIngestion: invoiceIngestionRouter, // TODO
  tax: taxRouter,
  email: emailRouter,
});

export type AppRouter = typeof appRouter;
