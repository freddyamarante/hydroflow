import { DotGrid } from "./dot-grid";
import { Download } from "lucide-react";

export function Desktop() {
  return (
    <section className="relative bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 lg:py-24 text-center">
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
        <div className="relative mt-10 lg:mt-14 mx-auto max-w-5xl">
          <div className="aspect-[16/10] bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl border border-gray-200 shadow-2xl overflow-hidden flex items-center justify-center">
            <span className="text-gray-400 text-sm text-center px-4">
              Dashboard screenshot<br />
              (replace with exported image)
            </span>
          </div>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute -top-16 -left-16 w-[250px] h-[250px] lg:w-[350px] lg:h-[350px] rounded-full border-[20px] lg:border-[35px] border-[#080935]/5 hidden md:block" />
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
