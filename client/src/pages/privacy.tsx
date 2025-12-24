import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/constants";
import { MonoIcon } from "@/components/mono-icon";
import { useI18n } from "@/lib/i18n";

export default function PrivacyPage() {
  const { language, setLanguage } = useI18n();

  const content = {
    "pt-BR": {
      title: "Política de Privacidade",
      lastUpdated: "Última atualização: Dezembro 2024",
      sections: [
        {
          title: "1. Informações que Coletamos",
          content: "Coletamos informações que você nos fornece diretamente, como nome, email e dados de pagamento. Também coletamos automaticamente informações sobre seu uso do serviço, incluindo prompts gerados e imagens criadas."
        },
        {
          title: "2. Como Usamos suas Informações",
          content: "Usamos suas informações para: fornecer e melhorar nossos serviços; processar pagamentos; enviar comunicações sobre sua conta; personalizar sua experiência; e cumprir obrigações legais."
        },
        {
          title: "3. Compartilhamento de Dados",
          content: "Não vendemos suas informações pessoais. Podemos compartilhar dados com: provedores de serviço (como processadores de pagamento); quando exigido por lei; para proteger nossos direitos ou segurança."
        },
        {
          title: "4. Armazenamento e Segurança",
          content: "Seus dados são armazenados em servidores seguros. Implementamos medidas técnicas e organizacionais para proteger suas informações contra acesso não autorizado, perda ou alteração."
        },
        {
          title: "5. Cookies e Tecnologias Similares",
          content: "Usamos cookies para manter você conectado, lembrar suas preferências e melhorar nosso serviço. Você pode controlar o uso de cookies através das configurações do seu navegador."
        },
        {
          title: "6. Seus Direitos (LGPD)",
          content: "De acordo com a Lei Geral de Proteção de Dados (LGPD), você tem direito a: acessar seus dados; corrigir informações incorretas; solicitar a exclusão de seus dados; obter portabilidade de dados; revogar consentimento."
        },
        {
          title: "7. Retenção de Dados",
          content: "Mantemos seus dados enquanto sua conta estiver ativa ou conforme necessário para fornecer serviços. Dados de histórico são mantidos por até 1 ano para usuários gratuitos e indefinidamente para assinantes Pro."
        },
        {
          title: "8. Transferência Internacional",
          content: "Seus dados podem ser processados em servidores localizados fora do Brasil. Garantimos que essas transferências estejam em conformidade com as leis de proteção de dados aplicáveis."
        },
        {
          title: "9. Menores de Idade",
          content: "Nosso serviço não é destinado a menores de 18 anos. Não coletamos intencionalmente informações de menores."
        },
        {
          title: "10. Contato e DPO",
          content: "Para exercer seus direitos ou tirar dúvidas sobre privacidade, entre em contato através da página de suporte. Nosso Encarregado de Proteção de Dados (DPO) pode ser contatado pelo mesmo canal."
        }
      ]
    },
    "en": {
      title: "Privacy Policy",
      lastUpdated: "Last updated: December 2024",
      sections: [
        {
          title: "1. Information We Collect",
          content: "We collect information you provide directly, such as name, email, and payment data. We also automatically collect information about your use of the service, including generated prompts and created images."
        },
        {
          title: "2. How We Use Your Information",
          content: "We use your information to: provide and improve our services; process payments; send communications about your account; personalize your experience; and comply with legal obligations."
        },
        {
          title: "3. Data Sharing",
          content: "We do not sell your personal information. We may share data with: service providers (such as payment processors); when required by law; to protect our rights or safety."
        },
        {
          title: "4. Storage and Security",
          content: "Your data is stored on secure servers. We implement technical and organizational measures to protect your information against unauthorized access, loss, or alteration."
        },
        {
          title: "5. Cookies and Similar Technologies",
          content: "We use cookies to keep you logged in, remember your preferences, and improve our service. You can control cookie use through your browser settings."
        },
        {
          title: "6. Your Rights (GDPR)",
          content: "Under the General Data Protection Regulation (GDPR), you have the right to: access your data; correct inaccurate information; request deletion of your data; obtain data portability; withdraw consent."
        },
        {
          title: "7. Data Retention",
          content: "We retain your data while your account is active or as needed to provide services. History data is kept for up to 1 year for free users and indefinitely for Pro subscribers."
        },
        {
          title: "8. International Transfer",
          content: "Your data may be processed on servers located outside your country. We ensure that these transfers comply with applicable data protection laws."
        },
        {
          title: "9. Minors",
          content: "Our service is not intended for individuals under 18 years of age. We do not knowingly collect information from minors."
        },
        {
          title: "10. Contact and DPO",
          content: "To exercise your rights or ask questions about privacy, please contact us through the support page. Our Data Protection Officer (DPO) can be reached through the same channel."
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
            <h1 className="text-3xl font-medium tracking-tight mb-2" data-testid="text-privacy-title">
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
            <Link href="/terms" className="hover:text-foreground transition-colors">
              {language === "pt-BR" ? "Termos" : "Terms"}
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
