import { useI18n } from "@/lib/i18n";

function RetentionIcon() {
  // Monochrome SVG "emoji" style (clock + spark)
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 text-white/80"
      aria-hidden="true"
    >
      <path
        d="M12 7v5l3 2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 12a9 9 0 1 1-3.1-6.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20.5 4.5l-.7 2.1-2.1.7 2.1.7.7 2.1.7-2.1 2.1-.7-2.1-.7-.7-2.1z"
        fill="currentColor"
        opacity="0.9"
      />
    </svg>
  );
}

export function RetentionNotice({ kind }: { kind: "images" | "videos" }) {
  const { language } = useI18n();
  const noun =
    language === "pt-BR"
      ? kind === "images"
        ? "imagens"
        : "vídeos"
      : kind === "images"
        ? "images"
        : "videos";

  return (
    <div
      className="mb-6 rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-xl px-4 py-3 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]"
      data-testid={`retention-notice-${kind}`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] border border-white/10">
          <RetentionIcon />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium tracking-tight text-white">
            {language === "pt-BR"
              ? `Seus ${noun} serão armazenados por 30 dias.`
              : `Your ${noun} are stored for 30 days.`}
          </p>
          <p className="text-xs text-white/60">
            {language === "pt-BR"
              ? "Após esse período, serão excluídos automaticamente."
              : "After that, they are automatically deleted."}
          </p>
        </div>
      </div>
    </div>
  );
}


