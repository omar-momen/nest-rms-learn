export type ThrottleLimit = {
  limit: number;
  ttl: number;
  blockDuration?: number;
};

export type RouteThrottleOverrides = {
  default: ThrottleLimit;
  authEmail?: ThrottleLimit;
};

export type AppThrottlerLimits = {
  default: ThrottleLimit;
  authEmail: ThrottleLimit;
};

export type AuthRouteThrottles = {
  register: RouteThrottleOverrides;
  login: RouteThrottleOverrides;
  refresh: RouteThrottleOverrides;
  forgotPassword: RouteThrottleOverrides;
  resetPassword: RouteThrottleOverrides;
};
