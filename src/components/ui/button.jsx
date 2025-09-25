import React from 'react'

export const Button = React.forwardRef(function Button({ children, className = '', variant = 'default', size = 'md', ...props }, ref) {
  const base = 'inline-flex items-center justify-center rounded transition-colors focus:outline-none';
  const variants = {
    default: 'bg-blue-600 text-white hover:bg-blue-700',
    outline: 'bg-transparent border border-gray-300',
    destructive: 'bg-red-600 text-white hover:bg-red-700'
  };
  const sizes = { sm: 'px-2 py-0.5 text-sm', md: 'px-3 py-1', lg: 'px-4 py-2' };
  return (
    <button ref={ref} className={`${base} ${variants[variant]||variants.default} ${sizes[size]||sizes.md} ${className}`} {...props}>
      {children}
    </button>
  )
})

export default Button
