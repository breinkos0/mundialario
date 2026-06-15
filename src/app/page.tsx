"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import Image from "next/image";
import {
  Gamepad2,
  Users,
  BarChart3,
  MessageSquare,
  UserPlus,
  Trophy,
  Home,
  Menu,
  X,
  ArrowRight,
  Plus,
  Minus,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  CalendarRange,
  Timer,
  Calculator
} from "lucide-react";

// High-fidelity FIFA World Cup Trophy SVG
const FifaTrophyIcon = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 28h12v2H10z" fill="#D97706" />
    <path d="M12 25h8v3h-8z" fill="#F59E0B" />
    <path d="M13 16c0 4 2 6 2 9h2c0-3 2-5 2-9h-6z" fill="#F59E0B" />
    <path d="M14 20c0 2 1 3 1 5h2c0-2 1-3 1-5h-4z" fill="#D97706" />
    <path d="M11 12c1-1 2-1 3 0l1 2-2 3-2-5z" fill="#D97706" />
    <path d="M21 12c-1-1-2-1-3 0l-1 2 2 3 2-5z" fill="#D97706" />
    <circle cx="16" cy="9" r="5" fill="#F59E0B" />
    <path d="M13 8.5c1.5-.5 3-.5 4.5 0M12 10c2.5 1 5.5 0 8 0" stroke="#B45309" strokeWidth="0.75" strokeLinecap="round" />
  </svg>
);

// High-fidelity Sparkle Icon
const SparkleIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12 0L14.6 9.4L24 12L14.6 14.6L12 24L9.4 14.6L0 12L9.4 9.4Z" />
  </svg>
);

// Custom Soccer Ball Icon
const SoccerBallIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
    <path d="M12 6l-3.5 2.5v4L12 15l3.5-2.5v-4z" />
    <path d="M8.5 8.5L5 7.5M15.5 8.5L19 7.5M8.5 15.5L5 16.5M15.5 15.5L19 16.5" />
  </svg>
);

// Left Arcs component with exact 90-degree curve to the left
const LeftArcs = ({ className = "top-16" }: { className?: string }) => (
  <div className={`absolute left-0 bottom-0 ${className} w-[70px] sm:w-[130px] md:w-[220px] pointer-events-none overflow-hidden select-none`}>
    <svg viewBox="0 0 200 400" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer Purple */}
      <path d="M 100 400 L 100 100 A 100 100 0 0 0 0 0" stroke="#6d28d9" strokeWidth="24" strokeLinecap="square" />
      {/* Lime */}
      <path d="M 76 400 L 76 100 A 76 76 0 0 0 0 24" stroke="#a3e635" strokeWidth="24" strokeLinecap="square" />
      {/* Blue */}
      <path d="M 52 400 L 52 100 A 52 52 0 0 0 0 48" stroke="#3b82f6" strokeWidth="24" strokeLinecap="square" />
      {/* Orange */}
      <path d="M 28 400 L 28 100 A 28 28 0 0 0 0 72" stroke="#f97316" strokeWidth="24" strokeLinecap="square" />
      {/* Red */}
      <path d="M 4 400 L 4 100 A 4 4 0 0 0 0 96" stroke="#ef4444" strokeWidth="24" strokeLinecap="square" />
    </svg>
  </div>
);

// Right Arcs component with exact 90-degree curve to the right
const RightArcs = ({ className = "top-16" }: { className?: string }) => (
  <div className={`absolute right-0 bottom-0 ${className} w-[70px] sm:w-[130px] md:w-[220px] pointer-events-none overflow-hidden select-none`}>
    <svg viewBox="0 0 200 400" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer Blue */}
      <path d="M 100 400 L 100 100 A 100 100 0 0 1 200 0" stroke="#3b82f6" strokeWidth="24" strokeLinecap="square" />
      {/* Red */}
      <path d="M 124 400 L 124 100 A 76 76 0 0 1 200 24" stroke="#ef4444" strokeWidth="24" strokeLinecap="square" />
      {/* Orange */}
      <path d="M 148 400 L 148 100 A 52 52 0 0 1 200 48" stroke="#f97316" strokeWidth="24" strokeLinecap="square" />
      {/* Lime */}
      <path d="M 172 400 L 172 100 A 28 28 0 0 1 200 72" stroke="#a3e635" strokeWidth="24" strokeLinecap="square" />
      {/* Purple */}
      <path d="M 196 400 L 196 100 A 4 4 0 0 1 200 96" stroke="#6d28d9" strokeWidth="24" strokeLinecap="square" />
    </svg>
  </div>
);

