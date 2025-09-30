export function Dialog({ children, open }) {
  return open ? <div className="fixed inset-0 bg-black/50 flex items-center justify-center">{children}</div> : null;
}
export function DialogContent({ children }) { return <div className="bg-white p-4 rounded">{children}</div>; }
export function DialogHeader({ children }) { return <div className="font-bold mb-2">{children}</div>; }
export function DialogTitle({ children }) { return <h3 className="text-lg">{children}</h3>; }
export function DialogFooter({ children }) { return <div className="mt-2">{children}</div>; }
