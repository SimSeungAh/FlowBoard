import { create } from "zustand";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  isLogin: boolean;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clearTokens: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: localStorage.getItem("accessToken"),
  refreshToken: localStorage.getItem("refreshToken"),
  isLogin: !!localStorage.getItem("accessToken"),

  setTokens: (accessToken, refreshToken) => {
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);

    set({
      accessToken,
      refreshToken,
      isLogin: true,
    });
  },

  clearTokens: () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");

    set({
      accessToken: null,
      refreshToken: null,
      isLogin: false,
    });
  },
}));
