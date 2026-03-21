import Image from "next/image";
import { DotGrid } from "./dot-grid";

export function MobileApp() {
  return (
    <section className="relative bg-[#F0F0EB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:pl-10 pt-16 md:pt-20 lg:pt-24 pb-0">
        <div className="flex flex-col lg:flex-row gap-0 items-end w-full">
          {/* Text content */}
          <div className="self-center pb-16 lg:pb-24 leading-none lg:basis-[60%]">
            <h2 className="font-[family-name:var(--font-barlow)] text-3xl md:text-5xl lg:text-7xl xl:text-[80px] text-[#303030] leading-none">
              <span className="font-bold">Descarga</span> nuestra aplicaci&oacute;n m&oacute;vil.
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
                    <path d="M3.61 1.814L13.793 12 3.61 22.186a.996.996 0 01-.61-.92V2.734c0-.384.22-.72.61-.92zM14.855 13.062l2.31 2.31-10.49 5.96 8.18-8.27zm3.828-3.835l2.147 1.217a1.073 1.073 0 010 1.862l-2.37 1.344-2.54-2.562 2.763-1.861zM6.675 3.668l10.49 5.96-2.31 2.31-8.18-8.27z" />
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
          <div className="relative flex justify-center lg:justify-end lg:-mr-1 lg:basis-[40%]">
            <Image
              src="/images/landing/phone-app.png"
              alt="HydroFlow Mobile App"
              width={577}
              height={677}
              className="w-[350px] md:w-[450px] lg:w-[620px] h-auto"
            />
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
