import type { TextareaHTMLAttributes } from "react";

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className="min-h-28 w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-action focus:ring-2 focus:ring-blue-100" />;
}
