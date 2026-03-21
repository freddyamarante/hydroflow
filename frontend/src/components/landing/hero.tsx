import { ArrowButton } from "./arrow-button";

export function Hero() {
  return (
    <section className="relative min-h-[600px] lg:min-h-[785px] flex items-center justify-center overflow-hidden">
      {/* Background — dark gradient placeholder for video */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#000040] to-[#018DC8]" />

      {/* Background video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src="/videos/hero.webm" type="video/webm" />
      </video>

      {/* Gradient overlay on top of video */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#000040]/50 to-[#018DC8]/50" />

      {/* Decorative arcs */}
      <div className="absolute -top-32 -right-32 w-[350px] h-[350px] lg:w-[500px] lg:h-[500px] rounded-full border-[30px] lg:border-[50px] border-white/5" />
      <div className="absolute -bottom-24 -left-24 w-[250px] h-[250px] lg:w-[350px] lg:h-[350px] rounded-full border-[20px] lg:border-[40px] border-white/5" />

      {/* Radial blur layer to hide watermark */}
      <div
        className="absolute inset-0 backdrop-blur-lg"
        style={{
          WebkitMaskImage:
            "radial-gradient(circle, black 20%, transparent 70%)",
          maskImage:
            "radial-gradient(circle, black 20%, transparent 70%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pt-20">
        <h1 className="font-[family-name:var(--font-barlow-condensed)] font-bold text-4xl sm:text-5xl md:text-7xl lg:text-8xl xl:text-[105px] text-white leading-[1.2] tracking-tight">
          GESTI&Oacute;N DEL CICLO DEL AGUA
        </h1>
        <p className="font-[family-name:var(--font-barlow)] font-medium text-base sm:text-lg md:text-xl lg:text-[25px] text-white/90 mt-6 max-w-4xl mx-auto leading-relaxed lg:leading-[36px]">
          MONITOREO DE ESTACIONES DE BOMBEO, CONTROL DE CAPTACI&Oacute;N DE AGUA
          <br className="hidden md:block" /> Y OPTIMIZACI&Oacute;N DEL USO H&Iacute;DRICO
        </p>
        <div className="mt-8 lg:mt-10">
          <ArrowButton text="CONT&Aacute;CTANOS" variant="light" href="#contacto" />
        </div>
      </div>
    </section>
  );
}
