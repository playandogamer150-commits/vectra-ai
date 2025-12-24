import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/constants";
import { MonoIcon } from "@/components/mono-icon";
import { useI18n } from "@/lib/i18n";

export default function TermsPage() {
  const { language, setLanguage } = useI18n();

  const content = {
    "pt-BR": {
      title: "Termos de Serviço",
      lastUpdated: "Última atualização: Dezembro 2024",
      sections: [
        {
          title: "1. Aceitação dos Termos",
          content: `Ao acessar e usar o ${BRAND.name}, você concorda em cumprir estes Termos de Serviço. Se você não concordar com qualquer parte destes termos, não poderá acessar o serviço.`
        },
        {
          title: "2. Descrição do Serviço",
          content: `O ${BRAND.name} é uma plataforma de engenharia de prompts com inteligência artificial que permite aos usuários criar, editar e gerenciar prompts para modelos de linguagem de grande escala (LLMs). O serviço inclui geração de imagens, treinamento de LoRA e outras funcionalidades de IA.`
        },
        {
          title: "3. Conta de Usuário",
          content: "Você é responsável por manter a confidencialidade de sua conta e senha. Você concorda em notificar-nos imediatamente sobre qualquer uso não autorizado de sua conta."
        },
        {
          title: "4. Uso Aceitável",
          content: "Você concorda em não usar o serviço para: gerar conteúdo ilegal, prejudicial ou ofensivo; violar direitos de propriedade intelectual; distribuir malware ou spam; interferir no funcionamento do serviço."
        },
        {
          title: "5. Conteúdo Gerado",
          content: "O conteúdo que você gera usando nosso serviço é de sua propriedade. No entanto, você nos concede uma licença para usar, armazenar e processar esse conteúdo conforme necessário para fornecer o serviço."
        },
        {
          title: "6. Pagamentos e Assinaturas",
          content: "Os planos pagos são cobrados antecipadamente e não são reembolsáveis, exceto conforme exigido por lei. Você pode cancelar sua assinatura a qualquer momento, e o acesso continuará até o final do período de cobrança."
        },
        {
          title: "7. Limitação de Responsabilidade",
          content: `O ${BRAND.name} é fornecido "como está". Não garantimos que o serviço será ininterrupto, seguro ou livre de erros. Não seremos responsáveis por quaisquer danos indiretos, incidentais ou consequentes.`
        },
        {
          title: "8. Modificações",
          content: "Reservamo-nos o direito de modificar estes termos a qualquer momento. Notificaremos você sobre mudanças significativas através do email associado à sua conta."
        },
        {
          title: "9. Contato",
          content: "Para dúvidas sobre estes termos, entre em contato conosco através da página de suporte."
        }
      ]
    },
    "en": {
      title: "Terms of Service",
      lastUpdated: "Last updated: December 2024",
      sections: [
        {
          title: "1. Acceptance of Terms",
          content: `By accessing and using ${BRAND.name}, you agree to comply with these Terms of Service. If you do not agree with any part of these terms, you may not access the service.`
        },
        {
          title: "2. Service Description",
          content: `${BRAND.name} is an AI-powered prompt engineering platform that allows users to create, edit, and manage prompts for large language models (LLMs). The service includes image generation, LoRA training, and other AI functionalities.`
        },
        {
          title: "3. User Account",
          content: "You are responsible for maintaining the confidentiality of your account and password. You agree to notify us immediately of any unauthorized use of your account."
        },
        {
          title: "4. Acceptable Use",
          content: "You agree not to use the service to: generate illegal, harmful, or offensive content; violate intellectual property rights; distribute malware or spam; interfere with the service's operation."
        },
        {
          title: "5. Generated Content",
          content: "The content you generate using our service is your property. However, you grant us a license to use, store, and process that content as necessary to provide the service."
        },
        {
          title: "6. Payments and Subscriptions",
          content: "Paid plans are billed in advance and are non-refundable, except as required by law. You may cancel your subscription at any time, and access will continue until the end of the billing period."
        },
        {
          title: "7. Limitation of Liability",
          content: `${BRAND.name} is provided "as is." We do not guarantee that the service will be uninterrupted, secure, or error-free. We shall not be liable for any indirect, incidental, or consequential damages.`
        },
        {
          title: "8. Modifications",
          content: "We reserve the right to modify these terms at any time. We will notify you of significant changes via the email associated with your account."
        },
        {
          title: "9. Contact",
          content: "For questions about these terms, please contact us through the support page."
        }
      ]
    }
  };

  const t = content[language];

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-4xl mx-auto h-full px-6 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <MonoIcon name="logo" className="w-7 h-7" />
            <span className="text-base font-medium tracking-tight">{BRAND.name}</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLanguage(language === "pt-BR" ? "en" : "pt-BR")}
              className="text-xs"
            >
              {language === "pt-BR" ? "EN" : "PT"}
            </Button>
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                {language === "pt-BR" ? "Voltar" : "Back"}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-14">
        <article className="py-16 px-6">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl font-medium tracking-tight mb-2" data-testid="text-terms-title">
              {t.title}
            </h1>
            <p className="text-sm text-muted-foreground mb-12">{t.lastUpdated}</p>

            <div className="space-y-8">
              {t.sections.map((section, index) => (
                <section key={index}>
                  <h2 className="text-lg font-medium mb-3">{section.title}</h2>
                  <p className="text-muted-foreground leading-relaxed">{section.content}</p>
                </section>
              ))}
            </div>
          </div>
        </article>
      </main>

      <footer className="py-8 px-6 border-t border-border">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <MonoIcon name="logo" className="w-5 h-5" />
            <span className="text-sm font-medium">{BRAND.name}</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              {language === "pt-BR" ? "Privacidade" : "Privacy"}
            </Link>
            <Link href="/support" className="hover:text-foreground transition-colors">
              {language === "pt-BR" ? "Suporte" : "Support"}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
