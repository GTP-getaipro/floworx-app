import React from "react";
import Logo from "../ui/Logo";

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-500 to-indigo-600 px-4 py-8">
      {/* Centered Auth Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-[420px] shadow-xl">
        {/* Logo + Tagline at top of card */}
        <div className="text-center mb-6">
          <div className="flex flex-col items-center gap-3">
            <div className="h-12 w-12 flex items-center justify-center">
              <Logo variant="transparent" size="md" showText={false} className="max-h-12 max-w-12 object-contain" />
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 font-medium">Email AI Built by Hot Tub Pros—For Hot Tub Pros</p>
            </div>
          </div>
        </div>

        {/* Card header */}
        {(title || subtitle) && (
          <div className="text-center mb-6">
            {title && (
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
            )}
            {subtitle && (
              <p className="text-gray-600 text-sm">{subtitle}</p>
            )}
          </div>
        )}

        {/* Form content */}
        <div className="space-y-4">
          {children}
        </div>
      </div>

      {/* Footer at bottom of screen */}
      <div className="mt-8 text-center text-white/70 text-sm">
        © 2025 FloWorx. All rights reserved.
      </div>
    </div>
  );
}
