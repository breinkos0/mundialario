"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import {
  createMatch,
  updateMatchScore,
  calculateMatchPointsAction,
  getCountries,
  saveCountry,
  editMatchDetails
} from "@/app/actions/admin";
import {
  Gamepad2,
  Users,
  Trophy,
  HelpCircle,
  LogOut,
  ArrowLeft,
  Calendar,
  Lock,
  CheckCircle,
  AlertCircle,
  Plus,
  Save,
  Loader2,
  Clock,
  Sparkles,
  Users2,
  Pencil,
  X
} from "lucide-react";

type UserProfile = {
  id: string;
  name: string;
  email: string;
  created_at: string;
  is_admin?: boolean;
};

type Match = {
  id: string;
  match_date: string;
  kickoff_time: string;
  team_a: string;
  team_b: string;
  score_a: number | null;
  score_b: number | null;
  is_calculated: boolean;
};

export default function AdminPage() {
  const router = useRouter();
  const supabase = createClient();

  // Authentication & Profile states
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Matches list
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(true);

  // New Match Form states
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [matchTime, setMatchTime] = useState("");
  const [isCreatingMatch, setIsCreatingMatch] = useState(false);

  // Countries states
  const [countries, setCountries] = useState<any[]>([]);
  const [isLoadingCountries, setIsLoadingCountries] = useState(false);
  const [newCountryName, setNewCountryName] = useState("");
  const [newCountryFlag, setNewCountryFlag] = useState("");
  const [isSavingCountry, setIsSavingCountry] = useState(false);
  const [countryFormError, setCountryFormError] = useState("");
  const [countryFormSuccess, setCountryFormSuccess] = useState("");

  // Autocomplete states
  const [teamASuggestions, setTeamASuggestions] = useState<any[]>([]);
  const [showTeamASuggestions, setShowTeamASuggestions] = useState(false);
  const [teamBSuggestions, setTeamBSuggestions] = useState<any[]>([]);
  const [showTeamBSuggestions, setShowTeamBSuggestions] = useState(false);

  // Score editing inputs state
  // Stores { [matchId]: { scoreA: string, scoreB: string } }
  const [scoresInput, setScoresInput] = useState<Record<string, { scoreA: string; scoreB: string }>>({});

  // Feedback states
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Action status (loading tracker for specific match IDs)
  // Stores "save-{matchId}" or "calc-{matchId}"
  const [activeActionId, setActiveActionId] = useState<string | null>(null);

  // Edit Match Modal states
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [editTeamA, setEditTeamA] = useState("");
  const [editTeamB, setEditTeamB] = useState("");
  const [editMatchDate, setEditMatchDate] = useState("");
  const [editMatchTime, setEditMatchTime] = useState("");
  const [editScoreA, setEditScoreA] = useState("");
  const [editScoreB, setEditScoreB] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editFormError, setEditFormError] = useState("");

  const [editTeamASuggestions, setEditTeamASuggestions] = useState<any[]>([]);
  const [showEditTeamASuggestions, setShowEditTeamASuggestions] = useState(false);
  const [editTeamBSuggestions, setEditTeamBSuggestions] = useState<any[]>([]);
  const [showEditTeamBSuggestions, setShowEditTeamBSuggestions] = useState(false);

  useEffect(() => {
    fetchProfileAndVerifyAdmin();
  }, []);

  const fetchProfileAndVerifyAdmin = async () => {
    setIsLoadingProfile(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      const { data: userProfile, error } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", session.user.id)
        .single();

      if (error || !userProfile) {
        console.error("Error retrieving user profile", error);
        setIsAdmin(false);
        return;
      }

      setProfile(userProfile as UserProfile);
      if (userProfile.is_admin) {
        setIsAdmin(true);
        fetchMatches();
        fetchCountries();
      } else {
        setIsAdmin(false);
      }
    } catch (err) {
      console.error(err);
      setIsAdmin(false);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const fetchCountries = async () => {
    setIsLoadingCountries(true);
    try {
      const res = await getCountries();
      if (res.success && res.countries) {
        setCountries(res.countries);
      } else if (res.error) {
        console.error(res.error);
      }
    } catch (err) {
      console.error("Countries retrieve error", err);
    } finally {
      setIsLoadingCountries(false);
    }
  };

  const fetchMatches = async () => {
    setIsLoadingMatches(true);
    try {
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .order("kickoff_time", { ascending: true });

      if (error) {
        console.error("Error retrieving matches", error);
        return;
      }

      if (data) {
        const matchesList = data as Match[];
        setMatches(matchesList);

        // Initialize score inputs with existing scores
        const inputs: Record<string, { scoreA: string; scoreB: string }> = {};
        matchesList.forEach(m => {
          inputs[m.id] = {
            scoreA: m.score_a !== null ? m.score_a.toString() : "",
            scoreB: m.score_b !== null ? m.score_b.toString() : ""
          };
        });
        setScoresInput(inputs);
      }
    } catch (err) {
      console.error("Matches retrieve error", err);
    } finally {
      setIsLoadingMatches(false);
    }
  };

  const handleTeamAChange = (val: string) => {
    setTeamA(val);
    if (!val.trim()) {
      setTeamASuggestions([]);
      setShowTeamASuggestions(false);
      return;
    }
    const filtered = countries.filter(c =>
      c.name.toLowerCase().includes(val.toLowerCase())
    );
    setTeamASuggestions(filtered);
    setShowTeamASuggestions(true);
  };

  const handleTeamBChange = (val: string) => {
    setTeamB(val);
    if (!val.trim()) {
      setTeamBSuggestions([]);
      setShowTeamBSuggestions(false);
      return;
    }
    const filtered = countries.filter(c =>
      c.name.toLowerCase().includes(val.toLowerCase())
    );
    setTeamBSuggestions(filtered);
    setShowTeamBSuggestions(true);
  };

  const handleSelectTeamA = (name: string) => {
    setTeamA(name);
    setTeamASuggestions([]);
    setShowTeamASuggestions(false);
  };

  const handleSelectTeamB = (name: string) => {
    setTeamB(name);
    setTeamBSuggestions([]);
    setShowTeamBSuggestions(false);
  };

  const handleCreateMatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!teamA.trim() || !teamB.trim() || !matchDate || !matchTime) {
      setFormError("Todos los campos del formulario son obligatorios.");
      return;
    }

    if (teamA.trim() === teamB.trim()) {
      setFormError("El equipo local no puede ser igual al visitante.");
      return;
    }

    setIsCreatingMatch(true);

    try {
      // Combine date and time to create local timestamp and convert to ISO string
      const combinedDateTime = new Date(`${matchDate}T${matchTime}`);
      if (isNaN(combinedDateTime.getTime())) {
        setFormError("Fecha u hora inválida.");
        setIsCreatingMatch(false);
        return;
      }

      const kickoffTimeISO = combinedDateTime.toISOString();

      const res = await createMatch(matchDate, kickoffTimeISO, teamA, teamB);

      if (res.error) {
        setFormError(res.error);
      } else {
        setFormSuccess(`¡Partido "${teamA} vs ${teamB}" creado exitosamente!`);
        setTeamA("");
        setTeamB("");
        setMatchDate("");
        setMatchTime("");
        fetchMatches(); // Reload matches
        fetchCountries(); // Reload countries if any new ones were auto-created
      }
    } catch (err) {
      setFormError("Error inesperado al intentar guardar el partido.");
    } finally {
      setIsCreatingMatch(false);
    }
  };

  const handleSaveCountrySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCountryFormError("");
    setCountryFormSuccess("");

    if (!newCountryName.trim()) {
      setCountryFormError("El nombre del país es obligatorio.");
      return;
    }

    setIsSavingCountry(true);

    try {
      const res = await saveCountry(newCountryName, newCountryFlag);
      if (res.error) {
        setCountryFormError(res.error);
      } else {
        setCountryFormSuccess(`¡País "${newCountryName}" guardado correctamente!`);
        setNewCountryName("");
        setNewCountryFlag("");
        fetchCountries(); // Refresh countries list
      }
    } catch (err) {
      setCountryFormError("Error inesperado al intentar guardar el país.");
    } finally {
      setIsSavingCountry(false);
    }
  };

  const handleEditCountry = (name: string, flagUrl: string) => {
    setNewCountryName(name);
    setNewCountryFlag(flagUrl || "");
  };

  const getFlagUrl = (name: string) => {
    const found = countries.find(c => c.name.toLowerCase() === name.toLowerCase());
    return found ? found.flag_url : null;
  };

  const renderFlagCircle = (name: string, sizeClass = "w-6 h-6 text-[10px]") => {
    const flagUrl = getFlagUrl(name);
    if (flagUrl) {
      return (
        <img
          src={flagUrl}
          alt={name}
          className={`${sizeClass} rounded-full object-cover border border-slate-200 shrink-0 shadow-sm`}
        />
      );
    }
    return (
      <div className={`${sizeClass} rounded-full bg-slate-100 border border-slate-200 text-slate-500 font-extrabold uppercase flex items-center justify-center shrink-0 shadow-sm select-none`}>
        {name.substring(0, 2)}
      </div>
    );
  };

  const handleScoreInputChange = (matchId: string, team: "a" | "b", val: string) => {
    // Only allow digits or empty string
    if (val !== "" && !/^\d+$/.test(val)) return;

    setScoresInput(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [team === "a" ? "scoreA" : "scoreB"]: val
      }
    }));
  };

  const handleSaveMatchScore = async (matchId: string) => {
    setActionError(null);
    setActionSuccess(null);

    const input = scoresInput[matchId];
    if (!input || input.scoreA === "" || input.scoreB === "") {
      setActionError("Debes ingresar el marcador de ambos equipos.");
      return;
    }

    const scoreA = parseInt(input.scoreA, 10);
    const scoreB = parseInt(input.scoreB, 10);

    if (isNaN(scoreA) || isNaN(scoreB) || scoreA < 0 || scoreB < 0) {
      setActionError("Los marcadores deben ser números enteros positivos.");
      return;
    }

    setActiveActionId(`save-${matchId}`);

    try {
      const res = await updateMatchScore(matchId, scoreA, scoreB);
      if (res.error) {
        setActionError(res.error);
      } else {
        setActionSuccess("Resultado guardado con éxito. Recuerda calcular los puntos.");
        fetchMatches();
      }
    } catch (err) {
      setActionError("Error al guardar el marcador.");
    } finally {
      setActiveActionId(null);
    }
  };

  const handleCalculatePoints = async (matchId: string) => {
    setActionError(null);
    setActionSuccess(null);
    setActiveActionId(`calc-${matchId}`);

    try {
      const res = await calculateMatchPointsAction(matchId);
      if (res.error) {
        setActionError(res.error);
      } else {
        setActionSuccess("¡Puntos calculados y ranking actualizado correctamente!");
        fetchMatches();
      }
    } catch (err) {
      setActionError("Error al ejecutar el cálculo de puntos.");
    } finally {
      setActiveActionId(null);
    }
  };

  const handleStartEditMatch = (match: Match) => {
    setEditingMatch(match);
    setEditTeamA(match.team_a);
    setEditTeamB(match.team_b);
    setEditMatchDate(match.match_date);
    
    const localDate = new Date(match.kickoff_time);
    const localHours = localDate.getHours().toString().padStart(2, "0");
    const localMinutes = localDate.getMinutes().toString().padStart(2, "0");
    setEditMatchTime(`${localHours}:${localMinutes}`);
    
    setEditScoreA(match.score_a !== null ? match.score_a.toString() : "");
    setEditScoreB(match.score_b !== null ? match.score_b.toString() : "");
    setEditFormError("");
  };

  const handleEditTeamAChange = (val: string) => {
    setEditTeamA(val);
    if (!val.trim()) {
      setEditTeamASuggestions([]);
      setShowEditTeamASuggestions(false);
      return;
    }
    const filtered = countries.filter(c =>
      c.name.toLowerCase().includes(val.toLowerCase())
    );
    setEditTeamASuggestions(filtered);
    setShowEditTeamASuggestions(true);
  };

  const handleEditTeamBChange = (val: string) => {
    setEditTeamB(val);
    if (!val.trim()) {
      setEditTeamBSuggestions([]);
      setShowEditTeamBSuggestions(false);
      return;
    }
    const filtered = countries.filter(c =>
      c.name.toLowerCase().includes(val.toLowerCase())
    );
    setEditTeamBSuggestions(filtered);
    setShowEditTeamBSuggestions(true);
  };

  const handleSelectEditTeamA = (name: string) => {
    setEditTeamA(name);
    setEditTeamASuggestions([]);
    setShowEditTeamASuggestions(false);
  };

  const handleSelectEditTeamB = (name: string) => {
    setEditTeamB(name);
    setEditTeamBSuggestions([]);
    setShowEditTeamBSuggestions(false);
  };

  const handleEditMatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditFormError("");

    if (!editingMatch) return;
    if (!editTeamA.trim() || !editTeamB.trim() || !editMatchDate || !editMatchTime) {
      setEditFormError("Todos los campos obligatorios del partido deben ser provistos.");
      return;
    }

    if (editTeamA.trim() === editTeamB.trim()) {
      setEditFormError("El equipo local no puede ser igual al visitante.");
      return;
    }

    setIsSavingEdit(true);

    try {
      const combinedDateTime = new Date(`${editMatchDate}T${editMatchTime}`);
      if (isNaN(combinedDateTime.getTime())) {
        setEditFormError("Fecha u hora inválida.");
        setIsSavingEdit(false);
        return;
      }

      const kickoffTimeISO = combinedDateTime.toISOString();
      const parsedScoreA = editScoreA !== "" ? parseInt(editScoreA, 10) : null;
      const parsedScoreB = editScoreB !== "" ? parseInt(editScoreB, 10) : null;

      if (parsedScoreA !== null && (isNaN(parsedScoreA) || parsedScoreA < 0)) {
        setEditFormError("El marcador local debe ser un entero positivo.");
        setIsSavingEdit(false);
        return;
      }

      if (parsedScoreB !== null && (isNaN(parsedScoreB) || parsedScoreB < 0)) {
        setEditFormError("El marcador visitante debe ser un entero positivo.");
        setIsSavingEdit(false);
        return;
      }

      const res = await editMatchDetails(
        editingMatch.id,
        editTeamA.trim(),
        editTeamB.trim(),
        editMatchDate,
        kickoffTimeISO,
        parsedScoreA,
        parsedScoreB
      );

      if (res.error) {
        setEditFormError(res.error);
      } else {
        setEditingMatch(null);
        setActionSuccess("Partido modificado con éxito.");
        fetchMatches();
        fetchCountries();
      }
    } catch (err) {
      setEditFormError("Error inesperado al intentar editar el partido.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  // Render Skeleton for Loading Role
  if (isLoadingProfile) {
    return (
      <div className="flex min-h-[100dvh] bg-slate-50 text-amber-950 font-sans antialiased pb-20 md:pb-0 overflow-x-hidden w-full max-w-full select-none">
        {/* SIDEBAR SKELETON */}
        <aside className="hidden md:flex flex-col w-72 bg-white border-r border-slate-100 p-6 shrink-0 justify-between">
          <div className="space-y-8">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-slate-200 animate-pulse"></div>
              <div className="h-4 w-28 bg-slate-200 rounded animate-pulse"></div>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse"></div>
                <div className="space-y-1.5 flex-1">
                  <div className="h-3.5 w-24 bg-slate-200 rounded animate-pulse"></div>
                  <div className="h-2 w-16 bg-slate-200 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        </aside>
        <div className="flex-1 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-violet-700 animate-spin" />
          <span className="text-xs font-bold text-slate-400 mt-2">Cargando privilegios...</span>
        </div>
      </div>
    );
  }

  // Access Denied Screen
  if (isAdmin === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full shadow-lg text-center flex flex-col items-center gap-4">
          <AlertCircle className="w-12 h-12 text-red-500 animate-bounce" />
          <h2 className="text-xl font-black text-slate-800 uppercase">Acceso Denegado</h2>
          <p className="text-sm font-semibold text-slate-500">
            No tienes los permisos de superadministrador requeridos para ver este panel.
          </p>
          <Link
            href="/dashboard"
            className="mt-2 w-full py-3 bg-violet-700 hover:bg-violet-800 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all active:scale-[0.98] inline-flex items-center justify-center gap-2 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Volver al Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] bg-slate-50 text-amber-950 font-sans antialiased pb-20 md:pb-0 overflow-x-hidden w-full max-w-full">
      
      {/* SIDEBAR (DESKTOP ONLY) */}
      <aside className="hidden md:flex flex-col w-72 bg-white border-r border-slate-100 p-6 shrink-0 justify-between select-none">
        <div>
          {/* Header */}
          <div className="flex items-center gap-2 mb-8 pb-4 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-red-500 text-white font-extrabold flex items-center justify-center text-sm shadow-md">
              M
            </div>
            <Link href="/dashboard" className="font-black tracking-tight text-slate-800 text-base uppercase hover:text-violet-700 transition-colors">
              Mundialario
            </Link>
          </div>

          {/* User badge inside sidebar */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-black">
                {profile?.name?.[0]?.toUpperCase() || ""}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-extrabold text-sm text-slate-800 leading-tight truncate">{profile?.name}</h4>
                <p className="text-[10px] text-red-600 font-extrabold uppercase mt-0.5 tracking-wide flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> Superadmin
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-2">
            <Link
              href="/dashboard?tab=predictions"
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-extrabold text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 uppercase tracking-wide transition-all"
            >
              <Gamepad2 className="w-4 h-4 text-slate-400" />
              <span>Jugar / Predicciones</span>
            </Link>
            <Link
              href="/dashboard?tab=leagues"
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-extrabold text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 uppercase tracking-wide transition-all"
            >
              <Users className="w-4 h-4 text-slate-400" />
              <span>Mis Ligas</span>
            </Link>
            <Link
              href="/dashboard?tab=ranking"
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-extrabold text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 uppercase tracking-wide transition-all"
            >
              <Trophy className="w-4 h-4 text-slate-400" />
              <span>Ranking</span>
            </Link>
            <Link
              href="/dashboard?tab=faq"
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-extrabold text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 uppercase tracking-wide transition-all"
            >
              <HelpCircle className="w-4 h-4 text-slate-400" />
              <span>Ayuda FAQ</span>
            </Link>
            <Link
              href="/dashboard/admin"
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-extrabold text-sm uppercase tracking-wide transition-all bg-red-600 text-white shadow-md shadow-red-600/20"
            >
              <Lock className="w-4 h-4" />
              <span>Superadmin</span>
            </Link>
          </nav>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3 border border-red-100 hover:bg-red-50 text-red-600 font-extrabold text-sm rounded-xl uppercase tracking-wider transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Cerrar Sesión</span>
        </button>
      </aside>

      {/* RIGHT CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* NAVBAR */}
        <header className="sticky top-0 z-40 bg-white border-b border-slate-100 px-4 sm:px-6 py-4 flex items-center justify-between select-none">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="bg-violet-700 text-white px-4 py-2 rounded-full inline-flex items-center gap-2 font-black tracking-tighter text-sm sm:text-base border border-violet-850 hover:opacity-95 transition-all">
              <span className="text-orange-400">👑</span>
              <span>PANEL ADMIN</span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-black uppercase transition-all shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver a App</span>
            </Link>
            
            <button
              onClick={handleLogout}
              className="w-10 h-10 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-600 transition-colors border border-red-100 cursor-pointer shadow-sm"
              title="Cerrar Sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* MAIN PANEL */}
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 md:py-10 space-y-8">
          
          {/* Gradient Banner */}
          <div className="bg-gradient-to-r from-red-600 via-orange-500 to-purple-600 text-white p-6 rounded-3xl shadow-lg border border-red-700 select-none flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="bg-white/20 text-white font-black text-[10px] tracking-wider uppercase px-3 py-1 rounded-full">
                Consola del Organizador
              </span>
              <h2 className="text-2xl sm:text-3xl font-black uppercase mt-3 tracking-tight">
                👑 MUNDIALARIO SUPERADMIN
              </h2>
              <p className="text-white/80 text-xs sm:text-sm font-medium mt-1">
                Carga partidos para la predicción, registra marcadores finales y recalcula puntajes generales.
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm px-5 py-4 rounded-2xl border border-white/10 flex items-center gap-3 shrink-0">
              <Sparkles className="w-6 h-6 text-lime-300 animate-pulse" />
              <div>
                <p className="text-[10px] text-white/50 font-bold uppercase tracking-wider leading-none">Acción Crítica</p>
                <p className="font-extrabold text-sm mt-1">Puntos en Tiempo Real</p>
              </div>
            </div>
          </div>

          {/* Action messages (global/score related updates) */}
          {(actionError || actionSuccess) && (
            <div className="p-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 select-none border">
              {actionError ? (
                <div className="text-red-700 bg-red-50 border-red-100 flex items-center gap-2 w-full">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                  <span>{actionError}</span>
                </div>
              ) : (
                <div className="text-lime-800 bg-lime-50 border-lime-100 flex items-center gap-2 w-full">
                  <CheckCircle className="w-5 h-5 text-lime-600 shrink-0" />
                  <span>{actionSuccess}</span>
                </div>
              )}
            </div>
          )}

          {/* Main Layout Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Create Match Card Form */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <div className="mb-4">
                  <h3 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                    <Plus className="w-4 h-4 text-violet-700" />
                    <span>Publicar Partido</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 font-semibold mt-1">
                    Crea un encuentro en la base de datos con un ID único.
                  </p>
                </div>

                <form onSubmit={handleCreateMatchSubmit} className="space-y-4">
                  {/* Local Team */}
                  <div className="relative">
                    <label className="block text-[10px] text-slate-500 font-black uppercase tracking-wider mb-1">
                      Equipo Local
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="Ej. Francia"
                        value={teamA}
                        onChange={e => handleTeamAChange(e.target.value)}
                        onFocus={() => {
                          if (teamA.trim()) setShowTeamASuggestions(true);
                        }}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs font-semibold transition-all"
                      />
                      {showTeamASuggestions && (
                        <div className="absolute z-50 left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg divide-y divide-slate-100">
                          {teamASuggestions.length > 0 ? (
                            teamASuggestions.map(c => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => handleSelectTeamA(c.name)}
                                className="w-full text-left px-4 py-2 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-2 cursor-pointer"
                              >
                                {c.flag_url ? (
                                  <img src={c.flag_url} alt="" className="w-4 h-4 rounded-full object-cover border border-slate-100" />
                                ) : (
                                  <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[8px] text-slate-400 border border-slate-200 font-extrabold">{c.name.substring(0, 2)}</div>
                                )}
                                <span>{c.name}</span>
                              </button>
                            ))
                          ) : (
                            <div className="px-4 py-2.5 text-xs text-violet-700 bg-violet-50 font-black tracking-wide flex items-center gap-1 select-none">
                              <span>✨ Nuevo país (se creará automáticamente)</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Away Team */}
                  <div className="relative">
                    <label className="block text-[10px] text-slate-500 font-black uppercase tracking-wider mb-1">
                      Equipo Visitante
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="Ej. Brasil"
                        value={teamB}
                        onChange={e => handleTeamBChange(e.target.value)}
                        onFocus={() => {
                          if (teamB.trim()) setShowTeamBSuggestions(true);
                        }}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs font-semibold transition-all"
                      />
                      {showTeamBSuggestions && (
                        <div className="absolute z-50 left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg divide-y divide-slate-100">
                          {teamBSuggestions.length > 0 ? (
                            teamBSuggestions.map(c => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => handleSelectTeamB(c.name)}
                                className="w-full text-left px-4 py-2 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-2 cursor-pointer"
                              >
                                {c.flag_url ? (
                                  <img src={c.flag_url} alt="" className="w-4 h-4 rounded-full object-cover border border-slate-100" />
                                ) : (
                                  <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[8px] text-slate-400 border border-slate-200 font-extrabold">{c.name.substring(0, 2)}</div>
                                )}
                                <span>{c.name}</span>
                              </button>
                            ))
                          ) : (
                            <div className="px-4 py-2.5 text-xs text-violet-700 bg-violet-50 font-black tracking-wide flex items-center gap-1 select-none">
                              <span>✨ Nuevo país (se creará automáticamente)</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Date Input */}
                  <div>
                    <label className="block text-[10px] text-slate-500 font-black uppercase tracking-wider mb-1">
                      Fecha del Encuentro
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        required
                        value={matchDate}
                        onChange={e => setMatchDate(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs font-semibold transition-all"
                      />
                    </div>
                  </div>

                  {/* Time Input */}
                  <div>
                    <label className="block text-[10px] text-slate-500 font-black uppercase tracking-wider mb-1">
                      Hora de Inicio (Local)
                    </label>
                    <div className="relative">
                      <input
                        type="time"
                        required
                        value={matchTime}
                        onChange={e => setMatchTime(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs font-semibold transition-all"
                      />
                    </div>
                  </div>

                  {/* Form response message */}
                  {formError && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-[11px] font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {formSuccess && (
                    <div className="p-3 rounded-xl bg-lime-50 border border-lime-100 text-lime-800 text-[11px] font-bold flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-lime-600 shrink-0" />
                      <span>{formSuccess}</span>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isCreatingMatch}
                    className="w-full flex justify-center items-center py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-violet-700 hover:bg-violet-800 shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                  >
                    {isCreatingMatch ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                        <span>Publicando...</span>
                      </>
                    ) : (
                      <span>Publicar Encuentro</span>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Match List Manager */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">
                      Administrar Partidos Publicados
                    </h3>
                    <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                      Registra marcadores e inicia el cálculo masivo de puntos de las predicciones.
                    </p>
                  </div>
                  <span className="bg-slate-100 text-slate-600 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider select-none">
                    Total: {matches.length}
                  </span>
                </div>

                {isLoadingMatches ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-violet-700 animate-spin" />
                    <p className="text-xs font-bold text-slate-400 mt-2">Cargando partidos...</p>
                  </div>
                ) : matches.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 font-semibold select-none border border-dashed border-slate-200 rounded-2xl">
                    No se han registrado partidos aún en el sistema.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {matches
                      .slice()
                      .sort((a, b) => {
                        if (a.is_calculated && !b.is_calculated) return 1;
                        if (!a.is_calculated && b.is_calculated) return -1;
                        return new Date(a.kickoff_time).getTime() - new Date(b.kickoff_time).getTime();
                      })
                      .map(match => {
                        const input = scoresInput[match.id] || { scoreA: "", scoreB: "" };
                      const isSaving = activeActionId === `save-${match.id}`;
                      const isCalculating = activeActionId === `calc-${match.id}`;
                      const dateFormatted = new Date(match.kickoff_time).toLocaleDateString("es-ES", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit"
                      });

                      const scoresSavedInDb = match.score_a !== null && match.score_b !== null;

                      return (
                        <div
                          key={match.id}
                          className={`border rounded-2xl p-4 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                            match.is_calculated
                              ? "bg-slate-50/50 border-slate-100"
                              : "bg-white border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          {/* Info Block */}
                          <div className="min-w-0 space-y-1 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded">
                                {match.id}
                              </span>
                              <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {dateFormatted}
                              </span>
                              {match.is_calculated ? (
                                <span className="text-[9px] bg-lime-100 text-lime-800 font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 border border-lime-200 uppercase tracking-wide select-none">
                                  <CheckCircle className="w-2.5 h-2.5 text-lime-600" />
                                  Calculado
                                </span>
                              ) : scoresSavedInDb ? (
                                <span className="text-[9px] bg-amber-100 text-amber-800 font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 border border-amber-200 uppercase tracking-wide select-none">
                                  <Clock className="w-2.5 h-2.5 text-amber-600" />
                                  Pendiente Cálculo
                                </span>
                              ) : (
                                <span className="text-[9px] bg-red-100 text-red-800 font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 border border-red-200 uppercase tracking-wide select-none">
                                  <span>Falta Marcador</span>
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 mt-1">
                              {renderFlagCircle(match.team_a, "w-5 h-5 text-[9px]")}
                              <span className="font-extrabold text-sm text-slate-800">
                                {match.team_a}
                              </span>
                              <span className="text-slate-300 font-bold text-sm">vs</span>
                              {renderFlagCircle(match.team_b, "w-5 h-5 text-[9px]")}
                              <span className="font-extrabold text-sm text-slate-800">
                                {match.team_b}
                              </span>
                            </div>
                          </div>

                          {/* Score Input block */}
                          <div className="flex items-center justify-start md:justify-center gap-2 w-full md:w-auto shrink-0">
                            <input
                              type="text"
                              placeholder="0"
                              value={input.scoreA}
                              onChange={e => handleScoreInputChange(match.id, "a", e.target.value)}
                              disabled={match.is_calculated}
                              className="w-12 h-10 border border-slate-200 rounded-xl bg-slate-50 text-center font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm disabled:opacity-75 disabled:bg-slate-100"
                            />
                            <span className="font-bold text-slate-300">-</span>
                            <input
                              type="text"
                              placeholder="0"
                              value={input.scoreB}
                              onChange={e => handleScoreInputChange(match.id, "b", e.target.value)}
                              disabled={match.is_calculated}
                              className="w-12 h-10 border border-slate-200 rounded-xl bg-slate-50 text-center font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm disabled:opacity-75 disabled:bg-slate-100"
                            />
                          </div>

                          {/* Actions Buttons */}
                          <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end flex-wrap">
                            {/* Edit Details button */}
                            <button
                              onClick={() => handleStartEditMatch(match)}
                              disabled={isSaving || isCalculating}
                              className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-black text-xs rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                              title="Editar Detalles"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span className="md:hidden lg:inline">Editar</span>
                            </button>

                            {/* Save Score button */}
                            {!match.is_calculated && (
                              <button
                                onClick={() => handleSaveMatchScore(match.id)}
                                disabled={isSaving || isCalculating}
                                className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 border border-violet-100 bg-violet-50 hover:bg-violet-100 text-violet-800 font-black text-xs rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                                title="Guardar Marcador"
                              >
                                {isSaving ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-700" />
                                ) : (
                                  <Save className="w-3.5 h-3.5" />
                                )}
                                <span className="md:hidden lg:inline">Guardar</span>
                              </button>
                            )}

                            {/* Calculate Points button */}
                            {scoresSavedInDb && (
                              <button
                                onClick={() => handleCalculatePoints(match.id)}
                                disabled={isSaving || isCalculating}
                                className={`flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 font-black text-xs rounded-xl transition-all disabled:opacity-50 cursor-pointer ${
                                  match.is_calculated
                                    ? "bg-slate-100 border border-slate-200 text-slate-400"
                                    : "bg-lime-400 hover:bg-lime-500 text-amber-950 shadow-sm shadow-lime-400/20"
                                }`}
                              >
                                {isCalculating ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-950" />
                                ) : (
                                  <Trophy className="w-3.5 h-3.5" />
                                )}
                                <span>{match.is_calculated ? "Recalcular" : "Calcular"}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
            

          {/* ========================================================== */}
          {/* COUNTRY & FLAG MANAGEMENT PANEL */}
          {/* ========================================================== */}
          <div className="space-y-6">

            {/* Section Header */}
            <div className="bg-gradient-to-r from-lime-500 to-emerald-600 text-white p-5 rounded-3xl shadow-lg border border-lime-600 select-none flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 shadow-sm">
                <span className="text-xl">🌍</span>
              </div>
              <div>
                <span className="bg-white/20 text-white font-black text-[10px] tracking-wider uppercase px-3 py-1 rounded-full">
                  Gestión de Banderas
                </span>
                <h3 className="text-lg font-black uppercase mt-1 tracking-tight">
                  Países y Banderas
                </h3>
                <p className="text-white/80 text-[11px] font-medium">
                  Administra los países y actualiza sus URLs de bandera para mostrarlas en las tarjetas de juego.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Add / Edit Country Form */}
              <div className="lg:col-span-1">
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2 mb-4">
                    <Plus className="w-4 h-4 text-lime-600" />
                    <span>{newCountryName ? "Editar País" : "Agregar País"}</span>
                  </h4>

                  <form onSubmit={handleSaveCountrySubmit} className="space-y-4">
                    {/* Country Name */}
                    <div>
                      <label className="block text-[10px] text-slate-500 font-black uppercase tracking-wider mb-1">
                        Nombre del País
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Argentina"
                        value={newCountryName}
                        onChange={e => setNewCountryName(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-500 text-xs font-semibold transition-all"
                      />
                    </div>

                    {/* Flag URL */}
                    <div>
                      <label className="block text-[10px] text-slate-500 font-black uppercase tracking-wider mb-1">
                        URL de Bandera (imagen circular)
                      </label>
                      <input
                        type="url"
                        placeholder="https://flagcdn.com/w160/ar.png"
                        value={newCountryFlag}
                        onChange={e => setNewCountryFlag(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-500 text-xs font-semibold transition-all"
                      />
                      {newCountryFlag && (
                        <div className="mt-2 flex items-center gap-2">
                          <img
                            src={newCountryFlag}
                            alt="Preview"
                            className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-sm"
                            onError={(e: any) => { e.target.style.display = 'none'; }}
                          />
                          <span className="text-[10px] text-slate-400 font-bold">Vista previa</span>
                        </div>
                      )}
                      <p className="text-[9px] text-slate-400 mt-1.5 leading-tight">
                        💡 Usa <strong className="text-slate-500">flagcdn.com</strong>. Ej: <code className="bg-slate-100 px-1 rounded">flagcdn.com/w160/ar.png</code>
                      </p>
                    </div>

                    {/* Messages */}
                    {countryFormError && (
                      <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-[11px] font-bold flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                        <span>{countryFormError}</span>
                      </div>
                    )}
                    {countryFormSuccess && (
                      <div className="p-3 rounded-xl bg-lime-50 border border-lime-100 text-lime-800 text-[11px] font-bold flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-lime-600 shrink-0" />
                        <span>{countryFormSuccess}</span>
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      {newCountryName && (
                        <button
                          type="button"
                          onClick={() => { setNewCountryName(""); setNewCountryFlag(""); setCountryFormError(""); setCountryFormSuccess(""); }}
                          className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-black text-xs rounded-xl uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          Cancelar
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={isSavingCountry}
                        className="flex-1 flex justify-center items-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-lime-500 hover:bg-lime-600 shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                      >
                        {isSavingCountry ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Save className="w-3.5 h-3.5" />
                        )}
                        <span>{newCountryName ? "Guardar" : "Agregar País"}</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Countries List Grid */}
              <div className="lg:col-span-2">
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                      Países Registrados
                    </h4>
                    <span className="bg-slate-100 text-slate-600 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                      Total: {countries.length}
                    </span>
                  </div>

                  {isLoadingCountries ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="w-6 h-6 text-lime-500 animate-spin" />
                    </div>
                  ) : countries.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 font-semibold text-xs select-none border border-dashed border-slate-200 rounded-2xl">
                      No hay países registrados. Agrega el primero desde el formulario.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                      {countries.map(country => (
                        <div
                          key={country.id}
                          className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 hover:shadow-sm transition-all group"
                        >
                          {/* Flag circle */}
                          {country.flag_url ? (
                            <img
                              src={country.flag_url}
                              alt={country.name}
                              className="w-9 h-9 rounded-full object-cover border border-slate-200 shadow-sm shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-slate-200 border border-slate-300 text-slate-500 font-extrabold text-xs uppercase flex items-center justify-center shrink-0 shadow-sm">
                              {country.name.substring(0, 2)}
                            </div>
                          )}

                          {/* Name and flag status */}
                          <div className="min-w-0 flex-1">
                            <p className="font-extrabold text-xs text-slate-800 truncate">{country.name}</p>
                            <p className="text-[9px] text-slate-400 font-bold truncate">
                              {country.flag_url ? (
                                <span className="text-lime-600">✓ Bandera cargada</span>
                              ) : (
                                <span className="text-orange-500">⚠ Sin bandera</span>
                              )}
                            </p>
                          </div>

                          {/* Edit button */}
                          <button
                            onClick={() => handleEditCountry(country.name, country.flag_url || "")}
                            className="opacity-0 group-hover:opacity-100 text-[9px] font-black uppercase tracking-wider text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-100 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer shrink-0"
                            title="Editar bandera"
                          >
                            Editar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

        </main>
      </div>

      {/* MOBILE STICKY BOTTOM NAVIGATION BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-50 w-full bg-white/95 backdrop-blur-sm border-t border-slate-100 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] py-2.5 px-6 flex justify-between items-center md:hidden select-none">
        
        {/* Return to Dashboard */}
        <Link
          href="/dashboard"
          className="flex flex-col items-center gap-1 group"
        >
          <Gamepad2 className="w-5 h-5 text-slate-400 hover:text-violet-700 transition-colors" />
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-violet-700">
            Jugar
          </span>
        </Link>

        {/* Admin Section (Current Active) */}
        <div className="flex flex-col items-center gap-1">
          <Lock className="w-5 h-5 text-red-600" />
          <span className="text-[10px] font-black uppercase tracking-wider text-red-600">
            Admin
          </span>
        </div>

        {/* Ranking */}
        <Link
          href="/dashboard?tab=ranking"
          className="flex flex-col items-center gap-1 group"
        >
          <Trophy className="w-5 h-5 text-slate-400 hover:text-violet-700 transition-colors" />
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-violet-700">
            Ranking
          </span>
        </Link>
      </div>

      {/* EDIT MATCH DETAILS MODAL */}
      {editingMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md px-4 select-none animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col justify-between animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-violet-700" />
                <span>Editar Detalles del Partido</span>
              </h3>
              <button
                onClick={() => setEditingMatch(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleEditMatchSubmit}>
              <div className="p-6 space-y-4 max-h-[60dvh] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Local Team */}
                  <div className="relative">
                    <label className="block text-[10px] text-slate-500 font-black uppercase tracking-wider mb-1">
                      Equipo Local
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Francia"
                      value={editTeamA}
                      onChange={e => handleEditTeamAChange(e.target.value)}
                      onFocus={() => { if (editTeamA.trim()) setShowEditTeamASuggestions(true); }}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs font-semibold"
                    />
                    {showEditTeamASuggestions && (
                      <div className="absolute z-50 left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg divide-y divide-slate-100">
                        {editTeamASuggestions.length > 0 ? (
                          editTeamASuggestions.map(c => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => handleSelectEditTeamA(c.name)}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-2 cursor-pointer"
                            >
                              {c.flag_url ? (
                                <img src={c.flag_url} alt="" className="w-4 h-4 rounded-full object-cover" />
                              ) : (
                                <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[8px] text-slate-400 border border-slate-200 font-extrabold">{c.name.substring(0, 2)}</div>
                              )}
                              <span>{c.name}</span>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-2.5 text-xs text-violet-700 bg-violet-50 font-black tracking-wide flex items-center gap-1 select-none">
                            <span>✨ Nuevo país (se creará automáticamente)</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Away Team */}
                  <div className="relative">
                    <label className="block text-[10px] text-slate-500 font-black uppercase tracking-wider mb-1">
                      Equipo Visitante
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Brasil"
                      value={editTeamB}
                      onChange={e => handleEditTeamBChange(e.target.value)}
                      onFocus={() => { if (editTeamB.trim()) setShowEditTeamBSuggestions(true); }}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs font-semibold"
                    />
                    {showEditTeamBSuggestions && (
                      <div className="absolute z-50 left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg divide-y divide-slate-100">
                        {editTeamBSuggestions.length > 0 ? (
                          editTeamBSuggestions.map(c => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => handleSelectEditTeamB(c.name)}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-2 cursor-pointer"
                            >
                              {c.flag_url ? (
                                <img src={c.flag_url} alt="" className="w-4 h-4 rounded-full object-cover" />
                              ) : (
                                <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[8px] text-slate-400 border border-slate-200 font-extrabold">{c.name.substring(0, 2)}</div>
                              )}
                              <span>{c.name}</span>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-2.5 text-xs text-violet-700 bg-violet-50 font-black tracking-wide flex items-center gap-1 select-none">
                            <span>✨ Nuevo país (se creará automáticamente)</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Match Date */}
                  <div>
                    <label className="block text-[10px] text-slate-500 font-black uppercase tracking-wider mb-1">
                      Fecha del Encuentro
                    </label>
                    <input
                      type="date"
                      required
                      value={editMatchDate}
                      onChange={e => setEditMatchDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs font-semibold"
                    />
                  </div>

                  {/* Match Time */}
                  <div>
                    <label className="block text-[10px] text-slate-500 font-black uppercase tracking-wider mb-1">
                      Hora de Inicio
                    </label>
                    <input
                      type="time"
                      required
                      value={editMatchTime}
                      onChange={e => setEditMatchTime(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <h4 className="text-[10px] font-black text-amber-950/50 uppercase tracking-widest mb-3">Marcador Oficial (Dejar en blanco si no se ha jugado)</h4>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="block text-[10px] text-slate-500 font-black uppercase tracking-wider mb-1">
                        Goles Local
                      </label>
                      <input
                        type="text"
                        placeholder="Sin marcador"
                        value={editScoreA}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === "" || /^\d+$/.test(val)) setEditScoreA(val);
                        }}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none text-xs font-black text-center"
                      />
                    </div>
                    <span className="font-bold text-slate-300 mt-4">-</span>
                    <div className="flex-1">
                      <label className="block text-[10px] text-slate-500 font-black uppercase tracking-wider mb-1">
                        Goles Visitante
                      </label>
                      <input
                        type="text"
                        placeholder="Sin marcador"
                        value={editScoreB}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === "" || /^\d+$/.test(val)) setEditScoreB(val);
                        }}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none text-xs font-black text-center"
                      />
                    </div>
                  </div>
                </div>

                {editFormError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-[11px] font-bold flex items-center gap-1.5 select-none">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <span>{editFormError}</span>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="bg-slate-50 px-6 py-4 flex gap-3 border-t border-slate-100 select-none">
                <button
                  type="button"
                  onClick={() => setEditingMatch(null)}
                  className="flex-1 py-3 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-extrabold text-xs rounded-xl uppercase tracking-wider transition-colors cursor-pointer text-center"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="flex-1 flex justify-center items-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-violet-700 hover:bg-violet-800 shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  {isSavingEdit ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5 text-lime-400" />
                  )}
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
