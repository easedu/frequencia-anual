"use client";

import * as React from "react";

interface ToastProps {
  children: React.ReactNode;
  className?: string;
}

export function Toast({ children, className = "" }: ToastProps) {
  return (
    <div className={`fixed top-4 right-4 z-50 max-w-sm ${className}`}>
      {children}
    </div>
  );
}