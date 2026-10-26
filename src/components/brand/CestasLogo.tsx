import { useId } from "react";

type CestasLogoProps = {
  className?: string;
  /** Mostra o nome "Cestas APP" abaixo do Ã­cone. */
  showWordmark?: boolean;
};

/**
 * Logo vetorial do Cestas APP.
 * SVG puro = fundo 100% transparente, nÃ­tido em qualquer tamanho/densidade de tela.
 */
export default function CestasLogo({
  className,
  showWordmark = true,
}: CestasLogoProps) {
  const uid = useId().replace(/:/g, "");
  const id = (name: string) => `${name}-${uid}`;

  return (
    <svg
      viewBox={showWordmark ? "0 0 320 252" : "0 0 320 176"}
      className={className}
      role="img"
      aria-label="Cestas APP"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={id("body")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a9d5c" />
          <stop offset="0.55" stopColor="#176b3a" />
          <stop offset="1" stopColor="#0a4220" />
        </linearGradient>
        <linearGradient id={id("rim")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3fbf78" />
          <stop offset="1" stopColor="#1d7a43" />
        </linearGradient>
        <linearGradient id={id("leaf")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7ed67f" />
          <stop offset="1" stopColor="#1f8a4a" />
        </linearGradient>
        <linearGradient id={id("word")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1f9a52" />
          <stop offset="1" stopColor="#0b4a24" />
        </linearGradient>
        <linearGradient id={id("app")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffc247" />
          <stop offset="1" stopColor="#f07a12" />
        </linearGradient>
        <linearGradient id={id("oil")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffd84a" />
          <stop offset="1" stopColor="#f2a90f" />
        </linearGradient>
        <radialGradient id={id("orange")} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#ffb347" />
          <stop offset="1" stopColor="#e86a0c" />
        </radialGradient>
        <radialGradient id={id("tomato")} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#ff6b5b" />
          <stop offset="1" stopColor="#c81e1e" />
        </radialGradient>
      </defs>

      {/* Folhas */}
      <g>
        <path
          d="M104 148 C50 150 30 104 50 62 C92 72 118 108 104 148 Z"
          fill={`url(#${id("leaf")})`}
        />
        <path
          d="M52 66 C74 88 92 112 102 142"
          stroke="#e9ffe9"
          strokeOpacity=".55"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M216 148 C270 150 290 104 270 62 C228 72 202 108 216 148 Z"
          fill={`url(#${id("leaf")})`}
        />
        <path
          d="M268 66 C246 88 228 112 218 142"
          stroke="#e9ffe9"
          strokeOpacity=".55"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      </g>

      {/* AlÃ§a (parte de trÃ¡s) */}
      <path
        d="M112 92 C108 34 212 34 208 92"
        fill="none"
        stroke="#0b4a24"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        d="M118 84 C120 46 200 46 202 84"
        fill="none"
        stroke="#4cc886"
        strokeOpacity=".55"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Produtos saindo da cesta */}
      <g>
        {/* Ã“leo */}
        <rect x="116" y="48" width="9" height="12" rx="2" fill="#d98e0b" />
        <rect x="112" y="58" width="19" height="40" rx="6" fill={`url(#${id("oil")})`} />
        <rect x="115" y="70" width="13" height="14" rx="3" fill="#fff" fillOpacity=".75" />
        {/* Lata vermelha */}
        <rect x="136" y="56" width="22" height="42" rx="4" fill="#d62828" />
        <rect x="136" y="68" width="22" height="9" fill="#fff" fillOpacity=".85" />
        <rect x="136" y="56" width="22" height="5" rx="2" fill="#f4a3a3" fillOpacity=".7" />
        {/* Laranja */}
        <circle cx="176" cy="80" r="17" fill={`url(#${id("orange")})`} />
        <path d="M176 64 C181 58 188 60 189 64 C184 68 178 67 176 64Z" fill="#2fa05a" />
        {/* Pacote azul */}
        <g transform="rotate(8 202 78)">
          <rect x="192" y="56" width="20" height="42" rx="3" fill="#2457b5" />
          <rect x="192" y="68" width="20" height="9" fill="#ffd23f" />
        </g>
        {/* Tomate */}
        <circle cx="152" cy="92" r="12" fill={`url(#${id("tomato")})`} />
        <path d="M146 84 L152 88 L158 84" stroke="#2fa05a" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* Corpo da cesta */}
      <path
        d="M98 98 H222 L210 148 Q207 160 195 160 H125 Q113 160 110 148 Z"
        fill={`url(#${id("body")})`}
      />
      {/* Trama */}
      <g stroke="#7be0a6" strokeOpacity=".22" strokeWidth="2.2" strokeLinecap="round">
        <path d="M103 114 H217" />
        <path d="M106 128 H214" />
        <path d="M109 142 H211" />
        <path d="M128 100 L122 158" />
        <path d="M146 100 L144 158" />
        <path d="M174 100 L176 158" />
        <path d="M192 100 L198 158" />
      </g>
      {/* Aro */}
      <rect x="90" y="88" width="140" height="17" rx="8.5" fill={`url(#${id("rim")})`} />
      <rect x="96" y="90.5" width="128" height="3" rx="1.5" fill="#fff" fillOpacity=".35" />

      {/* Emblema */}
      <circle cx="160" cy="128" r="17" fill="#fff" />
      <circle cx="160" cy="128" r="17" fill="none" stroke="#0b4a24" strokeOpacity=".12" />
      <g fill="none" stroke="#176b3a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M151.5 128 H168.5 L166 138 H154 Z" />
        <path d="M155.5 128 L158.5 121 M164.5 128 L161.5 121" />
      </g>

      {showWordmark && (
        <g textAnchor="middle" fontFamily="var(--font-jakarta), system-ui, sans-serif">
          <text
            x="160"
            y="216"
            fontSize="70"
            fontWeight="900"
            letterSpacing="-2.5"
            fill={`url(#${id("word")})`}
            stroke="#ffffff"
            strokeWidth="2"
            strokeOpacity=".9"
            paintOrder="stroke"
          >
            Cestas
          </text>
          <text
            x="162"
            y="243"
            fontSize="26"
            fontWeight="900"
            letterSpacing="7"
            fill={`url(#${id("app")})`}
          >
            APP
          </text>
          <path d="M70 236 H116" stroke="#f59a1d" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M204 236 H250" stroke="#f59a1d" strokeWidth="2.4" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}

