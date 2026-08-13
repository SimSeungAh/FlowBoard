import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

import { api } from "@/api/axios";

interface FailedRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

interface ApiResponse<T> {
  data: T;
}

const refreshApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: false,
});

const clearAuthAndRedirect = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");

  window.location.href = "/login";
};

api.interceptors.response.use(
  (response) => response,

  async (error: AxiosError) => {
    const originalRequest = error.config as FailedRequestConfig | undefined;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const isUnauthorized = error.response?.status === 401;

    const isAuthRequest = originalRequest.url?.includes("/auth/");

    if (!isUnauthorized || originalRequest._retry || isAuthRequest) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    const refreshToken = localStorage.getItem("refreshToken");

    if (!refreshToken) {
      clearAuthAndRedirect();

      return Promise.reject(error);
    }

    try {
      const response = await refreshApi.post<ApiResponse<TokenResponse>>("/auth/reissue", {
        refreshToken,
      });

      const tokenResponse = response.data.data;

      localStorage.setItem("accessToken", tokenResponse.accessToken);

      localStorage.setItem("refreshToken", tokenResponse.refreshToken);

      originalRequest.headers.Authorization = `Bearer ${tokenResponse.accessToken}`;

      return api(originalRequest);
    } catch (refreshError) {
      clearAuthAndRedirect();

      return Promise.reject(refreshError);
    }
  },
);
