import { ArrowButton } from "./arrow-button";

export function Subscribe() {
  return (
    <section className="relative z-10 bg-[#080935] py-16 md:py-20 lg:pb-24 lg:pt-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-8">
        <h2 className="font-[family-name:var(--font-barlow)] font-bold text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-[60px] text-white leading-tight text-center md:text-left">
          Suscr&iacute;bete para estar al d&iacute;a
        </h2>
        <ArrowButton text="CONT&Aacute;CTANOS" variant="outline" href="#contacto" />
      </div>
    </section>
  );
}
