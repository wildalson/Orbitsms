import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import productsRouter from "./products";
import channelsRouter from "./channels";
import tasksRouter from "./tasks";
import recordsRouter from "./records";
import billingRouter from "./billing";
import dashboardRouter from "./dashboard";
import adminRouter from "./admin";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(requireAuth);
router.use(productsRouter);
router.use(channelsRouter);
router.use(tasksRouter);
router.use(recordsRouter);
router.use(billingRouter);
router.use(dashboardRouter);
router.use(adminRouter);

export default router;
