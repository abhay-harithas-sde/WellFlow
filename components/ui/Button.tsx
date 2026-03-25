'use client';

import React, { KeyboardEvent } from 'react';

type ButtonVariant = 'primary' | 'secondary';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-green-600 text-white hover:bg-green-500 active:bg-green-700 border border-transparent',
  secondary:
    'bg-transparent text-green-400 hover:bg-green-500/10 active:bg-green-500/20 border border-green-600',
};

const baseClasses =
  'inline-flex items-center justify-center rounded-md px-5 py-2.5 text-sm font-semibold ' +
  'transition-colors duration-150 ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

export function Button({
  variant = 'primary',
  children,
  className = '',
  onClick,
  onKeyDown,
  type = 'button',
  disabled,
  ...rest
}: ButtonProps) {
  // Ensure Enter and Space trigger onClick for full keyboard accessibility
  // (native <button> already handles this, but we make it explicit)
  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick?.(e as unknown as React.MouseEvent<HTMLButtonElement>);
    }
    onKeyDown?.(e);
  }

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  );
}

export default Button;
