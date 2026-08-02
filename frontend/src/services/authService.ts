import { apiGet, apiPost } from "@/services/apiClient";
import type { AuthResult, User, UserRole } from "@/types/models";

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface LoginInput {
  email: string;
  password: string;
}

export async function register(input: RegisterInput): Promise<AuthResult> {
  const { data } = await apiPost<AuthResult>("/auth/register", input);
  return data;
}

export async function login(input: LoginInput): Promise<AuthResult> {
  const { data } = await apiPost<AuthResult>("/auth/login", input);
  return data;
}

export async function getCurrentUser(): Promise<User> {
  const { data } = await apiGet<User>("/auth/me");
  return data;
}
