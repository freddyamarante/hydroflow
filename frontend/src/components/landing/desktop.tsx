import Image from "next/image";
import { DotGrid } from "./dot-grid";
import { Download } from "lucide-react";

export function Desktop() {
  return (
    <section className="relative z-30 bg-white overflow-visible">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 md:pt-20 lg:pt-24 text-center">
        <h2 className="font-[family-name:var(--font-barlow)] text-3xl md:text-5xl lg:text-7xl xl:text-[80px] text-[#303030] leading-[1.1]">
          <span className="font-bold italic">Software</span> de escritorio
        </h2>

        <p className="font-[family-name:var(--font-barlow)] text-base md:text-lg lg:text-xl text-[#303030] mt-6 lg:mt-8 leading-relaxed max-w-3xl mx-auto">
          <strong>HydroFlow Desktop</strong> permite configurar estaciones de
          bombeo, analizar hist&oacute;ricos de captaci&oacute;n de agua y generar reportes
          operativos. Dise&ntilde;ado para supervisores y administradores que
          requieren un control completo del sistema.
        </p>

        {/* Windows download button */}
        <div className="mt-8">
          <a
            href="#"
            className="inline-flex items-center gap-2 bg-[#080935] text-white font-[family-name:var(--font-barlow)] font-bold text-sm md:text-base rounded-full px-6 py-3 hover:bg-[#0a0b45] transition-colors"
          >
            <Download className="w-4 h-4" />
            Descargar para Windows
          </a>
        </div>

        {/* Dashboard screenshot */}
        <div className="relative mt-10 lg:mt-0 mx-auto max-w-5xl">
          <Image
            src="/images/landing/dashboard-screenshot.png"
            alt="HydroFlow Desktop Dashboard"
            width={1097}
            height={655}
            className="relative lg:top-24 w-full h-auto rounded-xl shadow-2xl border-3 border-gray-200"
          />
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute -bottom-25 -left-20 w-[300px] h-[300px] lg:w-[450px] lg:h-[450px] rounded-full border-[25px] lg:border-[60px] border-[#018DC8]/5 hidden md:block pointer-events-none -z-10" />xz
      <DotGrid
        className="absolute top-1/3 left-4 hidden lg:block"
        rows={8}
        cols={3}
        color="#080935"
      />
      <DotGrid
        className="absolute bottom-1/4 right-4 hidden lg:block"
        rows={8}
        cols={3}
        color="#080935"
      />
    </section>
  );
}
