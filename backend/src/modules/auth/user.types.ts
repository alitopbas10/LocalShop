export const USER_ROLES = ["customer", "seller"] as const;

export type UserRole = (typeof USER_ROLES)[number];
