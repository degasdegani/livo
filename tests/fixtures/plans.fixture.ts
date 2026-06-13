import { Plan, PlanStatus } from "@prisma/client";

export const PLAN_FIXTURES = {
  trial: {
    plan: Plan.start,
    planStatus: PlanStatus.trial,
    trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    asaasCustomerId: null,
    asaasSubscriptionId: null,
  },
  trialExpired: {
    plan: Plan.start,
    planStatus: PlanStatus.trial,
    trialEndsAt: new Date("2023-01-01T00:00:00.000Z"),
    asaasCustomerId: null,
    asaasSubscriptionId: null,
  },
  active: {
    plan: Plan.start,
    planStatus: PlanStatus.active,
    trialEndsAt: null,
    asaasCustomerId: "cus_000001",
    asaasSubscriptionId: "sub_000001",
  },
  suspended: {
    plan: Plan.start,
    planStatus: PlanStatus.suspended,
    trialEndsAt: null,
    asaasCustomerId: "cus_000002",
    asaasSubscriptionId: "sub_000002",
  },
  cancelled: {
    plan: Plan.start,
    planStatus: PlanStatus.cancelled,
    trialEndsAt: null,
    asaasCustomerId: "cus_000003",
    asaasSubscriptionId: null,
  },
  lifetime: {
    plan: Plan.pro,
    planStatus: PlanStatus.lifetime,
    trialEndsAt: null,
    asaasCustomerId: null,
    asaasSubscriptionId: null,
  },
} as const;
