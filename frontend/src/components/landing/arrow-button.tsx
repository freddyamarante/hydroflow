import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

type ArrowButtonProps = {
  text: string;
  variant?: "light" | "outline";
  href?: string;
  onClick?: () => void;
};

export function ArrowButton({
  text,
  variant = "light",
  href,
  onClick,
}: ArrowButtonProps) {
  const base =
    "inline-flex items-center gap-3 rounded-full px-6 py-3 font-[family-name:var(--font-barlow)] font-bold text-lg md:text-xl lg:text-[25px] transition-all duration-300 group";

  const variants = {
    light:
      "bg-white/70 text-[#080935] hover:bg-white/90 backdrop-blur-sm",
    outline:
      "border-2 border-white text-white hover:bg-white/10",
  };

  const circleVariants = {
    light: "bg-[#080935]",
    outline: "bg-[#018DC8]",
  };

  const content = (
    <>
      <span>{text}</span>
      <span
        className={`inline-flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-full ${circleVariants[variant]} transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5`}
      >
        <ArrowUpRight className="w-4 h-4 md:w-5 md:h-5 text-white" />
      </span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`${base} ${variants[variant]}`}>
        {content}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={`${base} ${variants[variant]}`}>
      {content}
    </button>
  );
}
