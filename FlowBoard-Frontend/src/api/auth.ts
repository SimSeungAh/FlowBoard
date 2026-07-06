import { api } from "@/api/axios";

export interface SignupRequest {
  email: string;
  password: string;
  nickname: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}

export interface MyInfoResponse {
  id: number;
  email: string;
  nickname: string;
  role: string;
}

export const signup = async (data: SignupRequest) => {
  const response = await api.post("/auth/signup", data);
  return response.data;
};

export const login = async (data: LoginRequest) => {
  const response = await api.post("/auth/login", data);
  return response.data.data;
};

export const logout = async (refreshToken: string) => {
  const response = await api.post("/auth/logout", { refreshToken });
  return response.data;
};

export const reissue = async (refreshToken: string) => {
  const response = await api.post("/auth/reissue", {
    refreshToken,
  });
  return response.data.data;
};

export const getMyInfo = async () => {
  const response = await api.get("/users/me");
  return response.data.data;
};
