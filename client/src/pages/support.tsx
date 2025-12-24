import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BRAND } from "@/lib/constants";
import { MonoIcon } from "@/components/mono-icon";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { Send, HelpCircle, MessageSquare, BookOpen, Loader2 } from "lucide-react";

export default function SupportPage() {
  const { language, setLanguage } = useI18n();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    await new Promise(resolve => setTimeout(resolve, 1000));

    toast({
      title: language === "pt-BR" ? "Mensagem enviada!" : "Message sent!",
      description: language === "pt-BR" 
        ? "Responderemos em até 24 horas." 
        : "We'll respond within 24 hours.",
    });

    setFormData({ name: "", email: "", subject: "", message: "" });
    setIsSubmitting(false);
  };

  const faq = {
    "pt-BR": [
      {
        q: "Como funciona o plano gratuito?",
        a: "O plano gratuito permite até 10 gerações de prompts e 5 gerações de imagem por dia. Você tem acesso aos blueprints básicos e histórico de 7 dias."
      },
      {
        q: "Posso cancelar minha assinatura a qualquer momento?",
        a: "Sim! Você pode cancelar sua assinatura Pro a qualquer momento. O acesso continua até o final do período já pago."
      },
      {
        q: "O que é LoRA Training?",
        a: "LoRA (Low-Rank Adaptation) é uma técnica de fine-tuning que permite treinar modelos de IA com suas próprias imagens. Disponível apenas no plano Pro."
      },
      {
        q: "Os prompts gerados são privados?",
        a: "Sim, todos os seus prompts, imagens e dados são privados e não são compartilhados com terceiros."
      },
      {
        q: "Quais modelos de IA são suportados?",
        a: "Suportamos Midjourney, DALL-E, Stable Diffusion, Flux Pro e outros modelos populares. Cada perfil é otimizado para o modelo específico."
      },
      {
        q: "Como faço para exportar meu histórico?",
        a: "No plano Pro, você pode exportar todo seu histórico de prompts e imagens em formato JSON ou CSV através da página de Histórico."
      }
    ],
    "en": [
      {
        q: "How does the free plan work?",
        a: "The free plan allows up to 10 prompt generations and 5 image generations per day. You have access to basic blueprints and 7-day history."
      },
      {
        q: "Can I cancel my subscription at any time?",
        a: "Yes! You can cancel your Pro subscription at any time. Access continues until the end of the already paid period."
      },
      {
        q: "What is LoRA Training?",
        a: "LoRA (Low-Rank Adaptation) is a fine-tuning technique that allows training AI models with your own images. Available only on the Pro plan."
      },
      {
        q: "Are generated prompts private?",
        a: "Yes, all your prompts, images, and data are private and not shared with third parties."
      },
      {
        q: "Which AI models are supported?",
        a: "We support Midjourney, DALL-E, Stable Diffusion, Flux Pro, and other popular models. Each profile is optimized for the specific model."
      },
      {
        q: "How do I export my history?",
        a: "On the Pro plan, you can export all your prompt and image history in JSON or CSV format through the History page."
      }
    ]
  };

  const t = {
    title: language === "pt-BR" ? "Central de Suporte" : "Support Center",
    subtitle: language === "pt-BR" 
      ? "Como podemos ajudar você hoje?" 
      : "How can we help you today?",
    faqTitle: language === "pt-BR" ? "Perguntas Frequentes" : "Frequently Asked Questions",
    contactTitle: language === "pt-BR" ? "Fale Conosco" : "Contact Us",
    contactSubtitle: language === "pt-BR" 
      ? "Não encontrou o que procura? Envie uma mensagem." 
      : "Didn't find what you're looking for? Send us a message.",
    name: language === "pt-BR" ? "Nome" : "Name",
    email: "Email",
    subject: language === "pt-BR" ? "Assunto" : "Subject",
    message: language === "pt-BR" ? "Mensagem" : "Message",
    send: language === "pt-BR" ? "Enviar Mensagem" : "Send Message",
    sending: language === "pt-BR" ? "Enviando..." : "Sending...",
  };

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
        <section className="py-16 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4">
                <HelpCircle className="w-6 h-6" />
              </div>
              <h1 className="text-3xl font-medium tracking-tight mb-2" data-testid="text-support-title">
                {t.title}
              </h1>
              <p className="text-muted-foreground">{t.subtitle}</p>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mb-16">
              <Card className="text-center">
                <CardContent className="pt-6">
                  <BookOpen className="w-6 h-6 mx-auto mb-3 text-muted-foreground" />
                  <h3 className="font-medium mb-1">
                    {language === "pt-BR" ? "Documentação" : "Documentation"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {language === "pt-BR" ? "Guias e tutoriais" : "Guides and tutorials"}
                  </p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="pt-6">
                  <MessageSquare className="w-6 h-6 mx-auto mb-3 text-muted-foreground" />
                  <h3 className="font-medium mb-1">
                    {language === "pt-BR" ? "Comunidade" : "Community"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {language === "pt-BR" ? "Conecte-se com outros" : "Connect with others"}
                  </p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="pt-6">
                  <Send className="w-6 h-6 mx-auto mb-3 text-muted-foreground" />
                  <h3 className="font-medium mb-1">
                    {language === "pt-BR" ? "Contato Direto" : "Direct Contact"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {language === "pt-BR" ? "Resposta em 24h" : "24h response"}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="mb-16">
              <h2 className="text-xl font-medium mb-6">{t.faqTitle}</h2>
              <Card>
                <CardContent className="pt-6">
                  <Accordion type="single" collapsible className="w-full">
                    {faq[language].map((item, index) => (
                      <AccordionItem key={index} value={`item-${index}`}>
                        <AccordionTrigger className="text-left">{item.q}</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                          {item.a}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            </div>

            <div>
              <h2 className="text-xl font-medium mb-2">{t.contactTitle}</h2>
              <p className="text-muted-foreground mb-6">{t.contactSubtitle}</p>
              
              <Card>
                <CardContent className="pt-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">{t.name}</label>
                        <Input
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                          data-testid="input-support-name"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">{t.email}</label>
                        <Input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required
                          data-testid="input-support-email"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">{t.subject}</label>
                      <Input
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        required
                        data-testid="input-support-subject"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">{t.message}</label>
                      <Textarea
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        rows={5}
                        required
                        data-testid="input-support-message"
                      />
                    </div>
                    <Button type="submit" disabled={isSubmitting} data-testid="button-support-submit">
                      {isSubmitting ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t.sending}</>
                      ) : (
                        <><Send className="w-4 h-4 mr-2" /> {t.send}</>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
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
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              {language === "pt-BR" ? "Privacidade" : "Privacy"}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
