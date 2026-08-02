import type { UserRole } from "@/modules/auth/user.types";

export {};

declare global {
  namespace Express {
    interface Request {
      // requestId middleware'i en başta (helmet'ten bile önce) her isteğe atar.
      id?: string;
      validated?: {
        body?: unknown;
        query?: unknown;
        params?: unknown;
      };
      // Mongoose Document'i değil, controller'ların ihtiyaç duyduğu düz alanlar taşınır;
      // böylece controller'lar model detayına bağımlı olmaz.
      user?: {
        id: string;
        email: string;
        name: string;
        role: UserRole;
      };
    }
  }
}
