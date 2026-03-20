import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import categoriesRouter from "./categories.js";
import providersRouter from "./providers.js";
import matchingRouter from "./matching.js";
import serviceRequestsRouter from "./serviceRequests.js";
import bookingsRouter from "./bookings.js";
import reviewsRouter from "./reviews.js";
import notificationsRouter from "./notifications.js";
import paymentsRouter from "./payments.js";
import adminRouter from "./admin.js";
import providerRouter from "./provider.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/categories", categoriesRouter);
router.use("/providers", providersRouter);
router.use("/matching", matchingRouter);
router.use("/service-requests", serviceRequestsRouter);
router.use("/bookings", bookingsRouter);
router.use("/reviews", reviewsRouter);
router.use("/notifications", notificationsRouter);
router.use("/payments", paymentsRouter);
router.use("/admin", adminRouter);
router.use("/provider", providerRouter);

export default router;
