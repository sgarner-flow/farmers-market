import Link from 'next/link';
import { ReactNode } from 'react';

interface ButtonProps {
  href?: string;
  variant?: 'primary' | 'secondary';
  children: ReactNode;
  className?: string;
}

export default function Button({ href, variant = 'primary', children, className = '' }: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center px-6 py-3 rounded-lg font-semibold transition-all duration-200 text-lg';
  const variants = {
    primary: 'bg-green-600 text-white hover:bg-green-700 shadow-lg hover:shadow-xl',
    secondary: 'bg-white text-green-600 border-2 border-green-600 hover:bg-green-50'
  };

  const buttonClasses = `${baseStyles} ${variants[variant]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={buttonClasses}>
        {children}
      </Link>
    );
  }

  return (
    <button className={buttonClasses}>
      {children}
    </button>
  );
} 