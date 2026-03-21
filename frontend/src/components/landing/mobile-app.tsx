import Image from "next/image";
import { DotGrid } from "./dot-grid";

export function MobileApp() {
  return (
    <section className="relative bg-[#F0F0EB] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Text content */}
          <div>
            <h2 className="font-[family-name:var(--font-barlow)] text-3xl md:text-5xl lg:text-7xl xl:text-[80px] text-[#303030] leading-[1.1]">
              <span className="font-bold">Descarga</span> nuestra
              <br />
              aplicaci&oacute;n m&oacute;vil.
            </h2>
            <p className="font-[family-name:var(--font-barlow)] text-base md:text-lg lg:text-xl text-black mt-6 lg:mt-8 leading-relaxed max-w-lg">
              Accede desde tu tel&eacute;fono al estado de las estaciones de bombeo, caudal
              instant&aacute;neo, volumen captado y alertas operativas.
            </p>
            <p className="font-[family-name:var(--font-barlow)] text-base md:text-lg lg:text-xl text-black mt-4 leading-relaxed max-w-lg">
              <strong>HydroFlow Mobile</strong> te permite supervisar la
              captaci&oacute;n de agua desde cualquier lugar.
            </p>

            {/* App store badges */}
            <div className="flex flex-wrap gap-4 mt-8">
              <a
                href="#"
                className="inline-block bg-black text-white rounded-lg px-4 py-2.5 hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                  <div className="text-left">
                    <div className="text-[10px] leading-tight">Available on the</div>
                    <div className="text-sm font-semibold leading-tight">App Store</div>
                  </div>
                </div>
              </a>
              <a
                href="#"
                className="inline-block bg-black text-white rounded-lg px-4 py-2.5 hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
                    <path d="M3.18 23.04c-.64-1.1-.3-3.7.88-7.37L7.5 12 4.06 8.33C2.88 4.66 2.54 2.06 3.18.96 3.82-.14 5.33-.3 7.72.96L12 3.54l4.28-2.58C18.67-.3 20.18-.14 20.82.96c.64 1.1.3 3.7-.88 7.37L16.5 12l3.44 3.67c1.18 3.67 1.52 6.27.88 7.37-.64 1.1-2.15 1.26-4.54 0L12 20.46l-4.28 2.58C5.33 24.3 3.82 24.14 3.18 23.04z" />
                  </svg>
                  <div className="text-left">
                    <div className="text-[10px] leading-tight">ANDROID APP ON</div>
                    <div className="text-sm font-semibold leading-tight">Google Play</div>
                  </div>
                </div>
              </a>
            </div>
          </div>

          {/* Phone mockup */}
          <div className="relative flex justify-center lg:justify-end">
            <div className="relative w-[280px] md:w-[320px] lg:w-[400px]">
              {/* Placeholder for phone mockup — replace with exported image */}
              <div className="aspect-[9/16] bg-gradient-to-b from-[#018DC8]/20 to-[#080935]/20 rounded-[2rem] border-4 border-gray-300 shadow-2xl flex items-center justify-center">
                <span className="text-gray-400 text-sm text-center px-4">
                  Phone mockup<br />
                  (replace with exported image)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative dots */}
      <DotGrid
        className="absolute top-8 right-8 lg:top-12 lg:right-12 hidden md:block"
        rows={3}
        cols={8}
        color="#018DC8"
      />
    </section>
  );
}
