"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  detectLanguageMode,
  LANGUAGE_STORAGE_KEY,
  LanguageMode,
} from "@/lib/language";

// ===== 语言 Context 类型 =====
type LanguageContextType = {
  mode: LanguageMode;
  setMode: (mode: LanguageMode) => void;
};

// ===== 建立 Context =====
const LanguageContext =
  createContext<LanguageContextType | null>(null);

// ===== 全站语言 Provider =====
export function LanguageProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mode, setModeState] =
    useState<LanguageMode>("simplified");

  // ===== 第一次进入网站：读取 localStorage 或自动检测 =====
  useEffect(() => {
    const savedMode = localStorage.getItem(
      LANGUAGE_STORAGE_KEY
    ) as LanguageMode | null;

    if (savedMode) {
      setModeState(savedMode);
      return;
    }

    setModeState(detectLanguageMode());
  }, []);

  // ===== 手动切换时：保存到 localStorage =====
  function setMode(newMode: LanguageMode) {
    setModeState(newMode);
    localStorage.setItem(
      LANGUAGE_STORAGE_KEY,
      newMode
    );
  }

  return (
    <LanguageContext.Provider
      value={{
        mode,
        setMode,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

// ===== 给其他组件使用语言状态 =====
export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error(
      "useLanguage must be used inside LanguageProvider"
    );
  }

  return context;
}