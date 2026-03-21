import { DotGrid } from "./dot-grid";
import { Bot, Phone } from "lucide-react";

function ChatBubble({
  side,
  children,
}: {
  side: "left" | "right";
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex ${side === "right" ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${side === "right"
          ? "bg-[#1EBEA6] text-white rounded-br-sm"
          : "bg-white text-[#303030] rounded-bl-sm shadow-sm"
          }`}
      >
        {children}
      </div>
    </div>
  );
}

function PhoneMockup() {
  return (
    <div className="relative w-[360px] md:w-[420px] lg:w-[480px]">
      {/* Phone frame */}
      <div className="bg-gradient-to-b from-[#e8e8e8] to-[#d4d4d4] rounded-[2.5rem] p-3 shadow-2xl">
        {/* Screen */}
        <div className="bg-[#f5f5f0] rounded-[2rem] overflow-hidden">
          {/* Status bar */}
          <div className="bg-white px-5 py-2 flex items-center justify-between">
            <span className="text-[10px] text-gray-500 font-medium">9:41</span>
            <div className="flex gap-1">
              <div className="w-3.5 h-1.5 bg-gray-400 rounded-sm" />
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
            </div>
          </div>

          {/* Chat header */}
          <div className="bg-white px-4 py-3 flex items-center gap-3 border-b border-gray-100">
            <div className="text-gray-400 text-lg">&lsaquo;</div>
            <div className="w-8 h-8 rounded-full bg-[#1EBEA6] flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-xs font-semibold text-[#303030]">
                HydroFlow Bot
              </div>
              <div className="text-[10px] text-gray-400">en l&iacute;nea</div>
            </div>
          </div>

          {/* Chat messages */}
          <div className="px-3 py-4 space-y-3 min-h-[320px] md:min-h-[360px]">
            <ChatBubble side="left">
              Hola! Soy el asistente de HydroFlow. ¿En qu&eacute; puedo ayudarte?
            </ChatBubble>

            <ChatBubble side="right">
              ¿Cu&aacute;l es el estado del Grupo de Bombeo 1?
            </ChatBubble>

            <ChatBubble side="left">
              <div className="space-y-1.5">
                <div className="font-semibold">Grupo de Bombeo 1</div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span>Estado: <strong>Activo</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3 h-3 text-gray-500" />
                  <span>Caudal: <strong>2.4 m&sup3;/s</strong></span>
                </div>
                <div>Volumen captado: <strong>1,250 m&sup3;</strong></div>
                <div>Nivel: <strong>1.8 m</strong></div>
              </div>
            </ChatBubble>

            <ChatBubble side="right">Gracias! 👍</ChatBubble>

            <ChatBubble side="left">
              ¿Necesitas algo m&aacute;s? Puedo enviarte alertas autom&aacute;ticas 📦📦
            </ChatBubble>

            <ChatBubble side="right">S&iacute;, activa alertas 😊</ChatBubble>
          </div>

          {/* Input bar */}
          <div className="bg-white px-3 py-2 flex items-center gap-2 border-t border-gray-100">
            <div className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-xs text-gray-400">
              Escribe un mensaje...
            </div>
            <div className="w-8 h-8 rounded-full bg-[#1EBEA6] flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4 text-white fill-current"
              >
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Bot avatar floating */}
      <div className="absolute -left-6 top-1/2 w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center">
        <Bot className="w-6 h-6 text-[#080935]" />
      </div>

      {/* User avatar floating */}
      <div className="absolute -right-4 top-1/4 w-10 h-10 rounded-full bg-[#1EBEA6] shadow-lg flex items-center justify-center">
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current">
          <circle cx="12" cy="8" r="4" />
          <path d="M20 21a8 8 0 10-16 0" />
        </svg>
      </div>
    </div>
  );
}

export function WhatsApp() {
  return (
    <section className="relative z-10 bg-[#D1F1EC] overflow-hidden">
      {/* Decorator */}
      <DotGrid
        className="absolute top-8 left-8 hidden md:block z-10"
        rows={3}
        cols={8}
        color="#CCCCCC"
      />

      <div className="absolute -top-56 -left-12 w-[890px] h-[890px] hidden lg:flex bg-[#DDF6F0] rounded-full justify-center items-center">
        <div className="relative w-[600px] h-[600px] hidden lg:block bg-[#F3FEF8] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 md:pt-20 lg:pt-24 pb-0">
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 items-end">
          {/* Phone mockup */}
          <div className="relative flex justify-center lg:justify-start order-2 lg:order-1 lg:basis-[45%]">
            <div className="mb-[-80px] lg:mb-[-120px] lg:ml-6">
              <PhoneMockup />
            </div>
          </div>

          {/* Text content */}
          <div className="order-1 lg:order-2 lg:text-right self-center pb-16 lg:pb-24 lg:basis-[55%]">
            <h2 className="font-[family-name:var(--font-barlow)] text-3xl md:text-5xl lg:text-7xl xl:text-[80px] text-[#303030] leading-[1]">
              Asistente de
              <br />
              <span className="text-[#1EBEA6] font-bold">Whatsapp</span>
              <br />
              24/7
            </h2>

            {/* Green accent bar */}
            <div className="w-24 h-1.5 bg-[#1EBEA6] mt-3 lg:ml-auto rounded-full" />

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
      <div className="absolute bottom-5 -right-20 w-[300px] h-[300px] lg:w-[450px] lg:h-[450px] rounded-full border-[25px] lg:border-[40px] border-[#018DC8]/5 hidden md:block" />
    </section>
  );
}
