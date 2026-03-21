import { Logo } from "./logo";
import { Phone, Mail, MapPin } from "lucide-react";

export function Footer() {
  return (
    <footer id="contacto" className="bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 lg:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-20">
          {/* Left column */}
          <div>
            <Logo className="w-48 md:w-64" variant="dark" />
            <p className="font-[family-name:var(--font-barlow)] text-base md:text-lg lg:text-xl text-[#303030] mt-6 leading-relaxed max-w-md">
              HydroFlow integra monitoreo, an&aacute;lisis y control del uso del
              agua en una sola plataforma.
            </p>

            {/* Email subscription */}
            <div className="flex flex-col sm:flex-row gap-3 mt-8 max-w-md">
              <input
                type="email"
                placeholder="Correo electr&oacute;nico"
                className="flex-1 bg-[#F0F0EB] text-[#303030] font-[family-name:var(--font-barlow)] text-base rounded-lg px-5 py-3 outline-none focus:ring-2 focus:ring-[#018DC8] placeholder:text-[#303030]/60"
              />
              <button className="bg-[#d9d9d9] text-[#303030] font-[family-name:var(--font-barlow)] font-bold text-base rounded-lg px-6 py-3 hover:bg-[#c9c9c9] transition-colors border border-black/10">
                Registrarse
              </button>
            </div>
          </div>

          {/* Right column */}
          <div className="md:text-right">
            <h3 className="font-[family-name:var(--font-barlow)] font-bold text-lg md:text-xl text-[#303030]">
              Cont&aacute;ctanos:
            </h3>
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2 md:justify-end">
                <Phone className="w-4 h-4 text-[#018DC8] shrink-0" />
                <span className="font-[family-name:var(--font-barlow)] text-base md:text-lg text-[#303030]">
                  +593 12 345 6789
                </span>
              </div>
              <div className="flex items-center gap-2 md:justify-end">
                <Mail className="w-4 h-4 text-[#018DC8] shrink-0" />
                <span className="font-[family-name:var(--font-barlow)] text-base md:text-lg text-[#303030]">
                  contacto@hydroflow.com
                </span>
              </div>
            </div>

            <h3 className="font-[family-name:var(--font-barlow)] font-bold text-lg md:text-xl text-[#303030] mt-8">
              Direcci&oacute;n:
            </h3>
            <div className="flex items-center gap-2 mt-3 md:justify-end">
              <MapPin className="w-4 h-4 text-[#018DC8] shrink-0" />
              <span className="font-[family-name:var(--font-barlow)] text-base md:text-lg text-[#303030]">
                Guayaquil - Ecuador
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright bar */}
      <div className="bg-[#018DC8] py-4">
        <p className="font-[family-name:var(--font-barlow)] text-sm md:text-base text-white text-center">
          Copyright 2026. All Right Reserved By Hydroflow
        </p>
      </div>
    </footer>
  );
}