// Logo Component
const Logo = () => (
  <Link href="/" className="bg-violet-700 hover:bg-violet-800 transition-colors text-white px-4 py-2 rounded-full inline-flex items-center gap-2 font-black tracking-tighter text-sm sm:text-base border border-violet-800 shadow-sm select-none">
    <span className="text-orange-400">✦</span>
    <span>MUNDIALARIO</span>
    <span className="text-orange-400">✦</span>
  </Link>
);

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [predA, setPredA] = useState(2);
  const [predB, setPredB] = useState(1);
  const [realA, setRealA] = useState(2);
  const [realB, setRealB] = useState(1);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
    };
    checkSession();
  }, []);

  const getLinkHref = (authPath: string) => {
    if (isLoggedIn === null) return "#"; // loading
    if (!isLoggedIn) return "/login";
    return authPath;
  };

  // Score calculation logic from AGENTS.md
  const calculatePoints = (pA: number, pB: number, rA: number, rB: number) => {
    let points = 0;
    const realDiff = rA - rB;
    const predDiff = pA - pB;
    const realResult = realDiff > 0 ? "A" : realDiff < 0 ? "B" : "TIE";
    const predResult = predDiff > 0 ? "A" : predDiff < 0 ? "B" : "TIE";

    let hasTendency = false;
    let hasDiff = false;
    let hasLocalG = false;
    let hasVisitorG = false;

    // 1. Tendencia (+2 pts)
    if (realResult === predResult) {
      points += 2;
      hasTendency = true;
      // 2. Diferencia Exacta (Bonus +1 pt, solo si hay tendencia)
      if (realDiff === predDiff) {
        points += 1;
        hasDiff = true;
      }
    }
    // 3. Goles exactos por equipo (+1 pt cada uno, independiente del resultado)
    if (pA === rA) {
      points += 1;
      hasLocalG = true;
    }
    if (pB === rB) {
      points += 1;
      hasVisitorG = true;
    }

    return { points, hasTendency, hasDiff, hasLocalG, hasVisitorG };
  };

  const simResult = calculatePoints(predA, predB, realA, realB);

  return (
    <div className="flex flex-col min-h-[100dvh] bg-slate-50 text-slate-900 font-sans antialiased overflow-x-hidden pb-16 md:pb-0">
      {/* Navbar Desktop */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Logo />
          {/* Menu items for desktop */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className="bg-violet-700 text-white px-4 py-1.5 rounded-full font-bold text-sm shadow-sm transition-transform hover:scale-105"
            >
              Inicio
            </Link>
            <Link href={getLinkHref("/dashboard?tab=predictions")} className="text-slate-700 hover:text-violet-700 font-bold text-sm transition-colors">
              Jugar
            </Link>
            <Link href={getLinkHref("/dashboard?tab=ranking")} className="text-slate-700 hover:text-violet-700 font-bold text-sm transition-colors">
              Ranking
            </Link>
            <Link href={getLinkHref("/dashboard?tab=leagues")} className="text-slate-700 hover:text-violet-700 font-bold text-sm transition-colors">
              Grupos
            </Link>
            <Link href={getLinkHref("/dashboard?tab=predictions")} className="text-slate-700 hover:text-violet-700 font-bold text-sm transition-colors">
              Retos
            </Link>
            <Link href="#faq" className="text-slate-700 hover:text-violet-700 font-bold text-sm transition-colors">
              FAQ
            </Link>
          </nav>
        </div>

        {/* Auth Buttons for desktop */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="bg-violet-700 hover:bg-violet-800 text-white px-5 py-2.5 rounded-full font-extrabold text-sm shadow-sm transition-all hover:scale-105"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/register"
            className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-full font-extrabold text-sm shadow-sm transition-all hover:scale-105"
          >
            Registrarse
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setIsMenuOpen(true)}
          className="md:hidden w-10 h-10 rounded-full bg-violet-700 flex items-center justify-center text-white hover:bg-violet-800 transition-colors shadow-sm"
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* Mobile Drawer Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm md:hidden flex justify-end">
          <div className="bg-white w-4/5 max-w-sm h-full p-6 flex flex-col justify-between shadow-2xl relative animate-in slide-in-from-right duration-250">
            <div>
              <div className="flex items-center justify-between mb-8">
                <Logo />
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-800 hover:bg-slate-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <nav className="flex flex-col gap-4">
                <Link
                  href="/"
                  onClick={() => setIsMenuOpen(false)}
                  className="bg-violet-700 text-white px-4 py-2 rounded-full font-bold text-sm text-center shadow-sm"
                >
                  Inicio
                </Link>
                <Link
                  href={getLinkHref("/dashboard?tab=predictions")}
                  onClick={() => setIsMenuOpen(false)}
                  className="text-slate-800 font-bold text-base py-2 border-b border-slate-100 hover:text-violet-700 transition-colors"
                >
                  Jugar
                </Link>
                <Link
                  href={getLinkHref("/dashboard?tab=ranking")}
                  onClick={() => setIsMenuOpen(false)}
                  className="text-slate-800 font-bold text-base py-2 border-b border-slate-100 hover:text-violet-700 transition-colors"
                >
                  Ranking
                </Link>
                <Link
                  href={getLinkHref("/dashboard?tab=leagues")}
                  onClick={() => setIsMenuOpen(false)}
                  className="text-slate-800 font-bold text-base py-2 border-b border-slate-100 hover:text-violet-700 transition-colors"
                >
                  Grupos
                </Link>
                <Link
                  href={getLinkHref("/dashboard?tab=predictions")}
                  onClick={() => setIsMenuOpen(false)}
                  className="text-slate-800 font-bold text-base py-2 border-b border-slate-100 hover:text-violet-700 transition-colors"
                >
                  Retos
                </Link>
                <Link
                  href="#faq"
                  onClick={() => setIsMenuOpen(false)}
                  className="text-slate-800 font-bold text-base py-2 hover:text-violet-700 transition-colors"
                >
                  FAQ
                </Link>
              </nav>
            </div>

            <div className="flex flex-col gap-3">
              <Link
                href="/login"
                onClick={() => setIsMenuOpen(false)}
                className="w-full bg-violet-700 hover:bg-violet-800 text-white text-center py-3 rounded-full font-extrabold text-sm shadow-sm transition-transform active:scale-95"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/register"
                onClick={() => setIsMenuOpen(false)}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white text-center py-3 rounded-full font-extrabold text-sm shadow-sm transition-transform active:scale-95"
              >
                Registrarse
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative bg-slate-50 pt-12 pb-16 md:pt-20 md:pb-28 border-b border-slate-100 flex flex-col items-center overflow-hidden">
          {/* Background Image Cover (Vibrant & crisp) */}
          <div className="absolute inset-0 z-0 select-none pointer-events-none">
            <Image
              src="/mudialario.png"
              alt="Mundialario Background"
              fill
              className="object-cover opacity-20"
              priority
            />
            {/* Mesh gradients & light overlays to blend and add premium colors */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-slate-50/80 to-white/95" />
            <div className="absolute top-10 left-1/4 w-80 h-80 bg-violet-400/25 rounded-full blur-3xl" />
            <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-lime-400/25 rounded-full blur-3xl" />
            <div className="absolute top-1/2 right-10 w-72 h-72 bg-orange-400/20 rounded-full blur-3xl" />
          </div>

          {/* Colorful Side Arcs */}
          <LeftArcs />
          <RightArcs />

          {/* Sparkles and Heading Area */}
          <div className="relative px-6 max-w-3xl text-center z-10 select-none">
            {/* Sparkles of all colors */}
            <SparkleIcon className="absolute -top-6 left-2 sm:-left-6 md:-left-12 text-orange-500 w-7 h-7 sm:w-9 sm:h-9 animate-bounce" />
            <SparkleIcon className="absolute bottom-6 right-2 sm:-right-6 md:-right-12 text-violet-600 w-7 h-7 sm:w-9 sm:h-9 animate-pulse" />
            <SparkleIcon className="absolute -top-12 right-12 text-lime-500 w-6 h-6 animate-pulse" />
            <SparkleIcon className="absolute bottom-0 left-10 text-red-500 w-5 h-5 animate-bounce" />
            <SparkleIcon className="absolute top-1/2 left-0 text-blue-500 w-5 h-5 animate-pulse" />

            <h1 className="font-black text-slate-900 text-3xl sm:text-5xl md:text-6xl tracking-tight leading-none uppercase">
              EL JUEGO <br className="hidden sm:inline" />
              DEFINITIVO <br />
              DEL MUNDIAL
            </h1>
            <p className="text-slate-600 font-semibold text-sm sm:text-base md:text-lg max-w-xl mx-auto mt-4 sm:mt-6 leading-relaxed">
              Compite con tus amigos, suma puntos, completa retos y conviértete en la leyenda del Mundial.
            </p>
            {/* CTAs */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 justify-center mt-8 max-w-sm sm:max-w-none mx-auto">
              <Link
                href="/register"
                className="bg-violet-700 hover:bg-violet-800 text-white px-6 py-3.5 rounded-full font-extrabold text-xs sm:text-sm md:text-base shadow-md transition-all hover:scale-105 hover:shadow-lg text-center whitespace-nowrap"
              >
                Crear mi cuenta
              </Link>
              <Link
                href="#como-se-juega"
                className="bg-white border-2 border-violet-700 hover:bg-violet-50 text-violet-700 px-6 py-3.5 rounded-full font-extrabold text-xs sm:text-sm md:text-base shadow-md transition-all hover:scale-105 hover:shadow-lg text-center whitespace-nowrap"
              >
                ¿Cómo se juega?
              </Link>
              <Link
                href={getLinkHref("/dashboard?tab=leagues")}
                className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3.5 rounded-full font-extrabold text-xs sm:text-sm md:text-base shadow-md transition-all hover:scale-105 hover:shadow-lg text-center whitespace-nowrap"
              >
                Ingresar a una liga compartida
              </Link>
              <Link
                href="/login"
                className="bg-lime-400 hover:bg-lime-500 text-violet-950 px-6 py-3.5 rounded-full font-extrabold text-xs sm:text-sm md:text-base shadow-md transition-all hover:scale-105 hover:shadow-lg text-center whitespace-nowrap"
              >
                Iniciar sesión
              </Link>
            </div>

            {/* Trophy Pill / Banner */}
            <div className="inline-flex items-center gap-3 bg-violet-100/60 border border-violet-200/50 rounded-full px-5 py-2.5 mt-8 sm:mt-10 max-w-xs sm:max-w-md mx-auto shadow-sm">
              <FifaTrophyIcon className="w-7 h-7 flex-shrink-0 animate-pulse" />
              <p className="text-slate-700 font-extrabold text-xs sm:text-sm text-left leading-tight">
                ¡Demuestra que sabes más de fútbol que nadie!
              </p>
            </div>

            {/* Showcase Banner Image */}
            <div className="mt-8 sm:mt-12 max-w-md sm:max-w-lg md:max-w-2xl mx-auto rounded-3xl overflow-hidden border-4 border-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] relative group">
              <Image
                src="/mudialario.png"
                alt="Mundialario Banner"
                width={800}
                height={533}
                className="w-full h-auto object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          </div>
        </section>

        {/* NEW EXPLANATION SECTION: DAILY PREDICTION SYSTEM */}
        <section id="como-se-juega" className="bg-slate-50 border-b border-slate-100 py-12 md:py-20 select-none scroll-mt-20 relative overflow-hidden">
          <div className="max-w-5xl mx-auto px-4 relative z-10">
            <div className="text-center mb-12 relative">
              {/* Sparkles of all colors */}
              <SparkleIcon className="absolute -top-4 left-10 text-red-500 w-6 h-6 animate-bounce" />
              <SparkleIcon className="absolute bottom-0 right-10 text-lime-500 w-6 h-6 animate-pulse" />
              <SparkleIcon className="absolute top-1/2 left-1/3 text-orange-500 w-4 h-4 animate-pulse" />
              <SparkleIcon className="absolute bottom-4 left-1/4 text-blue-500 w-4 h-4 animate-bounce" />

              <span className="text-xs font-black tracking-widest text-violet-700 uppercase bg-violet-100 px-3 py-1 rounded-full">
                ¿Qué es Mundialario?
              </span>
              <h2 className="font-black text-slate-900 text-2xl sm:text-3xl md:text-4xl tracking-tight uppercase mt-3">
                📅 SISTEMA DE PREDICCIONES DIARIAS
              </h2>
              <p className="text-slate-600 font-semibold text-xs sm:text-sm mt-2 max-w-xl mx-auto">
                El Mundial es dinámico y nuestro sistema también. Olvídate de pronosticar todo el torneo a ciegas.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Feature 1: Predicciones Dinámicas */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 flex flex-col gap-4">
                <div className="bg-violet-50 w-12 h-12 rounded-2xl text-violet-700 flex items-center justify-center flex-shrink-0">
                  <CalendarRange className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-slate-900 font-black text-base sm:text-lg tracking-tight uppercase">
                    Predicciones Diarias
                  </h3>
                  <p className="text-slate-600 text-xs sm:text-sm mt-2 font-medium leading-relaxed">
                    Los partidos se habilitan día a día. Puedes enviar y ajustar tus marcadores basándote en la forma real de los equipos a lo largo de la competencia.
                  </p>
                </div>
              </div>

              {/* Feature 2: Bloqueo Estricto */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 flex flex-col gap-4">
                <div className="bg-orange-50 w-12 h-12 rounded-2xl text-orange-600 flex items-center justify-center flex-shrink-0">
                  <Timer className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-slate-900 font-black text-base sm:text-lg tracking-tight uppercase">
                    Corte y Modificaciones
                  </h3>
                  <p className="text-slate-600 text-xs sm:text-sm mt-2 font-medium leading-relaxed">
                    Las predicciones se cierran al inicio (kickoff) de cada partido. Se permite editar tus marcadores antes del pitazo (costo de 3 pts). Si el partido comienza y no registraste tu pronóstico, se te restará 1 punto (-1 pt) al calcular los resultados.
                  </p>
                </div>
              </div>

              {/* Feature 3: Puntuación Sumativa */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 flex flex-col gap-4">
                <div className="bg-lime-50 w-12 h-12 rounded-2xl text-lime-700 flex items-center justify-center flex-shrink-0">
                  <Calculator className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-slate-900 font-black text-base sm:text-lg tracking-tight uppercase">
                    Cálculo Acumulativo
                  </h3>
                  <p className="text-slate-600 text-xs sm:text-sm mt-2 font-medium leading-relaxed">
                    Consigue hasta 5 puntos por encuentro: +2 por acertar tendencia, +1 de bonus por diferencia exacta de goles, y +1 por cada gol exacto de cada equipo.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES GRID SECTION */}
        <section className="max-w-6xl mx-auto px-4 py-12 md:py-20 select-none">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {/* Card 1: Juega */}
            <div className="bg-[#f5f3ff] border border-violet-100 rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex items-start gap-3 sm:gap-4 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
              <div className="bg-violet-200/60 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl text-violet-700 flex items-center justify-center flex-shrink-0">
                <Gamepad2 className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-violet-900 font-extrabold text-sm sm:text-base leading-tight">Juega</h3>
                <p className="text-violet-950/70 text-[10px] sm:text-xs mt-1 leading-normal font-semibold">
                  Trivia, predicciones, desafíos y mucho más.
                </p>
              </div>
            </div>

            {/* Card 2: Compite */}
            <div className="bg-[#f7fee7] border border-lime-100 rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex items-start gap-3 sm:gap-4 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
              <div className="bg-lime-200/60 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl text-lime-700 flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-lime-900 font-extrabold text-sm sm:text-base leading-tight">Compite</h3>
                <p className="text-lime-950/70 text-[10px] sm:text-xs mt-1 leading-normal font-semibold">
                  Crea ligas con tus amigos y sube en el ranking.
                </p>
              </div>
            </div>

            {/* Card 3: Sigue todo */}
            <div className="bg-[#eff6ff] border border-blue-100 rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex items-start gap-3 sm:gap-4 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
              <div className="bg-blue-200/60 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl text-blue-700 flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-blue-900 font-extrabold text-sm sm:text-base leading-tight">Sigue todo</h3>
                <p className="text-blue-950/70 text-[10px] sm:text-xs mt-1 leading-normal font-semibold">
                  Resultados de las jornadas y totales de puntos.
                </p>
              </div>
            </div>

            {/* Card 4: Comparte */}
            <div className="bg-[#fff1f2] border border-rose-100 rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex items-start gap-3 sm:gap-4 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
              <div className="bg-rose-200/60 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl text-rose-700 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-rose-900 font-extrabold text-sm sm:text-base leading-tight">Comparte</h3>
                <p className="text-rose-950/70 text-[10px] sm:text-xs mt-1 leading-normal font-semibold">
                  Reacciona, comenta y presume tus conocimientos.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS SECTION */}
        <section className="bg-white border-t border-slate-100 py-12 md:py-20 select-none relative overflow-hidden">
          {/* Left Arc only (alternating) */}
          <LeftArcs className="top-0 opacity-40" />

          <div className="max-w-6xl mx-auto px-4 text-center relative z-10">
            <div className="relative inline-block mb-10 sm:mb-16">
              {/* Sparkles of all colors */}
              <SparkleIcon className="absolute -left-6 top-1 text-violet-600 w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
              <SparkleIcon className="absolute -right-6 top-1 text-orange-500 w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
              <SparkleIcon className="absolute -top-8 left-1/2 -translate-x-1/2 text-lime-500 w-4 h-4 animate-bounce" />
              <SparkleIcon className="absolute -bottom-8 left-10 text-red-500 w-4 h-4 animate-pulse" />
              <SparkleIcon className="absolute top-1/2 right-10 text-blue-500 w-4 h-4 animate-bounce" />

              <h2 className="font-black text-amber-950 text-2xl sm:text-3xl md:text-4xl tracking-tight uppercase px-4">
                ¿CÓMO FUNCIONA?
              </h2>
            </div>

            <div className="grid grid-cols-4 gap-2 sm:gap-6 relative">
              {/* Step 1 */}
              <div className="flex flex-col items-center">
                <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-violet-700 text-white font-extrabold flex items-center justify-center text-sm sm:text-base z-10">
                  1
                  <div className="absolute top-1/2 left-[100%] right-[-100%] border-t-2 border-dotted border-slate-200 -z-10" />
                </div>
                <div className="mt-4 bg-violet-50 p-3 sm:p-4 rounded-full text-violet-700 mb-3 sm:mb-4">
                  <UserPlus className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <h3 className="text-amber-950 font-black text-[10px] sm:text-sm uppercase tracking-wide">Regístrate</h3>
                <p className="text-amber-950/60 text-[8px] sm:text-xs mt-1 font-semibold max-w-[90px] sm:max-w-[160px] leading-tight">
                  Crea tu cuenta gratis en segundos.
                </p>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center">
                <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-lime-500 text-white font-extrabold flex items-center justify-center text-sm sm:text-base z-10">
                  2
                  <div className="absolute top-1/2 left-[100%] right-[-100%] border-t-2 border-dotted border-slate-200 -z-10" />
                </div>
                <div className="mt-4 bg-lime-50 p-3 sm:p-4 rounded-full text-lime-600 mb-3 sm:mb-4">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <h3 className="text-amber-950 font-black text-[10px] sm:text-sm uppercase tracking-wide">Únete o crea</h3>
                <p className="text-amber-950/60 text-[8px] sm:text-xs mt-1 font-semibold max-w-[90px] sm:max-w-[160px] leading-tight">
                  Únete a una liga con su código o crea la tuya con amigos.
                </p>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center">
                <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-orange-500 text-white font-extrabold flex items-center justify-center text-sm sm:text-base z-10">
                  3
                  <div className="absolute top-1/2 left-[100%] right-[-100%] border-t-2 border-dotted border-slate-200 -z-10" />
                </div>
                <div className="mt-4 bg-orange-50 p-3 sm:p-4 rounded-full text-orange-600 mb-3 sm:mb-4">
                  <SoccerBallIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <h3 className="text-amber-950 font-black text-[10px] sm:text-sm uppercase tracking-wide">Juega y suma</h3>
                <p className="text-amber-950/60 text-[8px] sm:text-xs mt-1 font-semibold max-w-[90px] sm:max-w-[160px] leading-tight">
                  Responde, predice y completa retos para ganar puntos.
                </p>
              </div>

              {/* Step 4 */}
              <div className="flex flex-col items-center">
                <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-600 text-white font-extrabold flex items-center justify-center text-sm sm:text-base z-10">
                  4
                </div>
                <div className="mt-4 bg-blue-50 p-3 sm:p-4 rounded-full text-blue-700 mb-3 sm:mb-4">
                  <Trophy className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <h3 className="text-amber-950 font-black text-[10px] sm:text-sm uppercase tracking-wide">Lidera el Ranking</h3>
                <p className="text-amber-950/60 text-[8px] sm:text-xs mt-1 font-semibold max-w-[90px] sm:max-w-[160px] leading-tight">
                  Queda de primero en la tabla de clasificación de tu liga y demuestra quién es el mejor.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECCIÓN INTERACTIVA: SIMULADOR DE PUNTOS */}
        <section className="bg-slate-50 py-12 md:py-20 border-b border-slate-100 select-none relative overflow-hidden">
          {/* Right Arc only (alternating) */}
          <RightArcs className="top-0 opacity-40" />

          <div className="max-w-4xl mx-auto px-4 relative z-10">
            <div className="text-center mb-10">
              <span className="text-xs font-black tracking-widest text-violet-700 uppercase bg-violet-100 px-3 py-1 rounded-full">
                Matemática del Juego
              </span>
              <h2 className="font-black text-amber-950 text-2xl sm:text-3xl md:text-4xl tracking-tight uppercase mt-3">
                🧮 SIMULADOR DE PUNTOS
              </h2>
              <p className="text-amber-950/60 font-semibold text-xs sm:text-sm mt-2 max-w-md mx-auto">
                Experimenta con los marcadores y descubre cómo se calculan los puntos en tiempo real.
              </p>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden p-6 sm:p-8 grid md:grid-cols-2 gap-8 items-center">
              {/* Inputs Panel */}
              <div className="flex flex-col gap-6">
                {/* Tu Pronóstico */}
                <div className="bg-[#f5f3ff] border border-violet-100/60 rounded-2xl p-4 sm:p-5">
                  <h3 className="text-violet-950 font-extrabold text-sm uppercase tracking-wider mb-4 text-center">
                    🔮 Tu Predicción
                  </h3>
                  <div className="flex items-center justify-around">
                    {/* Team A Pred */}
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-xs font-bold text-amber-950/80">Local</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPredA(Math.max(0, predA - 1))}
                          className="w-8 h-8 rounded-full bg-white border border-violet-200 text-violet-700 flex items-center justify-center hover:bg-violet-50 transition-colors shadow-sm active:scale-95"
                        >
                          <Minus className="w-4 h-4 stroke-[3]" />
                        </button>
                        <span className="text-3xl font-black w-8 text-center text-violet-950">{predA}</span>
                        <button
                          onClick={() => setPredA(predA + 1)}
                          className="w-8 h-8 rounded-full bg-white border border-violet-200 text-violet-700 flex items-center justify-center hover:bg-violet-50 transition-colors shadow-sm active:scale-95"
                        >
                          <Plus className="w-4 h-4 stroke-[3]" />
                        </button>
                      </div>
                    </div>
                    <span className="text-2xl font-black text-violet-300">-</span>
                    {/* Team B Pred */}
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-xs font-bold text-amber-950/80">Visita</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPredB(Math.max(0, predB - 1))}
                          className="w-8 h-8 rounded-full bg-white border border-violet-200 text-violet-700 flex items-center justify-center hover:bg-violet-50 transition-colors shadow-sm active:scale-95"
                        >
                          <Minus className="w-4 h-4 stroke-[3]" />
                        </button>
                        <span className="text-3xl font-black w-8 text-center text-violet-950">{predB}</span>
                        <button
                          onClick={() => setPredB(predB + 1)}
                          className="w-8 h-8 rounded-full bg-white border border-violet-200 text-violet-700 flex items-center justify-center hover:bg-violet-50 transition-colors shadow-sm active:scale-95"
                        >
                          <Plus className="w-4 h-4 stroke-[3]" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Resultado Real */}
                <div className="bg-[#f7fee7] border border-lime-100/60 rounded-2xl p-4 sm:p-5">
                  <h3 className="text-lime-950 font-extrabold text-sm uppercase tracking-wider mb-4 text-center">
                    ⚽ Resultado Real
                  </h3>
                  <div className="flex items-center justify-around">
                    {/* Team A Real */}
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-xs font-bold text-amber-950/80">Local</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setRealA(Math.max(0, realA - 1))}
                          className="w-8 h-8 rounded-full bg-white border border-lime-200 text-lime-700 flex items-center justify-center hover:bg-lime-50 transition-colors shadow-sm active:scale-95"
                        >
                          <Minus className="w-4 h-4 stroke-[3]" />
                        </button>
                        <span className="text-3xl font-black w-8 text-center text-lime-950">{realA}</span>
                        <button
                          onClick={() => setRealA(realA + 1)}
                          className="w-8 h-8 rounded-full bg-white border border-lime-200 text-lime-700 flex items-center justify-center hover:bg-lime-50 transition-colors shadow-sm active:scale-95"
                        >
                          <Plus className="w-4 h-4 stroke-[3]" />
                        </button>
                      </div>
                    </div>
                    <span className="text-2xl font-black text-lime-300">-</span>
                    {/* Team B Real */}
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-xs font-bold text-amber-950/80">Visita</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setRealB(Math.max(0, realB - 1))}
                          className="w-8 h-8 rounded-full bg-white border border-lime-200 text-lime-700 flex items-center justify-center hover:bg-lime-50 transition-colors shadow-sm active:scale-95"
                        >
                          <Minus className="w-4 h-4 stroke-[3]" />
                        </button>
                        <span className="text-3xl font-black w-8 text-center text-lime-950">{realB}</span>
                        <button
                          onClick={() => setRealB(realB + 1)}
                          className="w-8 h-8 rounded-full bg-white border border-lime-200 text-lime-700 flex items-center justify-center hover:bg-lime-50 transition-colors shadow-sm active:scale-95"
                        >
                          <Plus className="w-4 h-4 stroke-[3]" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Points Result Panel */}
              <div className="flex flex-col items-center justify-center bg-slate-50 border border-slate-100 rounded-3xl p-6 h-full min-h-[260px] text-center">
                <span className="text-xs font-black tracking-widest text-amber-950/60 uppercase">
                  Puntos Obtenidos
                </span>
                <div className="relative mt-4 mb-4 select-none">
                  <span className="text-6xl sm:text-7xl font-black text-violet-700">{simResult.points}</span>
                  <span className="text-lg font-bold text-amber-950/70 ml-1">/ 5 pts</span>
                </div>

                {/* Score Breakdown List */}
                <div className="w-full space-y-2 text-left mt-2">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    {simResult.hasTendency ? (
                      <CheckCircle2 className="w-4.5 h-4.5 text-lime-500 fill-lime-50" />
                    ) : (
                      <XCircle className="w-4.5 h-4.5 text-red-400 fill-red-50" />
                    )}
                    <span className={simResult.hasTendency ? "text-slate-800" : "text-slate-400 line-through"}>
                      Acertar Tendencia: <strong className="text-lime-600 font-extrabold">+2 Pts</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-bold">
                    {simResult.hasDiff ? (
                      <CheckCircle2 className="w-4.5 h-4.5 text-lime-500 fill-lime-50" />
                    ) : (
                      <XCircle className="w-4.5 h-4.5 text-red-400 fill-red-50" />
                    )}
                    <span className={simResult.hasDiff ? "text-slate-800" : "text-slate-400 line-through"}>
                      Diferencia de Goles Exacta: <strong className="text-lime-600 font-extrabold">+1 Pt</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-bold">
                    {simResult.hasLocalG ? (
                      <CheckCircle2 className="w-4.5 h-4.5 text-lime-500 fill-lime-50" />
                    ) : (
                      <XCircle className="w-4.5 h-4.5 text-red-400 fill-red-50" />
                    )}
                    <span className={simResult.hasLocalG ? "text-slate-800" : "text-slate-400 line-through"}>
                      Goles del Equipo Local Exactos: <strong className="text-lime-600 font-extrabold">+1 Pt</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-bold">
                    {simResult.hasVisitorG ? (
                      <CheckCircle2 className="w-4.5 h-4.5 text-lime-500 fill-lime-50" />
                    ) : (
                      <XCircle className="w-4.5 h-4.5 text-red-400 fill-red-50" />
                    )}
                    <span className={simResult.hasVisitorG ? "text-slate-800" : "text-slate-400 line-through"}>
                      Goles del Equipo Visitante Exactos: <strong className="text-lime-600 font-extrabold">+1 Pt</strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECCIÓN INTERACTIVA: CLASIFICACIÓN MOCK */}
        <section className="bg-white py-12 md:py-20 border-b border-slate-100 select-none relative overflow-hidden">
          <div className="max-w-4xl mx-auto px-4 relative z-10">
            <div className="text-center mb-10 relative">
              {/* Sparkles of all colors */}
              <SparkleIcon className="absolute -top-4 left-10 text-orange-500 w-5 h-5 animate-pulse" />
              <SparkleIcon className="absolute bottom-0 right-10 text-lime-500 w-5 h-5 animate-bounce" />
              <SparkleIcon className="absolute top-1/2 left-1/3 text-violet-600 w-4 h-4 animate-pulse" />
              <SparkleIcon className="absolute bottom-2 left-1/4 text-blue-500 w-4 h-4 animate-bounce" />

              <span className="text-xs font-black tracking-widest text-lime-600 uppercase bg-lime-100 px-3 py-1 rounded-full">
                Ligas Privadas
              </span>
              <h2 className="font-black text-amber-950 text-2xl sm:text-3xl md:text-4xl tracking-tight uppercase mt-3">
                🏆 CLASIFICACIÓN EN TIEMPO REAL
              </h2>
              <p className="text-amber-950/60 font-semibold text-xs sm:text-sm mt-2 max-w-md mx-auto">
                Compite y domina la tabla general de tu grupo de amigos.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-3xl shadow-lg overflow-hidden">
              {/* Header de la liga */}
              <div className="bg-violet-700 text-white px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-violet-800 gap-2">
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base tracking-wide uppercase text-lime-400">
                    ⚡ LIGA AMIGOS DE BREINAKOSLAB
                  </h3>
                  <p className="text-xs text-white/70 font-semibold">Código: LGA-BRKLAB</p>
                </div>
                <span className="text-xs font-extrabold bg-white/10 px-3 py-1 rounded-full uppercase tracking-wider">
                  Jornada 4 de 7
                </span>
              </div>

              {/* Tabla */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-amber-950/50 uppercase font-black text-[10px] sm:text-xs tracking-wider bg-slate-100/50">
                      <th className="py-3 px-6 text-center w-16">Pos</th>
                      <th className="py-3 px-4">Usuario</th>
                      <th className="py-3 px-4 text-center">Predicciones</th>
                      <th className="py-3 px-4 text-center">Efectividad</th>
                      <th className="py-3 px-6 text-right w-24">Puntos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                    <tr className="hover:bg-slate-100/30 transition-colors">
                      <td className="py-3 px-6 text-center font-black text-violet-700 bg-violet-50/50">🥇 1</td>
                      <td className="py-3 px-4 font-extrabold text-amber-950">
                        Jose
                        <span className="block text-[9px] text-amber-950/40 uppercase font-semibold">USR-9F8A1B</span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-600">24 / 24</td>
                      <td className="py-3 px-4 text-center">
                        <span className="bg-lime-100 text-lime-800 font-extrabold px-2 py-0.5 rounded-full text-[10px]">
                          85% Acc
                        </span>
                      </td>
                      <td className="py-3 px-6 text-right font-black text-violet-700 text-base">42</td>
                    </tr>
                    <tr className="hover:bg-slate-100/30 transition-colors">
                      <td className="py-3 px-6 text-center font-black text-lime-600">🥈 2</td>
                      <td className="py-3 px-4 font-extrabold text-amber-950">
                        Ignacio
                        <span className="block text-[9px] text-amber-950/40 uppercase font-semibold">USR-4A7B2C</span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-600">24 / 24</td>
                      <td className="py-3 px-4 text-center">
                        <span className="bg-lime-100 text-lime-800 font-extrabold px-2 py-0.5 rounded-full text-[10px]">
                          78% Acc
                        </span>
                      </td>
                      <td className="py-3 px-6 text-right font-black text-lime-600 text-base">39</td>
                    </tr>
                    <tr className="hover:bg-slate-100/30 transition-colors">
                      <td className="py-3 px-6 text-center font-black text-orange-500">🥉 3</td>
                      <td className="py-3 px-4 font-extrabold text-amber-950">
                        Breinak
                        <span className="block text-[9px] text-amber-950/40 uppercase font-semibold">USR-7K2D8X</span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-600">22 / 24</td>
                      <td className="py-3 px-4 text-center">
                        <span className="bg-orange-100 text-orange-800 font-extrabold px-2 py-0.5 rounded-full text-[10px]">
                          70% Acc
                        </span>
                      </td>
                      <td className="py-3 px-6 text-right font-black text-orange-500 text-base">35</td>
                    </tr>
                    <tr className="hover:bg-slate-100/30 transition-colors">
                      <td className="py-3 px-6 text-center font-black text-slate-400">4</td>
                      <td className="py-3 px-4 font-extrabold text-amber-950">
                        Santi
                        <span className="block text-[9px] text-amber-950/40 uppercase font-semibold">USR-1M5N2P</span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-600">24 / 24</td>
                      <td className="py-3 px-4 text-center">
                        <span className="bg-slate-200 text-slate-800 font-extrabold px-2 py-0.5 rounded-full text-[10px]">
                          60% Acc
                        </span>
                      </td>
                      <td className="py-3 px-6 text-right font-black text-slate-500 text-base">28</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* SECCIÓN FAQ (ACORDEÓN) */}
        <section id="faq" className="bg-slate-50 py-12 md:py-20 border-b border-slate-100 select-none scroll-mt-20">
          <div className="max-w-3xl mx-auto px-4">
            <div className="text-center mb-12">
              <span className="text-xs font-black tracking-widest text-orange-500 uppercase bg-orange-100 px-3 py-1 rounded-full">
                Soporte y Dudas
              </span>
              <h2 className="font-black text-amber-950 text-2xl sm:text-3xl md:text-4xl tracking-tight uppercase mt-3">
                ❓ PREGUNTAS FRECUENTES
              </h2>
            </div>

            <div className="space-y-4">
              {[
                {
                  q: "¿Hasta qué hora puedo ingresar o modificar mis predicciones?",
                  a: "Tienes plazo hasta la hora del pitazo inicial (kickoff time) de cada partido. Registrar tu predicción inicial es gratuito, pero si deseas modificar un marcador antes del inicio, tiene un costo de canje de 3 puntos de penalización."
                },
                {
                  q: "¿Qué sucede si olvido ingresar mi pronóstico para un partido?",
                  a: "Si no registras tu pronóstico antes de que comience el partido y se pasa la hora límite (kickoff time), el sistema te penalizará automáticamente restando 1 punto (-1 pt) a tu puntuación acumulada al calcular los resultados del encuentro."
                },
                {
                  q: "¿Cómo funciona la puntuación acumulativa de 5 puntos?",
                  a: "Recibes 2 puntos por tendencia (acertar ganador o empate). Si aciertas tendencia, obtienes +1 punto por diferencia exacta de goles. Adicionalmente, recibes +1 punto por cada gol exacto de cada equipo (tanto para el local como el visitante), sumando un máximo de 5 puntos."
                },
                {
                  q: "¿Las ligas compartidas tienen un límite de participantes?",
                  a: "¡Ninguno! Puedes crear ligas de forma ilimitada y compartir el código de invitación con todos los amigos que quieras. La tabla de posiciones se actualiza automáticamente."
                },
                {
                  q: "¿Cómo se calculan y actualizan los puntos?",
                  a: "Los puntos se calculan automáticamente unas horas después de finalizado cada partido. El sistema procesa los marcadores reales de los encuentros del Mundial y actualiza inmediatamente las posiciones globales y las de tus ligas."
                }
              ].map((faq, index) => (
                <div
                  key={index}
                  className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow transition-shadow duration-200"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    className="w-full px-6 py-5 text-left flex items-center justify-between font-extrabold text-sm sm:text-base text-amber-950 hover:text-violet-700 transition-colors"
                  >
                    <span>{faq.q}</span>
                    {openFaq === index ? (
                      <ChevronUp className="w-5 h-5 text-violet-700 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-amber-950/60 flex-shrink-0" />
                    )}
                  </button>
                  {openFaq === index && (
                    <div className="px-6 pb-5 text-xs sm:text-sm font-semibold text-amber-950/70 leading-relaxed border-t border-slate-50 pt-3 bg-slate-50/50 animate-in fade-in duration-200">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER DE MUDIALARIO BY BREINAKOSLAB */}
      <footer className="bg-white py-12 border-t border-slate-100 select-none">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex flex-col items-center md:items-start gap-2">
            <Logo />
            <p className="text-xs font-extrabold text-amber-950/50 uppercase tracking-widest text-center md:text-left">
              Mundialario By <span className="text-violet-700 hover:text-violet-800 transition-colors cursor-pointer font-black">BreinakosLab</span>
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-xs sm:text-sm font-bold text-amber-950/70">
            <Link href="/" className="hover:text-violet-700 transition-colors">Inicio</Link>
            <Link href="/predictions" className="hover:text-violet-700 transition-colors">Jugar</Link>
            <Link href="/ranking" className="hover:text-violet-700 transition-colors">Ranking</Link>
            <Link href="/leagues" className="hover:text-violet-700 transition-colors">Grupos</Link>
          </div>

          <div className="text-center md:text-right">
            <p className="text-xs font-semibold text-amber-950/50">
              © 2026 Mundialario. Todos los derechos reservados.
            </p>
            <p className="text-[10px] font-bold text-amber-950/40 mt-1 uppercase tracking-wider">
              Creado por el equipo de BreinakosLab 🧠🚀
            </p>
          </div>
        </div>
      </footer>

      {/* Decorative Bottom Color Stripe */}
      <div className="flex h-3 w-full overflow-hidden select-none">
        <div className="bg-[#6d28d9] flex-1" />
        <div className="bg-[#a3e635] flex-1" />
        <div className="bg-[#f97316] flex-1" />
        <div className="bg-[#3b82f6] flex-1" />
        <div className="bg-[#ef4444] flex-1" />
        <div className="bg-[#a3e635] flex-1" />
        <div className="bg-[#6d28d9] flex-1" />
      </div>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 w-full bg-white/95 backdrop-blur-sm border-t border-slate-100 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] py-2.5 px-6 flex justify-between items-center md:hidden select-none">
        <Link href="/" className="flex flex-col items-center gap-1 group">
          <Home className="w-5 h-5 text-violet-700" />
          <span className="text-[10px] font-extrabold text-violet-700 uppercase tracking-wider">Inicio</span>
        </Link>
        <Link href={getLinkHref("/dashboard?tab=predictions")} className="flex flex-col items-center gap-1 group">
          <SoccerBallIcon className="w-5 h-5 text-lime-500 hover:text-lime-600 transition-colors" />
          <span className="text-[10px] font-extrabold text-lime-500 uppercase tracking-wider">Jugar</span>
        </Link>
        <Link href={getLinkHref("/dashboard?tab=ranking")} className="flex flex-col items-center gap-1 group">
          <Trophy className="w-5 h-5 text-orange-500 hover:text-orange-600 transition-colors" />
          <span className="text-[10px] font-extrabold text-orange-500 uppercase tracking-wider">Ranking</span>
        </Link>
        <Link href={getLinkHref("/dashboard?tab=leagues")} className="flex flex-col items-center gap-1 group">
          <Users className="w-5 h-5 text-blue-600 hover:text-blue-700 transition-colors" />
          <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider">Grupos</span>
        </Link>
      </div>
    </div>
  );
}
