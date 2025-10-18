// (3) Auth API wrappers (JWT-based)
import { http } from "@/lib/http";

export type User = {
  id: number;
  email: string;
  name: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type RegisterInput = {
  email: string;
  password: string;
  name: string;
};

export type LoginResponse = {
  access_token: string;
  token_type: string;
};

export async function register(body: RegisterInput) {
  return http<User>("/auth/register", { method: "POST", body });
}

export async function login(body: LoginInput) {
  return http<LoginResponse>("/auth/login", { method: "POST", body });
}

export async function me(token: string) {
  return http<User>("/auth/me", { token });
}
