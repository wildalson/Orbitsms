import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import productsRouter from "./products";
import channelsRouter from "./channels";
import tasksRouter from "./tasks";
import recordsRouter from "./records";
import billingRouter from "./billing";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(productsRouter);
router.use(channelsRouter);
router.use(tasksRouter);
router.use(recordsRouter);
router.use(billingRouter);
router.use(dashboardRouter);

export default router;
