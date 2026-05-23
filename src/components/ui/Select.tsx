import type { SelectHTMLAttributes } from "react";

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className="min-h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-action focus:ring-2 focus:ring-blue-100" />;
}
