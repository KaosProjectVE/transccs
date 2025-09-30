export function Popover({ children }) { return <div className="relative inline-block">{children}</div>; }
export function PopoverTrigger({ children }) { return <>{children}</>; }
export function PopoverContent({ children }) { return <div className="absolute mt-2 border p-2 bg-white shadow">{children}</div>; }
