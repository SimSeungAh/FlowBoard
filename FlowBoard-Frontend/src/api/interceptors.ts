import type { AxiosError, InternalAxiosRequestConfig } from "axios";

import { reissue } from "@/api/auth";
import { api } from "@/api/axios";

interface FailedRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as FailedRequestConfig;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem("refreshToken");

      if (!refreshToken) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        window.location.href = "/login";
        return Promise.reject(error);
      }

      try {
        const tokenResponse = await reissue(refreshToken);

        localStorage.setItem("accessToken", tokenResponse.accessToken);
        localStorage.setItem("refreshToken", tokenResponse.refreshToken);

        originalRequest.headers.Authorization = `Bearer ${tokenResponse.accessToken}`;

        return api(originalRequest);
      } catch {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        window.location.href = "/login";

        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);
