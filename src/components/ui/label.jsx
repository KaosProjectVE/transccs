export function Label({ children, ...props }) {
  return <label className="block text-sm font-medium" {...props}>{children}</label>;
}
