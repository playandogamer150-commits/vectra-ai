import { useState, useEffect, useRef, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MonoIcon } from "@/components/mono-icon";
import { BRAND } from "@/lib/constants";
import { CheckCircle, Users, ArrowRight, Lock, Zap, Shield, Layers } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ============================================================
// 3D ANIMATED CUBE - Minimalist Monochrome
// ============================================================
function Animated3DCube() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>(0);
    const mouseRef = useRef({ x: 0.5, y: 0.5 });
    const timeRef = useRef(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d", { alpha: true });
        if (!ctx) return;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const width = rect.width;
        const height = rect.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const size = Math.min(width, height) * 0.28;

        // Cube vertices
        const vertices = [
            [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
            [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
        ];

        // Cube edges
        const edges = [
            [0, 1], [1, 2], [2, 3], [3, 0],
            [4, 5], [5, 6], [6, 7], [7, 4],
            [0, 4], [1, 5], [2, 6], [3, 7]
        ];

        const animate = () => {
            const time = timeRef.current;
            ctx.clearRect(0, 0, width, height);

            const rotationX = time * 0.3 + (mouseRef.current.y - 0.5) * 0.5;
            const rotationY = time * 0.5 + (mouseRef.current.x - 0.5) * 0.5;

            const cosX = Math.cos(rotationX);
            const sinX = Math.sin(rotationX);
            const cosY = Math.cos(rotationY);
            const sinY = Math.sin(rotationY);

            const projected: { x: number; y: number; z: number }[] = [];

            for (const [vx, vy, vz] of vertices) {
                let x = vx * size;
                let y = vy * size;
                let z = vz * size;

                // Rotate X
                const y1 = y * cosX - z * sinX;
                const z1 = y * sinX + z * cosX;

                // Rotate Y
                const x2 = x * cosY + z1 * sinY;
                const z2 = -x * sinY + z1 * cosY;

                const scale = 400 / (400 + z2);
                projected.push({
                    x: centerX + x2 * scale,
                    y: centerY + y1 * scale,
                    z: z2
                });
            }

            // Draw edges with depth-based opacity
            for (const [i, j] of edges) {
                const p1 = projected[i];
                const p2 = projected[j];
                const avgZ = (p1.z + p2.z) / 2;
                const opacity = 0.15 + ((avgZ + size) / (size * 2)) * 0.6;

                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }

            // Draw vertices as small dots
            for (const p of projected) {
                const opacity = 0.2 + ((p.z + size) / (size * 2)) * 0.8;
                const radius = 2 + ((p.z + size) / (size * 2)) * 2;
                ctx.beginPath();
                ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
                ctx.fill();
            }

            timeRef.current += 0.008;
            animationRef.current = requestAnimationFrame(animate);
        };

        animate();
        return () => cancelAnimationFrame(animationRef.current);
    }, []);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        mouseRef.current = {
            x: (e.clientX - rect.left) / rect.width,
            y: (e.clientY - rect.top) / rect.height
        };
    }, []);

    const handleMouseLeave = useCallback(() => {
        mouseRef.current = { x: 0.5, y: 0.5 };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="w-64 h-64 md:w-80 md:h-80 cursor-pointer"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ touchAction: "none" }}
        />
    );
}

// ============================================================
// MINIMAL GRID BACKGROUND
// ============================================================
function GridBackground() {
    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-[0.03]">
            <div
                className="absolute inset-0"
                style={{
                    backgroundImage: `
                        linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)
                    `,
                    backgroundSize: "60px 60px"
                }}
            />
        </div>
    );
}

// ============================================================
// ANIMATED PLACEHOLDER CARDS
// ============================================================
const SLIDER_ITEMS = [
    { src: "/assets/waitlist-slider/slide-2.jpg", alt: "Gaming Setup" },
    { src: "/assets/waitlist-slider/slide-3.jpg", alt: "Hacking Scene" },
    { src: "/assets/waitlist-slider/slide-4.jpg", alt: "Lifestyle Shot" },
    { src: "/assets/waitlist-slider/slide-5.jpg", alt: "Studio Session" },
    { src: "/assets/waitlist-slider/slide-6.jpg", alt: "Crowd Scene" },
    { src: "/assets/waitlist-slider/slide-7.jpg", alt: "Automotive" },
    { src: "/assets/waitlist-slider/slide-8.jpg", alt: "Music Production" },
    { src: "/assets/waitlist-slider/slide-9.jpg", alt: "Cyber Security" },
    { src: "/assets/waitlist-slider/slide-10.jpg", alt: "Navigation" },
];

