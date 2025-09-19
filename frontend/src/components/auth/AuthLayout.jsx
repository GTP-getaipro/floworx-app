import React from "react";
import Logo from "../ui/Logo";

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-700 via-brand-600 to-indigo-700 relative overflow-hidden">
      {/* Background glow blobs */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-brand-500 rounded-full blur-3xl opacity-40 mix-blend-screen"></div>
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-indigo-500 rounded-full blur-3xl opacity-40 mix-blend-screen"></div>

      {/* Flex container for perfect centering */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-sm sm:max-w-md md:max-w-md lg:max-w-lg xl:max-w-lg">
          {/* Compact header with logo + tagline in single section */}
          <div className="text-center mb-6">
            <div className="flex flex-col items-center gap-2">
              <div className="h-12 w-12 flex items-center justify-center overflow-hidden">
                <Logo variant="whiteOnBlue" size="sm" showText={true} className="max-h-12 max-w-12 object-contain" />
              </div>
              <p className="text-sm text-gray-200">Email AI Built by Hot Tub Pros—For Hot Tub Pros</p>
            </div>
          </div>

          {/* Form container - keeps everything in viewport */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl rounded-2xl p-4 sm:p-6 max-h-[600px] overflow-y-auto">
            {/* Card header */}
            {(title || subtitle) && (
              <div className="text-center mb-4">
                {title && (
                  <h2 className="text-xl font-bold text-white mb-1">{title}</h2>
                )}
                {subtitle && (
                  <p className="text-slate-200 text-xs opacity-90">{subtitle}</p>
                )}
              </div>
            )}

            {/* Card content */}
            <div className="space-y-4">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
