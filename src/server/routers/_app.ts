import { router } from "../trpc";
import { authRouter } from "./auth";
import { adminRouter } from "./admin";
import { toolRequestsRouter } from "./toolRequests";
import { projectsRouter } from "./projects";
import { productsRouter } from "./products";
import { documentsRouter } from "./documents";
import { milestonesRouter } from "./milestones";
import { budgetRouter } from "./budget";
import { changeOrdersRouter } from "./changeOrders";
import { submittalsRouter } from "./submittals";
import { messagesRouter } from "./messages";
import { notificationsRouter } from "./notifications";
import { teamRouter } from "./team";
import { manufacturersRouter } from "./manufacturers";
import { activityRouter } from "./activity";
import { usersRouter } from "./users";
import { onboardingRouter } from "./onboarding";
import { copilotRouter } from "./copilot";
import { gridChatRouter } from "./gridChat";
import { seedRouter } from "./seed";
import { prioritiesRouter } from "./priorities";
import { prospectRadarRouter } from "./prospectRadar";

export const appRouter = router({
  auth: authRouter,
  admin: adminRouter,
  toolRequests: toolRequestsRouter,
  projects: projectsRouter,
  products: productsRouter,
  documents: documentsRouter,
  milestones: milestonesRouter,
  budget: budgetRouter,
  changeOrders: changeOrdersRouter,
  submittals: submittalsRouter,
  messages: messagesRouter,
  notifications: notificationsRouter,
  team: teamRouter,
  manufacturers: manufacturersRouter,
  activity: activityRouter,
  users: usersRouter,
  onboarding: onboardingRouter,
  copilot: copilotRouter,
  gridChat: gridChatRouter,
  seed: seedRouter,
  priorities: prioritiesRouter,
  prospectRadar: prospectRadarRouter,
});

export type AppRouter = typeof appRouter;