function PlaceholderMarquee() {
    return (
        <div className="w-full overflow-hidden py-12 relative">
            <div className="absolute inset-y-0 left-0 w-32 md:w-48 z-10 bg-gradient-to-r from-black to-transparent pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-32 md:w-48 z-10 bg-gradient-to-l from-black to-transparent pointer-events-none" />

            <motion.div
                className="flex gap-6 min-w-max"
                animate={{ x: ["0%", "-50%"] }}
                transition={{ repeat: Infinity, ease: "linear", duration: 40 }}
            >
                {[...SLIDER_ITEMS, ...SLIDER_ITEMS, ...SLIDER_ITEMS, ...SLIDER_ITEMS].map((item, i) => (
                    <motion.div
                        key={i}
                        className="w-64 h-40 md:w-80 md:h-52 rounded-xl border border-white/[0.1] bg-white/[0.05] relative overflow-hidden group shadow-2xl"
                        whileHover={{ scale: 1.05, borderColor: "rgba(255,255,255,0.3)" }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                    >
                        <img
                            src={item.src}
                            alt={item.alt}
                            loading="lazy"
                            className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500"
                        />

                        {/* Overlay Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 pointer-events-none" />

                        {/* Text Label on Hover */}
                        <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none">
                            <span className="text-white text-xs font-medium tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity delay-100">
                                {item.alt}
                            </span>
                        </div>
                    </motion.div>
                ))}
            </motion.div>
        </div>
    );
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function WaitlistPage() {
    const [email, setEmail] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [position, setPosition] = useState<number | null>(null);
    const [totalWaiting, setTotalWaiting] = useState(2847);
    const [error, setError] = useState("");

    useEffect(() => {
        const interval = setInterval(() => {
            setTotalWaiting(prev => prev + Math.floor(Math.random() * 2));
        }, 45000);

        document.title = "Waitlist | VECTRA AI";

        return () => clearInterval(interval);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!email || !email.includes("@")) {
            setError("Por favor, insira um email válido");
            return;
        }

        setIsSubmitting(true);

        try {
            const res = await apiRequest("POST", "/api/waitlist", { email });
            const data = await res.json();

            if (data.error) {
                throw new Error(data.error);
            }

            setPosition(data.position);
            setIsSubmitted(true);
            setTotalWaiting(prev => prev + 1);
        } catch (err) {
            console.error(err);
            setError("Ocorreu um erro. Tente novamente.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const features = [
        {
            icon: <Zap className="w-5 h-5" />,
            title: "Velocidade",
            description: "Geração de vídeo em segundos com Seedance 1.5."
        },
        {
            icon: <Shield className="w-5 h-5" />,
            title: "Privacidade",
            description: "Criptografia de ponta a ponta em todas as criações."
        },
        {
            icon: <Layers className="w-5 h-5" />,
            title: "Qualidade 4K",
            description: "Saídas em alta resolução prontas para broadcast."
        }
    ];

    return (
        <div className="min-h-screen bg-black text-white relative overflow-x-hidden selection:bg-white/20">
            <GridBackground />

            {/* Navigation */}
            <nav className="relative z-20 flex items-center justify-between px-6 md:px-16 py-6">
                <div className="flex items-center gap-3">
                    <MonoIcon name="logo" className="w-7 h-7 text-white" />
                    <span className="text-base font-semibold tracking-tight text-white">
                        {BRAND.name}
                    </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-white/40 border border-white/10 px-3 py-1.5 rounded-full">
                    <Users className="w-3.5 h-3.5" />
                    <span className="tabular-nums text-white/60">{totalWaiting.toLocaleString()}</span>
                    <span className="hidden sm:inline">na fila</span>
                </div>
            </nav>

            {/* Main content */}
            <main className="relative z-10 flex flex-col items-center pt-8 md:pt-16 pb-20 px-6">

                {/* Hero Section */}
                <div className="max-w-4xl mx-auto text-center">

                    {/* 3D Cube */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                        className="mb-8 flex justify-center"
                    >
                        <Animated3DCube />
                    </motion.div>

                    {/* Badge */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 text-xs mb-10 bg-white/[0.02]"
                    >
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                        <span className="text-white/50 font-medium tracking-wide">Acesso Antecipado</span>
                    </motion.div>

                    {/* Headline */}
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 leading-[0.95] tracking-tight"
                    >
                        <span className="text-white">Imagine.</span>
                        <br />
                        <span className="text-white/40">Crie. Domine.</span>
                    </motion.h1>

                    {/* Subtitle */}
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
                        className="text-base md:text-lg text-white/30 max-w-xl mx-auto mb-14 leading-relaxed font-light"
                    >
                        Estúdio de IA focado em <span className="text-white/60">consistência de marca</span> e{" "}
                        <span className="text-white/60">biometria preservada</span>.
                    </motion.p>

                    {/* Placeholder Marquee */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6, duration: 1 }}
                        className="mb-16 -mx-6 md:-mx-20"
                    >
                        <PlaceholderMarquee />
                    </motion.div>

                    {/* VSL Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.4, duration: 0.8 }}
                        className="mb-16 w-full"
                    >
                        <div className="relative w-full aspect-video rounded-xl border border-white/10 bg-black/40 overflow-hidden shadow-2xl">
                            <iframe
                                src="https://fast.wistia.net/embed/iframe/yrov29tyq5?seo=true&videoFoam=true"
                                title="Vectra AI Tour"
                                allow="autoplay; fullscreen"
                                className="w-full h-full border-0"
                                name="wistia_embed"
                            />
                        </div>
                        <p className="text-white/20 text-[10px] text-center mt-2 uppercase tracking-widest">
                            Em caso de erro, desative "Domain Restriction" no Wistia ou atualize a página.
                        </p>
                    </motion.div>

                    {/* Form or Success State */}
                    <AnimatePresence mode="wait">
                        {!isSubmitted ? (
                            <motion.div
                                key="form"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                            >
                                <form onSubmit={handleSubmit} className="max-w-md mx-auto">
                                    <div className="flex p-1 bg-white/[0.03] border border-white/10 rounded-lg overflow-hidden">
                                        <Input
                                            type="email"
                                            placeholder="seu@email.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="h-11 bg-transparent border-0 text-white placeholder:text-white/20 focus-visible:ring-0 focus-visible:ring-offset-0 px-4 text-sm w-full"
                                            disabled={isSubmitting}
                                        />
                                        <Button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="h-11 px-5 bg-white hover:bg-white/90 text-black font-medium rounded-md transition-all duration-300 text-sm"
                                        >
                                            {isSubmitting ? (
                                                <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                            ) : (
                                                <span className="flex items-center gap-1.5">
                                                    Entrar <ArrowRight className="w-3.5 h-3.5" />
                                                </span>
                                            )}
                                        </Button>
                                    </div>
                                    {error && (
                                        <motion.p
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="mt-3 text-red-400/80 text-xs"
                                        >
                                            {error}
                                        </motion.p>
                                    )}
                                    <p className="mt-4 text-white/20 text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2">
                                        <Lock className="w-3 h-3" /> Acesso Seguro • Sem Spam
                                    </p>
                                </form>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                                className="max-w-sm mx-auto border border-white/10 rounded-xl bg-white/[0.02] p-8"
                            >
                                <div className="w-16 h-16 mx-auto mb-6 border border-white/10 rounded-full flex items-center justify-center">
                                    <CheckCircle className="w-8 h-8 text-white/80" />
                                </div>

                                <h3 className="text-2xl font-bold mb-2 text-white">Você está na lista</h3>
                                <p className="text-white/40 mb-8 text-sm">
                                    Avisaremos quando chegar sua vez.
                                </p>

                                <div className="p-5 bg-white/[0.03] rounded-lg mb-8 border border-white/5">
                                    <p className="text-[10px] font-medium text-white/30 uppercase tracking-[0.2em] mb-1">Posição</p>
                                    <p className="text-4xl font-bold text-white tracking-tight">
                                        #{position?.toLocaleString()}
                                    </p>
                                </div>

                                <a
                                    href="https://discord.gg/DFPtKzQFYq"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 w-full py-3 bg-white/5 hover:bg-white/10 text-white/80 font-medium rounded-lg transition-all duration-300 text-sm border border-white/10"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                                    </svg>
                                    Entrar no Discord
                                </a>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Features Grid */}
                    <div className="grid md:grid-cols-3 gap-4 mt-24">
                        {features.map((feature, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 + 0.3, duration: 0.6, ease: "easeOut" }}
                                className="p-6 border border-white/[0.06] rounded-lg bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/10 transition-all duration-500 text-left group"
                            >
                                <div className="w-10 h-10 mb-5 border border-white/10 rounded-lg flex items-center justify-center text-white/40 group-hover:text-white/60 transition-colors">
                                    {feature.icon}
                                </div>
                                <h3 className="text-sm font-semibold mb-2 text-white/80">{feature.title}</h3>
                                <p className="text-white/30 text-xs leading-relaxed">{feature.description}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="relative z-10 py-8 text-center text-white/15 text-[10px] uppercase tracking-[0.2em] flex flex-col gap-2">
                <p>© 2025 VECTRA AI</p>
                <div className="flex justify-center gap-4">
                    <a href="#" className="hover:text-white/30 transition-colors">Termos de Uso</a>
                    <span>•</span>
                    <a href="#" className="hover:text-white/30 transition-colors">Privacidade</a>
                </div>
            </footer>
        </div>
    );
}
