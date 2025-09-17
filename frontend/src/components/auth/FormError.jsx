import React from "react";

export default function FormError({ children }) {
  if (!children) {
    return <div className="h-4"></div>; // Reserve space even when no error
  }

  return (
    <div className="h-4">
      <p className="text-red-400 text-xs mt-1">{children}</p>
    </div>
  );
}
