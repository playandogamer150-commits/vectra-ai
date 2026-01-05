import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { BRAND } from "@/lib/constants";
import { MonoIcon } from "@/components/mono-icon";
import { Loader2, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";

export default function LoginPage() {
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const { t, language } = useI18n();
    // Ideally useAuth would support loginWithCredentials, but for now we might use standard form post or simple fetch
    // if backend supports it. If not, we might fall back to Replit auth or show "Coming Soon".
    // Given "Vectra AI had...", we assume we need to visualize it.

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Placeholder for actual login logic. 
            // If we have passport-local, we would POST to /api/login or /auth/login
            const res = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: email, password }),
            });

            if (res.ok) {
                toast({
                    title: language === "pt-BR" ? "Sucesso" : "Success",
                    description: language === "pt-BR" ? "Login realizado com sucesso." : "Logged in successfully.",
                });
                const params = new URLSearchParams(window.location.search);
                setLocation(params.get("redirect") || "/image-studio");
            } else {
                toast({
                    variant: "destructive",
                    title: language === "pt-BR" ? "Erro" : "Error",
                    description: language === "pt-BR" ? "Credenciais inválidas." : "Invalid credentials.",
                });
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: language === "pt-BR" ? "Erro" : "Error",
                description: language === "pt-BR" ? "Falha ao conectar." : "Failed to connect.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
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
                            {language === "pt-BR" ? "Bem-vindo de volta" : "Welcome back"}
                        </CardTitle>
                        <CardDescription className="text-white/50">
                            {language === "pt-BR" ? "Entre com suas credenciais para continuar" : "Enter your credentials to continue"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleLogin} className="space-y-4">
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
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password" className="text-white/70">
                                        {language === "pt-BR" ? "Senha" : "Password"}
                                    </Label>
                                    <Link href="/auth/forgot-password">
                                        <span className="text-xs text-white/50 hover:text-white cursor-pointer transition-colors">
                                            {language === "pt-BR" ? "Esqueceu a senha?" : "Forgot password?"}
                                        </span>
                                    </Link>
                                </div>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-white/20"
                                    required
                                />
                            </div>
                            <Button
                                type="submit"
                                className="w-full bg-white text-black hover:bg-white/90 transition-all font-medium"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                    <ArrowRight className="w-4 h-4 mr-2" />
                                )}
                                {language === "pt-BR" ? "Entrar" : "Sign In"}
                            </Button>
                        </form>

                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-white/10" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-black px-2 text-white/30">
                                    {language === "pt-BR" ? "Ou continue com" : "Or continue with"}
                                </span>
                            </div>
                        </div>

                        <Button
                            variant="outline"
                            className="w-full border-white/10 bg-transparent text-white hover:bg-white/5 hover:text-white"
                            onClick={() => window.location.href = "/api/auth/github"}
                        >
                            <MonoIcon name="github" className="w-4 h-4 mr-2" />
                            GitHub
                        </Button>
                    </CardContent>
                    <CardFooter className="justify-center">
                        <div className="text-sm text-white/50">
                            {language === "pt-BR" ? "Não tem uma conta?" : "Don't have an account?"}{" "}
                            <Link href="/register">
                                <span className="text-white hover:underline cursor-pointer font-medium">
                                    {language === "pt-BR" ? "Cadastre-se" : "Sign up"}
                                </span>
                            </Link>
                        </div>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
