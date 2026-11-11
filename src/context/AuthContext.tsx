"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { User } from "@/data/users";

export interface LoginResult {
  success: boolean;
  message?: string;
}

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  isInitialized: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => void;
  updateUser: (updatedData: { name?: string; email?: string; phone?: string; photoUrl?: string }) => Promise<boolean>;
  isLoginModalOpen: boolean;
  openLoginModal: (callback?: () => void) => void;
  closeLoginModal: () => void;
  pendingCallback: (() => void) | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Storage and Cookie helpers for persistent session across refreshes
function saveSessionToStorage(user: User) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("trypedia_auth_user", JSON.stringify(user));
      const safeCookieUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        photoUrl: user.photoUrl && !user.photoUrl.startsWith("data:") ? user.photoUrl : undefined,
        isVerified: user.isVerified,
        role: user.role,
      };
      document.cookie = `trypedia_auth_user=${encodeURIComponent(
        JSON.stringify(safeCookieUser)
      )}; path=/; max-age=2592000; SameSite=Lax`;
    } catch (e) {
      console.warn("Failed to save session:", e);
    }
  }
}

function clearSessionFromStorage() {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem("trypedia_auth_user");
      document.cookie =
        "trypedia_auth_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
    } catch (e) {}
  }
}

function restoreSessionFromStorage(): User | null {
  if (typeof window === "undefined") return null;

  // 1. Try LocalStorage
  try {
    const fromLocal = localStorage.getItem("trypedia_auth_user");
    if (fromLocal) {
      return JSON.parse(fromLocal);
    }
  } catch (e) {}

  // 2. Try Cookie Fallback
  try {
    const cookieMatch = document.cookie
      .split("; ")
      .find((row) => row.startsWith("trypedia_auth_user="));
    if (cookieMatch) {
      const decoded = decodeURIComponent(cookieMatch.split("=")[1]);
      return JSON.parse(decoded);
    }
  } catch (e) {}

  return null;
}

export function AuthProvider({ children,initialUser=null }: { children: ReactNode;initialUser?:User|null }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(initialUser);
  const [isInitialized, setIsInitialized] = useState<boolean>(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(null);

  useEffect(()=>{setUser(initialUser);},[initialUser]);
  useEffect(()=>{const refresh=async()=>{try{const r=await fetch('/api/auth/me');if(r.ok){const d=await r.json();setUser(old=>JSON.stringify(old)===JSON.stringify(d.user)?old:d.user);}}catch{}};window.addEventListener('focus',refresh);window.addEventListener('trypedia_identity_change',refresh);return()=>{window.removeEventListener('focus',refresh);window.removeEventListener('trypedia_identity_change',refresh);};},[]);
  const login = async (
    email: string,
    password: string
  ): Promise<LoginResult> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        setUser(data.user);
        saveSessionToStorage(data.user);
        setIsLoginModalOpen(false);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("trypedia_wallet_change"));
        }

        if (data.user.role === "SUPERADMIN") {
          setPendingCallback(null);
          React.startTransition(() => router.replace("/admin"));
          return { success: true };
        }
        if(!data.user.isVerified){setPendingCallback(null);React.startTransition(()=>router.push("/settings"));return {success:true};}
        if (pendingCallback) {
          pendingCallback();
          setPendingCallback(null);
        }
        return { success: true };
      }
      // Return exact error message from server
      return {
        success: false,
        message: data.message || "Email atau password salah.",
      };
    } catch {
      return { success: false, message: "Gagal terhubung ke server. Silakan coba lagi." };
    }
  };

  const logout = async () => {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (!response.ok) throw new Error("Gagal keluar akun.");
    setUser(null);
    clearSessionFromStorage();
    React.startTransition(() => { router.replace("/"); router.refresh(); });
  };

  const updateUser = async (updatedData: {
    name?: string;
    email?: string;
    phone?: string;
    photoUrl?: string;
  }): Promise<boolean> => {
    if (!user) return false;
    try {
      const res = await fetch("/api/user/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: user.id,
          name: updatedData.name ?? user.name,
          email: updatedData.email ?? user.email,
          phone: updatedData.phone ?? user.phone,
          photoUrl: updatedData.photoUrl !== undefined ? updatedData.photoUrl : user.photoUrl,
        }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        setUser(data.user);
        saveSessionToStorage(data.user);
        return true;
      }
    } catch (e) {
      console.warn("Update user error:", e);
    }
    return false;
  };

  const openLoginModal = (callback?: () => void) => {
    if (callback) {
      setPendingCallback(() => callback);
    } else {
      setPendingCallback(null);
    }
    setIsLoginModalOpen(true);
  };

  const closeLoginModal = () => {
    setIsLoginModalOpen(false);
    setPendingCallback(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        isInitialized,
        login,
        logout,
        updateUser,
        isLoginModalOpen,
        openLoginModal,
        closeLoginModal,
        pendingCallback,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

