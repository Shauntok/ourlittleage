"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function PasswordInput({
  value,
  onChange,
  placeholder = "密码",
  className = "",
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative">
      <input
        type={showPassword ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`
          w-full rounded-2xl border border-white/10
          bg-white/[0.07]
          px-5 py-4 pr-12
          text-sm text-white
          placeholder:text-white/25
          outline-none
          transition-all duration-300
          focus:border-white/35
          focus:bg-white/[0.12]
          ${className}
        `}
      />

      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="
          absolute right-4 top-1/2
          -translate-y-1/2
          text-white/35
          transition
          hover:text-white/70
        "
      >
        {showPassword ? (
          <EyeOff size={18} />
        ) : (
          <Eye size={18} />
        )}
      </button>
    </div>
  );
}