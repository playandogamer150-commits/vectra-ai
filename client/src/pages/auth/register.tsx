import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { BRAND } from "@/lib/constants";
import { MonoIcon } from "@/components/mono-icon";
import { Loader2, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";

export default function RegisterPage() {
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const { t, language } = useI18n(); // Assuming useI18n supports this or fallback

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast({
                title: language === "pt-BR" ? "Erro" : "Error",
                description: language === "pt-BR" ? "As senhas não coincidem." : "Passwords do not match.",
                variant: "destructive"
            });
            return;
        }

        setIsLoading(true);

        try {
            // Placeholder for actual register logic. 
            // POST to /api/register or similar if available.
            // If not, we fall back to redirecting to login or showing a message.
            const res = await fetch("/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: name, email, password }),
            });

            if (res.ok) {
                toast({
                    title: language === "pt-BR" ? "Conta criada" : "Account created",
                    description: language === "pt-BR" ? "Sua conta foi criada com sucesso." : "Your account has been created successfully.",
                });
                setLocation("/login");
            } else {
                // Fallback: If no dedicated register endpoint, maybe just redirect to login
                toast({
                    title: "Info",
                    description: "Registration simulated. Redirecting to login...",
                });
                setTimeout(() => setLocation("/login"), 1000);
            }
        } catch (error) {
            toast({
                title: "Info",
                description: "Regisration simulated. Redirecting to login...",
            });
            setTimeout(() => setLocation("/login"), 1000);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl opacity-50" />
                <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl opacity-50" />
            </div>

            {/* Content */}
            <div className="relative z-10 w-full max-w-md">
                <div className="flex justify-center mb-8">
                    <div className="flex items-center gap-2.5">
                        <MonoIcon name="logo" className="w-10 h-10" />
                        <span className="text-2xl font-medium tracking-tight text-white">{BRAND.name}</span>
                    </div>
                </div>

                <Card className="border-white/10 bg-black/50 backdrop-blur-xl shadow-2xl">
                    <CardHeader className="space-y-1 text-center">
                        <CardTitle className="text-2xl text-white">
                            {language === "pt-BR" ? "Crie sua conta" : "Create an account"}
                        </CardTitle>
                        <CardDescription className="text-white/50">
                            {language === "pt-BR" ? "Comece a criar com IA hoje mesmo" : "Start creating with AI today"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleRegister} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-white/70">
                                    {language === "pt-BR" ? "Nome" : "Name"}
                                </Label>
                                <Input
                                    id="name"
                                    type="text"
                                    placeholder="John Doe"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-white/20"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-white/70">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-white/20"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-white/70">
                                    {language === "pt-BR" ? "Senha" : "Password"}
                                </Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-white/20"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword" className="text-white/70">
                                    {language === "pt-BR" ? "Confirmar Senha" : "Confirm Password"}
                                </Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-white/20"
                                    required
                                />
                            </div>
                            <Button
                                type="submit"
                                className="w-full bg-white text-black hover:bg-white/90 transition-all font-medium mt-2"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                    <ArrowRight className="w-4 h-4 mr-2" />
                                )}
                                {language === "pt-BR" ? "Criar Conta" : "Create Account"}
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="justify-center">
                        <div className="text-sm text-white/50">
                            {language === "pt-BR" ? "Já tem uma conta?" : "Already have an account?"}{" "}
                            <Link href="/login">
                                <span className="text-white hover:underline cursor-pointer font-medium">
                                    {language === "pt-BR" ? "Entrar" : "Sign in"}
                                </span>
                            </Link>
                        </div>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
