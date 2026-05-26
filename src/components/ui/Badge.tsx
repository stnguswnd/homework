import { cn } from "@/lib/utils";

const toneClasses = {
  blue: "bg-blue-50 text-blue-700",
  green: "bg-green-50 text-green-700",
  yellow: "bg-yellow-50 text-yellow-800",
  red: "bg-red-50 text-red-700",
  purple: "bg-purple-50 text-purple-700",
  gray: "bg-slate-100 text-slate-700"
};

export function Badge({ children, tone = "gray" }: { children: React.ReactNode; tone?: keyof typeof toneClasses }) {
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", toneClasses[tone])}>{children}</span>;
}
