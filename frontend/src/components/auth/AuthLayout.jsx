import React from "react";
import Logo from "../ui/Logo";

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-700 via-brand-600 to-indigo-700 relative overflow-hidden">
      {/* Background glow blobs */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-brand-500 rounded-full blur-3xl opacity-40 mix-blend-screen"></div>
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-indigo-500 rounded-full blur-3xl opacity-40 mix-blend-screen"></div>

      {/* Brand header */}
      <div className="relative z-10 pt-8 pb-4">
        <div className="text-center">
          <Logo variant="whiteOnBlue" size="md" showText={true} className="mx-auto mb-2" />
          <p className="text-slate-200 text-sm opacity-90">Email AI Built by Hot Tub Pros—For Hot Tub Pros</p>
        </div>
      </div>
      
      {/* Main content */}
      <div className="relative z-10 flex items-center justify-center px-4 pb-8">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl p-6 sm:p-8 w-full max-w-md sm:max-w-lg lg:max-w-xl">
          {/* Card header */}
          <div className="text-center mb-6">
            {title && (
              <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
            )}
            {subtitle && (
              <p className="text-slate-200 text-sm opacity-90">{subtitle}</p>
            )}
          </div>
          
          {/* Card content */}
          <div className="space-y-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
