import { DotGrid } from "./dot-grid";

export function WhatsApp() {
  return (
    <section className="relative bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Device mockup */}
          <div className="relative flex justify-center lg:justify-start order-2 lg:order-1">
            <div className="relative w-[300px] md:w-[380px] lg:w-[450px]">
              {/* Placeholder for WhatsApp device mockup */}
              <div className="aspect-[4/3] bg-gradient-to-br from-[#1EBEA6]/10 to-[#018DC8]/10 rounded-2xl border-2 border-gray-200 shadow-xl flex items-center justify-center">
                <span className="text-gray-400 text-sm text-center px-4">
                  WhatsApp mockup<br />
                  (replace with exported image)
                </span>
              </div>
            </div>
          </div>

          {/* Text content */}
          <div className="order-1 lg:order-2 lg:text-right">
            <h2 className="font-[family-name:var(--font-barlow)] text-3xl md:text-5xl lg:text-7xl xl:text-[80px] text-[#303030] leading-[1]">
              Asistente de
              <br />
              <span className="text-[#1EBEA6]">Whatsapp</span>
              <br />
              24/7
            </h2>

            {/* Green accent bar */}
            <div className="w-24 h-1.5 bg-[#1EBEA6] mt-6 lg:ml-auto rounded-full" />

            <p className="font-[family-name:var(--font-barlow)] text-base md:text-lg lg:text-xl text-black mt-6 leading-relaxed max-w-lg lg:ml-auto">
              Recibe alertas, consulta indicadores de captaci&oacute;n y revisa el
              estado de los grupos de bombeo en tiempo real.
            </p>
            <p className="font-[family-name:var(--font-barlow)] text-base md:text-lg lg:text-xl text-black mt-4 leading-relaxed max-w-lg lg:ml-auto">
              <strong>HydroFlow Mobile</strong> mantiene a tu equipo informado
              incluso cuando no est&aacute;s en la finca.
            </p>
          </div>
        </div>
      </div>

      {/* Decorative arc */}
      <div className="absolute -bottom-20 -right-20 w-[300px] h-[300px] lg:w-[450px] lg:h-[450px] rounded-full border-[25px] lg:border-[40px] border-[#018DC8]/5 hidden md:block" />

      {/* Decorative dots */}
      <DotGrid
        className="absolute bottom-8 left-8 hidden md:block"
        rows={3}
        cols={8}
        color="#1EBEA6"
      />
    </section>
  );
}
