"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { savePrediction } from "@/app/actions/predictions";
import { createLeague, joinLeague, getPublicLeagues, joinPublicLeague } from "@/app/actions/leagues";
import {
  Gamepad2,
  Users,
  Trophy,
  HelpCircle,
  Menu,
  X,
  Plus,
  Minus,
  Save,
  User,
  LogOut,
  Calendar,
  Lock,
  CheckCircle,
  AlertCircle,
  Copy,
  ChevronRight,
  ChevronDown,
  Globe,
  Loader2,
  Share2,
  MessageCircle,
  Instagram
} from "lucide-react";

type UserProfile = {
  id: string;
  name: string;
  email: string;
  created_at: string;
  is_admin?: boolean;
  total_points?: number;
  avatar_url?: string | null;
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

type Prediction = {
  match_id: string;
  pred_a: number;
  pred_b: number;
  points: number;
  penalty?: number;
};

type League = {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
  owner_name?: string;
  is_public?: boolean;
};

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<"predictions" | "leagues" | "ranking" | "faq" | "history">("predictions");

  // Data states
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Record<string, { pred_a: number; pred_b: number; points: number; penalty: number }>>({});
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const [leagueMembers, setLeagueMembers] = useState<Record<string, any[]>>({});
  const [overallLeaderboard, setOverallLeaderboard] = useState<any[]>([]);
  const [countriesMap, setCountriesMap] = useState<Record<string, string>>({});

  // LigaVerso & Ranking states
  const [leaguesViewMode, setLeaguesViewMode] = useState<"my-leagues" | "ligaverso">("my-leagues");
  const [publicLeagues, setPublicLeagues] = useState<any[]>([]);
  const [isLoadingPublicLeagues, setIsLoadingPublicLeagues] = useState(false);
  const [isPublicLeagueInput, setIsPublicLeagueInput] = useState(false);
  const [selectedRankingLeagueId, setSelectedRankingLeagueId] = useState<string | null>(null);
  const [isJoiningPublicId, setIsJoiningPublicId] = useState<string | null>(null);
  const [createdLeagueShare, setCreatedLeagueShare] = useState<{ name: string; inviteCode: string } | null>(null);

  // Timed Prediction Modal states
  const [activeMatchForPrediction, setActiveMatchForPrediction] = useState<Match | null>(null);
  const [predictionTimer, setPredictionTimer] = useState(15);
  const [predScoreA, setPredScoreA] = useState(0);
  const [predScoreB, setPredScoreB] = useState(0);
  const [showConfirmPenaltyModal, setShowConfirmPenaltyModal] = useState<Match | null>(null);

  // Keep track of values in refs to avoid stale interval closures
  const predScoreARef = useRef(0);
  const predScoreBRef = useRef(0);

  useEffect(() => {
    predScoreARef.current = predScoreA;
  }, [predScoreA]);

  useEffect(() => {
    predScoreBRef.current = predScoreB;
  }, [predScoreB]);

  // Form states
  const [newLeagueName, setNewLeagueName] = useState("");
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // Loading / UI states
  const [isLoading, setIsLoading] = useState(true);
  const [savingPredictionId, setSavingPredictionId] = useState<string | null>(null);
  const [expandedLeagueId, setExpandedLeagueId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab") as any;
    if (tabParam && ["predictions", "leagues", "ranking", "faq", "history"].includes(tabParam)) {
      setActiveTab(tabParam);
      localStorage.setItem("mundialario_active_tab", tabParam);
    } else {
      const savedTab = localStorage.getItem("mundialario_active_tab") as any;
      if (savedTab && ["predictions", "leagues", "ranking", "faq", "history"].includes(savedTab)) {
        setActiveTab(savedTab);
      }
    }
    fetchInitialData(0);
  }, []);

  useEffect(() => {
    localStorage.setItem("mundialario_active_tab", activeTab);
    const url = new URL(window.location.href);
    if (url.searchParams.get("tab") !== activeTab) {
      url.searchParams.set("tab", activeTab);
      window.history.replaceState(null, "", url.pathname + url.search);
    }
  }, [activeTab]);

  const fetchInitialData = async (retryCount = 0) => {
    setIsLoading(true);
    try {
      // 1. Get auth session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      // 2. Get user profile
      const { data: userProfile, error: profileError } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", session.user.id)
        .single();

      if (profileError || !userProfile) {
        console.warn("Profile resolution error", profileError);
        // Fallback or retry after brief delay if trigger is still running
        if (retryCount < 3) {
          setTimeout(() => fetchInitialData(retryCount + 1), 1000);
        } else {
          setProfileErrorMsg("No se pudo cargar tu perfil. Es posible que tu cuenta no esté completamente sincronizada en la base de datos.");
          setIsLoading(false);
        }
        return;
      }

      setProfile(userProfile as UserProfile);
      setProfileErrorMsg(null);

      // 3. Fetch Matches
      const { data: matchesData } = await supabase
        .from("matches")
        .select("*")
        .order("kickoff_time", { ascending: true });

      if (matchesData) {
        setMatches(matchesData as Match[]);
      }

      // 3.5 Fetch Countries for flags
      const { data: countriesData } = await supabase
        .from("countries")
        .select("name, flag_url");

      if (countriesData) {
        const cmap: Record<string, string> = {};
        countriesData.forEach((c: any) => {
          if (c.name) cmap[c.name] = c.flag_url || "";
        });
        setCountriesMap(cmap);
      }

      // 4. Fetch User Predictions
      const { data: predictionsData } = await supabase
        .from("predictions")
        .select("*")
        .eq("user_id", userProfile.id);

      if (predictionsData) {
        const predsMap: Record<string, { pred_a: number; pred_b: number; points: number; penalty: number }> = {};
        predictionsData.forEach((p: any) => {
          predsMap[p.match_id] = {
            pred_a: p.pred_a,
            pred_b: p.pred_b,
            points: p.points || 0,
            penalty: p.penalty || 0
          };
        });
        setPredictions(predsMap);
      }

      // 5. Fetch User Leagues
      const { data: userLeaguesData } = await supabase
        .from("league_members")
        .select(`
          leagues (
            id,
            name,
            invite_code,
            owner_id
          )
        `)
        .eq("user_id", userProfile.id);

      if (userLeaguesData) {
        const loadedLeagues: League[] = [];
        userLeaguesData.forEach((item: any) => {
          if (item.leagues) {
            loadedLeagues.push(item.leagues as League);
          }
        });
        setLeagues(loadedLeagues);
        if (loadedLeagues.length > 0) {
          setSelectedLeagueId(loadedLeagues[0].id);
          fetchLeagueLeaderboard(loadedLeagues[0].id);
          setSelectedRankingLeagueId(prev => prev || loadedLeagues[0].id);
        }
      }

    } catch (err) {
      console.error("Error fetching dashboard data", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLeagueLeaderboard = async (leagueId: string) => {
    try {
      const { data, error } = await supabase
        .from("league_members")
        .select(`
          user_id,
          users (
            id,
            name,
            total_points,
            avatar_url
          )
        `)
        .eq("league_id", leagueId);

      if (error) {
        console.warn("League leaderboard query failed, falling back to predictions:", error.message);
        const { data: fallbackData } = await supabase
          .from("league_members")
          .select(`
            user_id,
            users (
              id,
              name,
              avatar_url,
              predictions (
                points,
                penalty
              )
            )
          `)
          .eq("league_id", leagueId);

        if (fallbackData) {
          const leaderboard = fallbackData
            .map((item: any) => {
              const user = Array.isArray(item.users) ? item.users[0] : item.users;
              const preds = user?.predictions || [];
              const totalPoints = preds.reduce((sum: number, p: any) => sum + (p.points || 0) - (p.penalty || 0), 0) || 0;
              return {
                id: user?.id,
                name: user?.name,
                points: totalPoints,
                avatar_url: user?.avatar_url
              };
            })
            .sort((a: any, b: any) => b.points - a.points);

          setLeagueMembers(prev => ({ ...prev, [leagueId]: leaderboard }));
        }
      } else if (data) {
        const leaderboard = data
          .map((item: any) => {
            const user = Array.isArray(item.users) ? item.users[0] : item.users;
            return {
              id: user?.id,
              name: user?.name,
              points: user?.total_points || 0,
              avatar_url: user?.avatar_url
            };
          })
          .sort((a: any, b: any) => b.points - a.points);

        setLeagueMembers(prev => ({ ...prev, [leagueId]: leaderboard }));
      }
    } catch (err) {
      console.error("Error fetching league leaderboard", err);
    }
  };

  // Fetch public leagues when view mode is 'ligaverso'
  useEffect(() => {
    if (leaguesViewMode === "ligaverso") {
      fetchPublicLeaguesData();
    }
  }, [leaguesViewMode]);

  // Sync selectedRankingLeagueId updates
  useEffect(() => {
    if (selectedRankingLeagueId) {
      fetchLeagueLeaderboard(selectedRankingLeagueId);
    }
  }, [selectedRankingLeagueId]);

  const fetchPublicLeaguesData = async () => {
    setIsLoadingPublicLeagues(true);
    try {
      const res = await getPublicLeagues();
      if (res.success && res.leagues) {
        setPublicLeagues(res.leagues);
      } else if (res.error) {
        console.error(res.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingPublicLeagues(false);
    }
  };

  const handleJoinPublicLeague = async (leagueId: string) => {
    setIsJoiningPublicId(leagueId);
    setFormError("");
    setFormSuccess("");
    try {
      const res = await joinPublicLeague(leagueId);
      if (res.error) {
        setFormError(res.error);
      } else {
        setFormSuccess(`¡Te has unido con éxito a la liga pública "${res.leagueName}"!`);
        await fetchInitialData();
        await fetchPublicLeaguesData();
      }
    } catch (err) {
      setFormError("Hubo un error al unirte a la liga pública.");
    } finally {
      setIsJoiningPublicId(null);
    }
  };

  const handleCreateLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    if (!newLeagueName.trim()) return;

    try {
      const res = await createLeague(newLeagueName, isPublicLeagueInput);
      if (res.error) {
        setFormError(res.error);
      } else {
        setFormSuccess(`¡Liga "${newLeagueName}" creada con éxito!`);
        if (res.inviteCode) {
          setCreatedLeagueShare({
            name: newLeagueName.trim(),
            inviteCode: res.inviteCode
          });
        }
        setNewLeagueName("");
        setIsPublicLeagueInput(false);
        await fetchInitialData(); // Refresh leagues list
      }
    } catch (err) {
      setFormError("Hubo un error inesperado al crear la liga.");
    }
  };

  const handleJoinLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    if (!inviteCodeInput.trim()) return;

    try {
      const res = await joinLeague(inviteCodeInput);
      if (res.error) {
        setFormError(res.error);
      } else {
        setFormSuccess(`¡Te has unido con éxito a la liga!`);
        setInviteCodeInput("");
        await fetchInitialData(); // Refresh leagues list
      }
    } catch (err) {
      setFormError("Hubo un error inesperado al unirte a la liga.");
    }
  };

  const renderFlagCircle = (teamName: string, sizeClass = "w-6 h-6 text-[10px]") => {
    const flagUrl = countriesMap[teamName];
    if (flagUrl) {
      return (
        <img
          src={flagUrl}
          alt={`${teamName}`}
          className={`${sizeClass} rounded-full object-cover border border-slate-200 shrink-0 shadow-sm`}
        />
      );
    }
    return (
      <div className={`${sizeClass} rounded-full bg-slate-100 border border-slate-200 text-slate-500 font-extrabold uppercase flex items-center justify-center shrink-0 shadow-sm select-none`}>
        {teamName.substring(0, 2)}
      </div>
    );
  };

  // Timed Prediction countdown useEffect and handlers
  useEffect(() => {
    if (!activeMatchForPrediction) return;

    setPredictionTimer(15);

    const interval = setInterval(() => {
      setPredictionTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeMatchForPrediction]);

  // Autosave when timer hits 0 (separating side effect from state updater to prevent React render warnings)
  useEffect(() => {
    if (activeMatchForPrediction && predictionTimer === 0) {
      handleAutoSaveTimedPrediction(activeMatchForPrediction.id);
    }
  }, [predictionTimer, activeMatchForPrediction]);

  const handleAutoSaveTimedPrediction = async (matchId: string) => {
    const pA = predScoreARef.current;
    const pB = predScoreBRef.current;

    setActiveMatchForPrediction(null);
    setSavingPredictionId(matchId);
    try {
      const res = await savePrediction(matchId, pA, pB);
      if (res.error) {
        alert(res.error);
      } else {
        await fetchInitialData(0);
      }
    } catch (err) {
      alert("Error al conectar con el servidor.");
    } finally {
      setSavingPredictionId(null);
    }
  };

  const handleSaveTimedPrediction = async () => {
    if (!activeMatchForPrediction) return;
    const match = activeMatchForPrediction;

    const now = new Date();
    const kickoff = new Date(match.kickoff_time);
    if (now >= kickoff) {
      alert("El partido ya comenzó. No se admiten más predicciones.");
      setActiveMatchForPrediction(null);
      await fetchInitialData(0);
      return;
    }

    const matchId = match.id;
    const pA = predScoreA;
    const pB = predScoreB;

    setActiveMatchForPrediction(null);
    setSavingPredictionId(matchId);
    try {
      const res = await savePrediction(matchId, pA, pB);
      if (res.error) {
        alert(res.error);
      } else {
        await fetchInitialData(0);
      }
    } catch (err) {
      alert("Error al conectar con el servidor.");
    } finally {
      setSavingPredictionId(null);
    }
  };

  const handleStartPredictionFlow = (match: Match) => {
    const now = new Date();
    const kickoff = new Date(match.kickoff_time);
    if (now >= kickoff) {
      alert("El partido ya comenzó. No se admiten más predicciones.");
      fetchInitialData(0);
      return;
    }

    const pred = predictions[match.id];
    if (pred) {
      setShowConfirmPenaltyModal(match);
    } else {
      setPredScoreA(0);
      setPredScoreB(0);
      setActiveMatchForPrediction(match);
    }
  };

  const handleConfirmPenaltyPayAndModify = () => {
    if (!showConfirmPenaltyModal) return;
    const match = showConfirmPenaltyModal;

    const now = new Date();
    const kickoff = new Date(match.kickoff_time);
    if (now >= kickoff) {
      alert("El partido ya comenzó. No se admiten más predicciones.");
      setShowConfirmPenaltyModal(null);
      fetchInitialData(0);
      return;
    }

    const pred = predictions[match.id] || { pred_a: 0, pred_b: 0 };

    setPredScoreA(pred.pred_a);
    setPredScoreB(pred.pred_b);
    setShowConfirmPenaltyModal(null);
    setActiveMatchForPrediction(match);
  };

  const handleSavePrediction = async (matchId: string) => {
    const pred = predictions[matchId] || { pred_a: 0, pred_b: 0 };
    setSavingPredictionId(matchId);
    try {
      const res = await savePrediction(matchId, pred.pred_a, pred.pred_b);
      if (res.error) {
        alert(res.error);
      } else {
        // Update local points indicator
        await fetchInitialData();
      }
    } catch (err) {
      alert("Error al conectar con el servidor.");
    } finally {
      setSavingPredictionId(null);
    }
  };

  const adjustScore = (matchId: string, team: "a" | "b", amount: number) => {
    setPredictions(prev => {
      const current = prev[matchId] || { pred_a: 0, pred_b: 0, points: 0 };
      const val = team === "a" ? current.pred_a : current.pred_b;
      const newVal = Math.max(0, val + amount);
      return {
        ...prev,
        [matchId]: {
          ...current,
          [team === "a" ? "pred_a" : "pred_b"]: newVal
        }
      };
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const toggleLeagueDetails = (leagueId: string) => {
    if (expandedLeagueId === leagueId) {
      setExpandedLeagueId(null);
    } else {
      setExpandedLeagueId(leagueId);
      fetchLeagueLeaderboard(leagueId);
    }
  };

  // Helper to calculate total accumulated points
  const calculateTotalUserPoints = () => {
    if (profile && typeof profile.total_points === "number") {
      return profile.total_points;
    }

    // Fallback: calculate in memory using predictions
    return Object.values(predictions).reduce(
      (sum, p) => sum + (p.points || 0) - (p.penalty || 0),
      0
    );
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] bg-slate-50 text-slate-900 font-sans antialiased pb-20 md:pb-0 overflow-x-hidden w-full max-w-full select-none">
        {/* SIDEBAR SKELETON (DESKTOP ONLY) */}
        <aside className="hidden md:flex flex-col w-72 bg-white border-r border-slate-100 p-6 shrink-0 justify-between">
          <div className="space-y-8">
            {/* Header logo skeleton */}
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-slate-200 animate-pulse animate-duration-75"></div>
              <div className="h-4 w-28 bg-slate-200 rounded animate-pulse"></div>
            </div>
            {/* User card skeleton */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse"></div>
                <div className="space-y-1.5 flex-1">
                  <div className="h-3.5 w-24 bg-slate-200 rounded animate-pulse"></div>
                  <div className="h-2 w-16 bg-slate-200 rounded animate-pulse"></div>
                </div>
              </div>
              <div className="h-3 w-full bg-slate-200 rounded animate-pulse pt-2"></div>
            </div>
            {/* Menu items skeleton */}
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-11 w-full bg-slate-100 rounded-xl animate-pulse"></div>
              ))}
            </div>
          </div>
          {/* Logout button skeleton */}
          <div className="h-11 w-full bg-slate-100 rounded-xl animate-pulse"></div>
        </aside>

        {/* RIGHT CONTENT WRAPPER SKELETON */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* NAVBAR SKELETON */}
          <header className="sticky top-0 z-40 bg-white border-b border-slate-100 px-4 sm:px-6 py-4 flex items-center justify-between">
            <div className="h-9 w-32 bg-slate-200 rounded-full animate-pulse"></div>
            <div className="flex items-center gap-3">
              <div className="h-7 w-20 bg-slate-200 rounded-full animate-pulse"></div>
              <div className="h-10 w-10 rounded-full bg-slate-200 animate-pulse"></div>
            </div>
          </header>

          {/* MAIN SKELETON */}
          <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 md:py-10 space-y-6">
            {/* Banner skeleton */}
            <div className="h-36 w-full bg-slate-200 rounded-3xl animate-pulse"></div>

            {/* Cards Grid skeleton */}
            <div className="space-y-4">
              <div className="h-3.5 w-36 bg-slate-200 rounded animate-pulse px-2"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-sm">
                    {/* Header */}
                    <div className="flex justify-between items-center">
                      <div className="h-5 w-24 bg-slate-100 rounded-full animate-pulse"></div>
                      <div className="h-5 w-16 bg-slate-100 rounded-full animate-pulse"></div>
                    </div>
                    {/* Teams match */}
                    <div className="flex items-center justify-around py-2">
                      <div className="flex flex-col items-center gap-2 w-5/12">
                        <div className="h-4 w-16 bg-slate-200 rounded animate-pulse"></div>
                        <div className="h-7 w-12 bg-slate-100 rounded-lg animate-pulse"></div>
                      </div>
                      <div className="h-4 w-4 bg-slate-200 rounded animate-pulse"></div>
                      <div className="flex flex-col items-center gap-2 w-5/12">
                        <div className="h-4 w-16 bg-slate-200 rounded animate-pulse"></div>
                        <div className="h-7 w-12 bg-slate-100 rounded-lg animate-pulse"></div>
                      </div>
                    </div>
                    {/* Button */}
                    <div className="h-10 w-full bg-slate-100 rounded-2xl animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          </main>
        </div>

        {/* MOBILE STICKY BOTTOM BAR SKELETON */}
        <div className="fixed bottom-0 left-0 right-0 z-50 w-full bg-white border-t border-slate-100 py-2.5 px-6 flex justify-between items-center md:hidden select-none">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="w-5 h-5 bg-slate-200 rounded animate-pulse"></div>
              <div className="h-2.5 w-8 bg-slate-100 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (profileErrorMsg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full shadow-lg text-center flex flex-col items-center gap-4">
          <AlertCircle className="w-12 h-12 text-red-500 animate-bounce" />
          <h2 className="text-xl font-black text-slate-800 uppercase">Error de Perfil</h2>
          <p className="text-sm font-semibold text-slate-500">{profileErrorMsg}</p>
          <div className="flex flex-col gap-2 w-full mt-2">
            <button
              onClick={() => fetchInitialData(0)}
              className="w-full py-3 bg-violet-700 hover:bg-violet-800 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all active:scale-[0.98] shadow-sm cursor-pointer"
            >
              Reintentar
            </button>
            <button
              onClick={handleLogout}
              className="w-full py-3 border border-red-100 hover:bg-red-50 text-red-600 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] bg-slate-50 text-slate-900 font-sans antialiased pb-20 md:pb-0 overflow-x-hidden w-full max-w-full">

      {/* SIDEBAR (DESKTOP ONLY) */}
      <aside className="hidden md:flex flex-col w-72 bg-white border-r border-slate-100 p-6 shrink-0 justify-between">
        <div>
          {/* Header inside sidebar */}
          <div className="flex items-center gap-2 mb-8 pb-4 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-red-500 text-white font-extrabold flex items-center justify-center text-sm shadow-md shadow-purple-500/10">
              M
            </div>
            <span className="font-black tracking-tight text-slate-800 text-base uppercase">Mundialario</span>
          </div>

          {/* User overview inside sidebar */}
          <Link
            href={profile?.id ? `/dashboard/users/${profile.id}` : "#"}
            className="block bg-slate-50 border border-slate-100 hover:border-slate-200 rounded-2xl p-4 mb-6 transition-all group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.name}
                  className="w-10 h-10 rounded-full object-cover border border-violet-100 group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-violet-200 text-violet-800 flex items-center justify-center font-black group-hover:scale-105 transition-transform">
                  {profile?.name?.[0]?.toUpperCase() || ""}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h4 className="font-extrabold text-sm text-slate-800 leading-tight truncate group-hover:text-violet-700 transition-colors">
                  {profile?.name}
                </h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 truncate">{profile?.id}</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-200/50 flex justify-between items-center text-xs font-semibold text-slate-500">
              <span>Puntos Acumulados</span>
              <strong className="text-violet-700 font-black text-sm">{calculateTotalUserPoints()} pts</strong>
            </div>
          </Link>

          {/* Sidebar links */}
          <nav className="flex flex-col gap-2">
            <button
              onClick={() => setActiveTab("predictions")}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-extrabold text-sm uppercase tracking-wide transition-all cursor-pointer ${activeTab === "predictions"
                ? "bg-violet-700 text-white shadow-md shadow-violet-700/20"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
            >
              <Gamepad2 className="w-4 h-4" />
              <span>Jugar</span>
            </button>
            <button
              onClick={() => setActiveTab("leagues")}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-extrabold text-sm uppercase tracking-wide transition-all cursor-pointer ${activeTab === "leagues"
                ? "bg-violet-700 text-white shadow-md shadow-violet-700/20"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
            >
              <Users className="w-4 h-4" />
              <span>Mis Ligas</span>
            </button>
            <button
              onClick={() => setActiveTab("ranking")}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-extrabold text-sm uppercase tracking-wide transition-all cursor-pointer ${activeTab === "ranking"
                ? "bg-violet-700 text-white shadow-md shadow-violet-700/20"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
            >
              <Trophy className="w-4 h-4" />
              <span>Ranking</span>
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-extrabold text-sm uppercase tracking-wide transition-all cursor-pointer ${activeTab === "history"
                ? "bg-violet-700 text-white shadow-md shadow-violet-700/20"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Historial</span>
            </button>
            <button
              onClick={() => setActiveTab("faq")}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-extrabold text-sm uppercase tracking-wide transition-all cursor-pointer ${activeTab === "faq"
                ? "bg-violet-700 text-white shadow-md shadow-violet-700/20"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>Preguntas FAQ</span>
            </button>
            {profile?.is_admin && (
              <Link
                href="/dashboard/admin"
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-extrabold text-sm uppercase tracking-wide transition-all border border-red-100 hover:bg-red-50 text-red-600 cursor-pointer"
              >
                <Lock className="w-4 h-4 text-red-500" />
                <span>Superadmin</span>
              </Link>
            )}
          </nav>
        </div>

        {/* Logout at bottom of sidebar */}
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
        <header className="sticky top-0 z-40 bg-white border-b border-slate-100 px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile-only avatar trigger linking to profile */}
            <Link
              href={profile?.id ? `/dashboard/users/${profile.id}` : "#"}
              className="md:hidden flex items-center justify-center cursor-pointer active:scale-95 transition-transform shrink-0"
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.name}
                  className="w-8 h-8 rounded-full object-cover border border-violet-100"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-black text-xs">
                  {profile?.name?.[0]?.toUpperCase() || ""}
                </div>
              )}
            </Link>

            <div className="bg-violet-700 text-white px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-full inline-flex items-center gap-1.5 font-black tracking-tighter text-[11px] sm:text-sm border border-violet-850 shadow-sm select-none shrink-0">
              <span className="text-orange-400 hidden sm:inline">✦</span>
              <span>MUNDIALARIO</span>
              <span className="text-orange-400 hidden sm:inline">✦</span>
            </div>
          </div>

          {/* User profile header badge */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            <div className="bg-violet-50 border border-violet-100 rounded-full px-2.5 py-1 sm:px-4 sm:py-1.5 flex items-center gap-1 sm:gap-2 shadow-sm select-none shrink-0">
              <Trophy className="w-3.5 h-3.5 text-violet-700 animate-bounce" />
              <span className="text-[10px] sm:text-xs font-black text-violet-900 uppercase">
                {calculateTotalUserPoints()} pts
              </span>
            </div>

            <Link
              href={profile?.id ? `/dashboard/users/${profile.id}` : "#"}
              className="hidden md:flex items-center gap-2 select-none group cursor-pointer hover:opacity-90 transition-opacity"
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.name}
                  className="w-7 h-7 rounded-full object-cover border border-violet-100 group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-black text-xs group-hover:scale-105 transition-transform">
                  {profile?.name?.[0]?.toUpperCase() || ""}
                </div>
              )}
              <span className="text-sm font-extrabold text-slate-800 group-hover:text-violet-750 transition-colors">{profile?.name}</span>
              <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                {profile?.id}
              </span>
            </Link>

            <button
              onClick={handleLogout}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-600 transition-colors border border-red-100 cursor-pointer shadow-sm shrink-0"
              title="Cerrar Sesión"
            >
              <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </header>

        {/* DASHBOARD MAIN LAYOUT */}
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 md:py-10">

          {/* TABS VIEW CONTROLLER */}
          {activeTab === "predictions" && (
            <div className="space-y-6">
              {/* Header info */}
              <div className="bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 text-white p-6 rounded-3xl shadow-lg border border-violet-800 select-none flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <span className="bg-lime-400 text-slate-900 font-black text-[10px] tracking-wider uppercase px-3 py-1 rounded-full">
                    Juegos de las próximas Jornadas
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black uppercase mt-3 tracking-tight">
                    🔮 PRONOSTICA TUS GOLES
                  </h2>
                  <p className="text-white/70 text-xs sm:text-sm font-medium mt-1">
                    Guarda tus predicciones antes de que comiencen los partidos oficiales.
                  </p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm px-5 py-4 rounded-2xl border border-white/10 flex items-center gap-3 shrink-0">
                  <User className="w-6 h-6 text-lime-400" />
                  <div>
                    <p className="text-[10px] text-white/50 font-bold uppercase tracking-wider leading-none">Mi ID de Usuario</p>
                    <p className="font-extrabold text-sm mt-1">{profile?.id}</p>
                  </div>
                </div>
              </div>

              {/* Matches List split and grouped */}
              <div className="space-y-10">
                {matches.filter(m => !m.is_calculated).length === 0 ? (
                  <div className="bg-white border border-slate-100 rounded-3xl p-8 text-center text-slate-400 font-semibold select-none shadow-sm flex flex-col items-center gap-3">
                    <span className="text-xl">🙌</span>
                    <p>¡No hay partidos activos en este momento!</p>
                    <p className="text-xs text-slate-400">Todos los partidos han finalizado y han sido calculados.</p>
                  </div>
                ) : (
                  (() => {
                    const now = new Date();
                    const pendingMatches = matches.filter(m => !m.is_calculated && predictions[m.id] === undefined && now <= new Date(m.kickoff_time));
                    const predictedOrClosedMatches = matches.filter(m => !m.is_calculated && (predictions[m.id] !== undefined || now > new Date(m.kickoff_time)));

                    const groupMatchesByDate = (list: Match[]) => {
                      const grouped: Record<string, Match[]> = {};
                      list.forEach(m => {
                        const d = m.match_date;
                        if (!grouped[d]) grouped[d] = [];
                        grouped[d].push(m);
                      });
                      return grouped;
                    };

                    const renderMatchList = (list: Match[], sectionTitle: string, emptyMsg: string, themeColor: string) => {
                      if (list.length === 0) {
                        return (
                          <div className="bg-white border border-slate-100 rounded-3xl p-6 text-center text-slate-400 text-xs font-semibold shadow-sm">
                            {emptyMsg}
                          </div>
                        );
                      }

                      const grouped = groupMatchesByDate(list);

                      return (
                        <div className="space-y-6">
                          {Object.keys(grouped).sort().map(dateStr => {
                            const dayMatches = grouped[dateStr];
                            const dateObj = new Date(dateStr + "T00:00:00");
                            const formattedDay = dateObj.toLocaleDateString("es-ES", {
                              weekday: "long",
                              day: "numeric",
                              month: "long",
                            });
                            const capitalizedDay = formattedDay.charAt(0).toUpperCase() + formattedDay.slice(1);

                            return (
                              <div key={dateStr} className="space-y-4">
                                <h4 className={`text-xs font-black uppercase tracking-widest px-2 flex items-center gap-2 select-none ${themeColor}`}>
                                  <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
                                  <span>{capitalizedDay}</span>
                                </h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {dayMatches.map(match => {
                                    const pred = predictions[match.id] || { pred_a: 0, pred_b: 0, points: 0, penalty: 0 };
                                    const hasPrediction = predictions[match.id] !== undefined;
                                    const isUserPredictionReal = hasPrediction && pred.pred_a >= 0;
                                    const hasStarted = new Date() > new Date(match.kickoff_time);
                                    const isSaving = savingPredictionId === match.id;
                                    const dateFormatted = new Date(match.kickoff_time).toLocaleDateString("es-ES", {
                                      hour: "2-digit",
                                      minute: "2-digit"
                                    });

                                    return (
                                      <div
                                        key={match.id}
                                        className={`bg-white border rounded-3xl p-5 shadow-sm transition-all relative overflow-hidden flex flex-col justify-between gap-4 ${hasStarted ? "border-slate-100 bg-slate-50/50" : "border-slate-200 hover:border-slate-300"
                                          }`}
                                      >
                                        {/* Upper Info Row */}
                                        <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase tracking-wider select-none">
                                          <span className="flex items-center gap-1.5 font-extrabold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                            <Calendar className="w-3.5 h-3.5" />
                                            Hora: {dateFormatted}
                                          </span>
                                          {hasStarted ? (
                                            <span className="flex items-center gap-1 font-extrabold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100 uppercase">
                                              <Lock className="w-3 h-3" /> Cerrado
                                            </span>
                                          ) : (
                                            <span className="flex items-center gap-1 font-extrabold text-lime-700 bg-lime-50 px-2 py-0.5 rounded-full border border-lime-100 uppercase animate-pulse">
                                              Abierto
                                            </span>
                                          )}
                                        </div>

                                        {/* Match Predictor Board */}
                                        {!hasPrediction && !hasStarted ? (
                                          <>
                                            {/* Blurred Card representation */}
                                            <div className="relative py-3 flex flex-col items-center justify-center">
                                              <div className="flex w-full items-center justify-around blur-[6px] select-none pointer-events-none opacity-20">
                                                <div className="flex flex-col items-center gap-2 w-5/12 text-center">
                                                  <span className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight">
                                                    LOCAL TEAM
                                                  </span>
                                                  <span className="text-2xl font-black text-violet-950">0</span>
                                                </div>
                                                <span className="text-xl font-black">-</span>
                                                <div className="flex flex-col items-center gap-2 w-5/12 text-center">
                                                  <span className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight">
                                                    AWAY TEAM
                                                  </span>
                                                  <span className="text-2xl font-black text-violet-950">0</span>
                                                </div>
                                              </div>

                                              <div className="absolute inset-0 flex items-center justify-center">
                                                <button
                                                  onClick={() => handleStartPredictionFlow(match)}
                                                  className="px-5 py-2.5 bg-violet-700 hover:bg-violet-800 active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md transition-all cursor-pointer flex items-center gap-2 border border-violet-600 hover:shadow-lg"
                                                >
                                                  <Gamepad2 className="w-4 h-4 text-lime-400" />
                                                  <span>Hacer mi pronóstico</span>
                                                </button>
                                              </div>
                                            </div>

                                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-slate-400 text-[10px] font-bold select-none uppercase tracking-wider">
                                              <span>Pendiente</span>
                                              <span className="text-violet-700 bg-violet-50 px-2 py-0.5 rounded font-black flex items-center gap-1">
                                                ⏳ 15 Segundos
                                              </span>
                                            </div>
                                          </>
                                        ) : (
                                          <>
                                            {/* Unblurred Revealed/Started Board */}
                                            <div className="flex items-center justify-around py-2">
                                              <div className="flex flex-col items-center gap-2 w-5/12 text-center">
                                                {renderFlagCircle(match.team_a, "w-8 h-8 text-[11px]")}
                                                <span className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight">
                                                  {match.team_a}
                                                </span>
                                                <span className={`text-2xl font-black ${hasStarted ? "text-slate-400" : "text-violet-950"}`}>
                                                  {isUserPredictionReal ? pred.pred_a : "-"}
                                                </span>
                                              </div>

                                              <div className="flex flex-col items-center select-none font-bold text-slate-300">
                                                <span className="text-xl font-black">-</span>
                                              </div>

                                              <div className="flex flex-col items-center gap-2 w-5/12 text-center">
                                                {renderFlagCircle(match.team_b, "w-8 h-8 text-[11px]")}
                                                <span className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight">
                                                  {match.team_b}
                                                </span>
                                                <span className={`text-2xl font-black ${hasStarted ? "text-slate-400" : "text-violet-950"}`}>
                                                  {isUserPredictionReal ? pred.pred_b : "-"}
                                                </span>
                                              </div>
                                            </div>

                                            {/* Lower Action / Result Board */}
                                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                                              {hasStarted ? (
                                                <div className="flex items-center justify-between w-full">
                                                  <div className="text-xs font-semibold text-slate-500">
                                                    Real:{" "}
                                                    <strong className="text-slate-800 font-extrabold">
                                                      {match.score_a !== null && match.score_b !== null
                                                        ? `${match.score_a} - ${match.score_b}`
                                                        : "Pendiente"}
                                                    </strong>
                                                  </div>

                                                  <div className="flex flex-col items-end">
                                                    <div className="flex items-center gap-1.5 bg-violet-100 text-violet-800 px-3 py-1 rounded-full text-xs font-black">
                                                      <Trophy className="w-3.5 h-3.5 text-violet-700" />
                                                      <span>{pred.points || 0} pts</span>
                                                    </div>
                                                    {pred.penalty > 0 && (
                                                      <span className="text-[9px] text-red-500 font-bold mt-0.5">
                                                        -{pred.penalty} pts modif.
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                              ) : (
                                                <button
                                                  onClick={() => handleStartPredictionFlow(match)}
                                                  disabled={isSaving}
                                                  className="w-full flex justify-center items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs py-2.5 rounded-2xl shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                                                >
                                                  <Lock className="w-3.5 h-3.5 text-white/80" />
                                                  <span>{isSaving ? "Guardando..." : "Modificar Pronóstico (-3 pts)"}</span>
                                                </button>
                                              )}
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    };

                    return (
                      <div className="space-y-10">
                        {/* Section 1: Pending Predictions */}
                        <div className="space-y-4">
                          <h3 className="text-sm font-black text-violet-950 uppercase tracking-wide bg-violet-100 px-4 py-2 rounded-2xl inline-block select-none">
                            🔮 Pendientes por Pronosticar
                          </h3>
                          {renderMatchList(pendingMatches, "Pendientes", "¡Estás al día! No tienes partidos pendientes por pronosticar. ⚽", "text-violet-700")}
                        </div>

                        {/* Section 2: Predicted or Closed Predictions */}
                        <div className="space-y-4">
                          <h3 className="text-sm font-black text-orange-950 uppercase tracking-wide bg-orange-100 px-4 py-2 rounded-2xl inline-block select-none">
                            ✅ Pronósticos Registrados / Cerrados
                          </h3>
                          {renderMatchList(predictedOrClosedMatches, "Registrados", "No tienes pronósticos guardados todavía.", "text-orange-600")}
                        </div>

                        {/* Ver historial de resultados Button */}
                        <div className="pt-8 border-t border-slate-200 flex justify-center select-none">
                          <button
                            onClick={() => setActiveTab("history")}
                            className="px-8 py-4 bg-white border-2 border-violet-700 text-violet-700 hover:bg-violet-50 font-black text-sm rounded-full shadow-md hover:shadow-lg transition-all hover:scale-105 inline-flex items-center gap-2 cursor-pointer"
                          >
                            <Trophy className="w-4.5 h-4.5 text-violet-700 animate-pulse" />
                            <span>Ver historial de resultados</span>
                          </button>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            </div>
          )}

          {activeTab === "history" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Header info */}
              <div className="bg-gradient-to-r from-violet-700 to-purple-600 text-white p-6 rounded-3xl shadow-lg border border-violet-800 select-none">
                <span className="bg-lime-400 text-violet-950 font-black text-[10px] tracking-wider uppercase px-3 py-1 rounded-full">
                  Historial
                </span>
                <h2 className="text-2xl sm:text-3xl font-black uppercase mt-3 tracking-tight">
                  📜 HISTORIAL DE RESULTADOS
                </h2>
                <p className="text-white/80 text-xs sm:text-sm font-medium mt-1">
                  Compara tus pronósticos con los resultados finales oficiales del Mundial.
                </p>
              </div>

              {/* Calculated matches list */}
              <div className="space-y-6">
                {(() => {
                  const calculatedMatches = matches.filter(m => m.is_calculated);

                  if (calculatedMatches.length === 0) {
                    return (
                      <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center text-slate-400 font-semibold shadow-sm select-none">
                        Aún no se han completado ni calculado partidos del torneo. ¡Pronto verás tus resultados aquí! ⚽
                      </div>
                    );
                  }

                  // Group by date
                  const grouped: Record<string, Match[]> = {};
                  calculatedMatches.forEach(m => {
                    const d = m.match_date;
                    if (!grouped[d]) grouped[d] = [];
                    grouped[d].push(m);
                  });

                  return (
                    <div className="space-y-8">
                      {Object.keys(grouped).sort().reverse().map(dateStr => {
                        const dayMatches = grouped[dateStr];
                        const dateObj = new Date(dateStr + "T00:00:00");
                        const formattedDay = dateObj.toLocaleDateString("es-ES", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        });
                        const capitalizedDay = formattedDay.charAt(0).toUpperCase() + formattedDay.slice(1);

                        return (
                          <div key={dateStr} className="space-y-4">
                            <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest px-2 flex items-center gap-2 select-none">
                              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                              <span>{capitalizedDay}</span>
                            </h4>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {dayMatches.map(match => {
                                const pred = predictions[match.id];
                                const hasPrediction = pred !== undefined;

                                // Calculate local match points logic dynamically in frontend for showing breakdown details
                                const calculateDetailPoints = () => {
                                  if (!hasPrediction) return { points: 0, hasTendency: false, hasDiff: false, hasLocalG: false, hasVisitorG: false };
                                  let points = 0;
                                  const rA = match.score_a || 0;
                                  const rB = match.score_b || 0;
                                  const pA = pred.pred_a;
                                  const pB = pred.pred_b;

                                  const realDiff = rA - rB;
                                  const predDiff = pA - pB;
                                  const realResult = realDiff > 0 ? "A" : realDiff < 0 ? "B" : "TIE";
                                  const predResult = predDiff > 0 ? "A" : predDiff < 0 ? "B" : "TIE";

                                  if (realResult === predResult) {
                                    points += 2;
                                    if (realDiff === predDiff) points += 1;
                                  }
                                  if (pA === rA) points += 1;
                                  if (pB === rB) points += 1;
                                  return {
                                    points,
                                    hasTendency: realResult === predResult,
                                    hasDiff: realResult === predResult && realDiff === predDiff,
                                    hasLocalG: pA === rA,
                                    hasVisitorG: pB === rB
                                  };
                                };

                                const details = calculateDetailPoints();
                                const earnedPoints = hasPrediction ? pred.points : 0;
                                const penaltyPoints = hasPrediction ? (pred.penalty || 0) : 0;

                                return (
                                  <div
                                    key={match.id}
                                    className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4 hover:shadow-md transition-all"
                                  >
                                    {/* Header info */}
                                    <div className="flex justify-between items-center text-[10px] font-bold uppercase select-none tracking-wider text-slate-400">
                                      <span>Partido Finalizado</span>
                                      <span className="text-lime-700 bg-lime-50 px-2 py-0.5 rounded border border-lime-100 flex items-center gap-1 font-extrabold uppercase">
                                        Calculado
                                      </span>
                                    </div>

                                    {/* Comparison Grid */}
                                    <div className="grid grid-cols-3 gap-2 items-center py-2 select-none">
                                      {/* Team A */}
                                      <div className="flex flex-col items-center gap-1 text-center min-w-0">
                                        {renderFlagCircle(match.team_a, "w-6 h-6 text-[10px]")}
                                        <span className="font-extrabold text-sm text-slate-800 truncate w-full">
                                          {match.team_a}
                                        </span>
                                        <div className="flex flex-col items-center">
                                          <span className="text-slate-400 text-[9px] font-bold uppercase">Pronóstico</span>
                                          <span className="text-sm font-black text-slate-500">{hasPrediction && pred.pred_a >= 0 ? pred.pred_a : "-"}</span>
                                        </div>
                                      </div>

                                      {/* Score display */}
                                      <div className="flex flex-col items-center justify-center gap-1 shrink-0">
                                        <span className="text-[10px] text-slate-400 font-extrabold uppercase">Real</span>
                                        <div className="bg-slate-100 border border-slate-200 px-3 py-1 rounded-2xl font-black text-slate-800 text-lg sm:text-xl">
                                          {match.score_a} - {match.score_b}
                                        </div>
                                      </div>

                                      {/* Team B */}
                                      <div className="flex flex-col items-center gap-1 text-center min-w-0">
                                        {renderFlagCircle(match.team_b, "w-6 h-6 text-[10px]")}
                                        <span className="font-extrabold text-sm text-slate-800 truncate w-full">
                                          {match.team_b}
                                        </span>
                                        <div className="flex flex-col items-center">
                                          <span className="text-slate-400 text-[9px] font-bold uppercase">Pronóstico</span>
                                          <span className="text-sm font-black text-slate-500">{hasPrediction && pred.pred_b >= 0 ? pred.pred_b : "-"}</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Score breakdown */}
                                    <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                      {hasPrediction && pred.pred_a >= 0 ? (
                                        <>
                                          {/* Points and Penalties */}
                                          <div className="flex items-center gap-2">
                                            <span className="bg-violet-100 text-violet-800 px-3 py-1 rounded-full font-black text-xs inline-flex items-center gap-1">
                                              <Trophy className="w-3.5 h-3.5 text-violet-700" />
                                              <span>+{earnedPoints} pts ganados</span>
                                            </span>
                                            {penaltyPoints > 0 && (
                                              <span className="bg-red-50 text-red-600 px-2.5 py-1 rounded-full font-extrabold text-[10px] border border-red-100">
                                                Modif: -{penaltyPoints} pts
                                              </span>
                                            )}
                                          </div>

                                          {/* Breakdown items tooltip style details */}
                                          <div className="text-[9px] text-slate-400 font-bold uppercase space-y-0.5 text-right">
                                            <div>Tendencia: {details.hasTendency ? "✅ +2" : "❌"}</div>
                                            <div>Dif. Goles: {details.hasDiff ? "✅ +1" : "❌"}</div>
                                            <div>Goles exactos: {(details.hasLocalG ? 1 : 0) + (details.hasVisitorG ? 1 : 0)}/2</div>
                                          </div>
                                        </>
                                      ) : (
                                        <div className="flex items-center justify-center gap-2 w-full py-1">
                                          <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full font-black text-xs inline-flex items-center gap-1 border border-red-100">
                                            <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                                            <span>Sin Pronóstico (-1 pt de penalización)</span>
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {activeTab === "leagues" && (
            <div className="space-y-8 animate-in fade-in duration-200">
              {/* Header info */}
              <div className="bg-gradient-to-r from-violet-700 to-purple-600 text-white p-6 rounded-3xl shadow-lg border border-violet-800 select-none">
                <span className="bg-lime-400 text-violet-950 font-black text-[10px] tracking-wider uppercase px-3 py-1 rounded-full">
                  Competencia en Ligas
                </span>
                <h2 className="text-2xl sm:text-3xl font-black uppercase mt-3 tracking-tight">
                  🏆 MIS LIGAS Y GRUPOS
                </h2>
                <p className="text-white/80 text-xs sm:text-sm font-medium mt-1">
                  Crea tu grupo de amigos o únete a una liga existente usando un código de invitación.
                </p>
              </div>

              {/* Tab switcher inside leagues tab */}
              <div className="flex border-b border-slate-200 select-none">
                <button
                  type="button"
                  onClick={() => setLeaguesViewMode("my-leagues")}
                  className={`flex-1 py-3.5 text-center font-extrabold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center justify-center gap-2 cursor-pointer ${leaguesViewMode === "my-leagues"
                    ? "border-violet-700 text-violet-700 font-black"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                    }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Mis Ligas</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLeaguesViewMode("ligaverso")}
                  className={`flex-1 py-3.5 text-center font-extrabold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center justify-center gap-2 cursor-pointer ${leaguesViewMode === "ligaverso"
                    ? "border-violet-700 text-violet-700 font-black"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                    }`}
                >
                  <Globe className="w-4 h-4" />
                  <span>LigaVerso 🌌</span>
                </button>
              </div>

              {/* View 1: My Leagues */}
              {leaguesViewMode === "my-leagues" && (
                <div className="space-y-8">
                  {/* My Leagues List */}
                  <div className="space-y-4 select-none">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Mis Grupos y Ligas Activas</h3>

                    {leagues.length === 0 ? (
                      <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center text-slate-400 font-semibold shadow-sm">
                        Aún no formas parte de ninguna liga. ¡Crea una o únete a tus amigos!
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {leagues.map(league => {
                          const isExpanded = expandedLeagueId === league.id;
                          const members = leagueMembers[league.id] || [];

                          return (
                            <div
                              key={league.id}
                              className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm"
                            >
                              {/* Collapsed summary bar */}
                              <div
                                onClick={() => toggleLeagueDetails(league.id)}
                                className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-slate-50/50 transition-colors cursor-pointer select-none"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 min-w-0">
                                  <span className="font-extrabold text-slate-800 text-sm sm:text-base uppercase tracking-tight truncate">
                                    ⚡ {league.name}
                                  </span>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="bg-slate-100 text-slate-600 font-extrabold text-[10px] px-2 py-0.5 rounded border border-slate-200 select-none uppercase tracking-wider">
                                      Código: {league.invite_code}
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        copyToClipboard(league.invite_code);
                                      }}
                                      className="p-1 rounded bg-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-200 transition-all cursor-pointer"
                                      title="Copiar código"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </button>
                                    {copiedCode === league.invite_code && (
                                      <span className="text-[9px] text-lime-600 font-black uppercase tracking-wider">¡Copiado!</span>
                                    )}
                                    {league.is_public && (
                                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 font-extrabold text-[8px] px-1.5 py-0.2 rounded-full uppercase tracking-wider select-none">
                                        🌍 Pública
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto shrink-0" onClick={e => e.stopPropagation()}>
                                  <Link
                                    href={`/dashboard/leagues/${league.id}`}
                                    className="text-xs bg-violet-100 hover:bg-violet-200 text-violet-800 font-black px-4 py-2 rounded-full transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
                                  >
                                    <span>Detalle y Trash Talk</span>
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  </Link>
                                  <button
                                    onClick={() => toggleLeagueDetails(league.id)}
                                    className="p-2 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-all cursor-pointer flex items-center justify-center border border-slate-100"
                                    title="Ver Tabla rápida"
                                  >
                                    {isExpanded ? <ChevronDown className="w-4 h-4 text-violet-700" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                                  </button>
                                </div>
                              </div>

                              {/* Expanded details (Leaderboard of the league) */}
                              {isExpanded && (
                                <div className="border-t border-slate-100 bg-slate-50/50 p-4 sm:p-6 animate-in slide-in-from-top-2 duration-150">
                                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Leaderboard de Liga</h4>
                                  {members.length === 0 ? (
                                    <p className="text-xs text-slate-400 font-bold text-center py-4">Cargando clasificación de liga...</p>
                                  ) : (
                                    <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-sm">
                                      <table className="w-full text-left border-collapse text-xs sm:text-sm">
                                        <thead>
                                          <tr className="border-b border-slate-200 text-slate-400 uppercase font-black text-[9px] sm:text-[10px] tracking-wider bg-slate-100/50">
                                            <th className="py-2.5 px-4 text-center w-12">Pos</th>
                                            <th className="py-2.5 px-3">Nombre</th>
                                            <th className="py-2.5 px-4 text-right w-24">Puntos</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                          {members.map((member, index) => {
                                            const isMe = member.id === profile?.id;
                                            return (
                                              <tr
                                                key={member.id}
                                                className={`hover:bg-slate-50/50 transition-colors ${isMe ? "bg-violet-50/40 font-bold" : ""
                                                  }`}
                                              >
                                                <td className="py-2.5 px-4 text-center font-black text-slate-500">
                                                  {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                                                </td>
                                                <td className="py-2.5 px-3 text-slate-800">
                                                  <Link
                                                    href={`/dashboard/users/${member.id}`}
                                                    className="hover:text-violet-700 hover:underline transition-all cursor-pointer font-extrabold"
                                                  >
                                                    {member.name}
                                                  </Link>{" "}
                                                  {isMe && <span className="text-[9px] bg-violet-200 text-violet-800 font-extrabold px-1.5 py-0.2 rounded uppercase">Tú</span>}
                                                  <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider">{member.id}</span>
                                                </td>
                                                <td className="py-2.5 px-4 text-right font-black text-slate-900">
                                                  {member.points}
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Notification messages */}
                  {(formError || formSuccess) && (
                    <div className="p-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 select-none border">
                      {formError ? (
                        <div className="text-red-700 bg-red-50 border-red-100 flex items-center gap-2 w-full">
                          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                          <span>{formError}</span>
                        </div>
                      ) : (
                        <div className="text-lime-800 bg-lime-50 border-lime-100 flex items-center gap-2 w-full">
                          <CheckCircle className="w-5 h-5 text-lime-600 shrink-0" />
                          <span>{formSuccess}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Forms grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Create League */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                      <div>
                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-2">Crear nueva liga</h3>
                        <p className="text-xs text-slate-400 mb-4 font-semibold">
                          Se generará un código único para que compartas con tus amigos.
                        </p>
                      </div>
                      <form onSubmit={handleCreateLeague} className="space-y-4">
                        <input
                          type="text"
                          required
                          placeholder="Ej. Liga de la Oficina"
                          value={newLeagueName}
                          onChange={e => setNewLeagueName(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm font-semibold transition-all"
                        />
                        <div className="flex items-center gap-2 pt-1 select-none">
                          <input
                            type="checkbox"
                            id="isPublicLeague"
                            checked={isPublicLeagueInput}
                            onChange={e => setIsPublicLeagueInput(e.target.checked)}
                            className="rounded border-slate-300 text-violet-600 focus:ring-violet-500 w-4 h-4 cursor-pointer"
                          />
                          <label htmlFor="isPublicLeague" className="text-xs text-slate-600 font-semibold cursor-pointer">
                            ¿Hacer esta liga pública? (Aparecerá en el LigaVerso y se podrá unir culquier persona sin invitación)
                          </label>
                        </div>
                        <button
                          type="submit"
                          className="w-full flex justify-center items-center py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-violet-700 hover:bg-violet-800 shadow-md hover:shadow-lg transition-all cursor-pointer"
                        >
                          Crear Liga
                        </button>
                      </form>
                    </div>

                    {/* Join League */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                      <div>
                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-2">Unirse a una liga</h3>
                        <p className="text-xs text-slate-400 mb-4 font-semibold">
                          Ingresa el código corto de 6 caracteres que te compartieron.
                        </p>
                      </div>
                      <form onSubmit={handleJoinLeague} className="space-y-4">
                        <input
                          type="text"
                          required
                          maxLength={6}
                          placeholder="Ej. LGA-A7B2"
                          value={inviteCodeInput}
                          onChange={e => setInviteCodeInput(e.target.value.toUpperCase())}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm font-semibold transition-all uppercase tracking-widest text-center"
                        />
                        <button
                          type="submit"
                          className="w-full flex justify-center items-center py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider text-violet-950 bg-lime-400 hover:bg-lime-500 shadow-md hover:shadow-lg transition-all cursor-pointer"
                        >
                          Unirse a Liga
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {/* View 2: LigaVerso */}
              {leaguesViewMode === "ligaverso" && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-violet-700 to-indigo-600 text-white p-5 rounded-3xl shadow-md border border-violet-800 select-none">
                    <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                      <Globe className="w-4 h-4 text-lime-400" />
                      <span>Ligas Públicas Disponibles</span>
                    </h3>
                    <p className="text-white/80 text-[11px] font-semibold mt-1">
                      Únete directamente a cualquier grupo de la comunidad y compite. ¡No necesitas código de invitación!
                    </p>
                  </div>

                  {/* Notification messages in LigaVerso */}
                  {(formError || formSuccess) && (
                    <div className="p-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 select-none border">
                      {formError ? (
                        <div className="text-red-700 bg-red-50 border-red-100 flex items-center gap-2 w-full">
                          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                          <span>{formError}</span>
                        </div>
                      ) : (
                        <div className="text-lime-800 bg-lime-50 border-lime-100 flex items-center gap-2 w-full">
                          <CheckCircle className="w-5 h-5 text-lime-600 shrink-0" />
                          <span>{formSuccess}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {isLoadingPublicLeagues ? (
                    <div className="flex justify-center items-center py-12 bg-white border border-slate-200 rounded-3xl shadow-sm">
                      <Loader2 className="w-8 h-8 text-violet-700 animate-spin" />
                    </div>
                  ) : publicLeagues.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center text-slate-400 font-semibold shadow-sm select-none">
                      No hay ligas públicas disponibles para unirse en este momento. ¡Crea una tú y hazla pública!
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {publicLeagues.map((pl: any) => (
                        <div
                          key={pl.id}
                          className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col justify-between gap-4 hover:border-slate-300 hover:shadow-md transition-all"
                        >
                          <div>
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 font-extrabold text-[8px] px-2 py-0.5 rounded-full uppercase tracking-wider select-none">
                              🌍 Pública
                            </span>
                            <h4 className="font-extrabold text-sm sm:text-base text-slate-800 uppercase tracking-tight mt-2 truncate">
                              🏆 {pl.name}
                            </h4>
                            <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">
                              ID: {pl.id}
                            </p>
                          </div>

                          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                            <span className="bg-slate-100 text-slate-600 font-extrabold text-[10px] px-2.5 py-1 rounded-full uppercase">
                              👥 {pl.member_count} {pl.member_count === 1 ? "miembro" : "miembros"}
                            </span>
                            <button
                              onClick={() => handleJoinPublicLeague(pl.id)}
                              disabled={isJoiningPublicId === pl.id}
                              className="px-4 py-2 bg-violet-700 hover:bg-violet-800 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-xs transition-all active:scale-[0.98] cursor-pointer inline-flex items-center gap-1.5"
                            >
                              {isJoiningPublicId === pl.id ? (
                                <Loader2 className="w-3 h-3 animate-spin text-white" />
                              ) : (
                                <Plus className="w-3 h-3 text-lime-400" />
                              )}
                              <span>Unirse</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "ranking" && (
            <div className="space-y-6 animate-in fade-in duration-200 select-none">
              {/* Header info */}
              <div className="bg-gradient-to-r from-orange-600 to-orange-500 text-white p-6 rounded-3xl shadow-lg border border-orange-700 select-none">
                <span className="bg-white/20 text-white font-black text-[10px] tracking-wider uppercase px-3 py-1 rounded-full">
                  Posiciones por Liga
                </span>
                <h2 className="text-2xl sm:text-3xl font-black uppercase mt-3 tracking-tight">
                  📊 TABLA DE POSICIONES
                </h2>
                <p className="text-white/80 text-xs sm:text-sm font-medium mt-1">
                  Compara tu rendimiento en cada una de las ligas a las que perteneces.
                </p>
              </div>

              {leagues.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center text-slate-400 font-semibold shadow-sm select-none">
                  Aún no participas en ninguna liga para ver rankings. ¡Únete o crea una en la sección de Ligas! ⚽
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Selector de Liga */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <label htmlFor="rankingLeagueSelect" className="text-xs font-black text-slate-500 uppercase tracking-wider">
                      Selecciona una Liga:
                    </label>
                    <select
                      id="rankingLeagueSelect"
                      value={selectedRankingLeagueId || ""}
                      onChange={(e) => setSelectedRankingLeagueId(e.target.value)}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs font-black uppercase tracking-wider"
                    >
                      {leagues.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Standings table for selected league */}
                  {selectedRankingLeagueId && (
                    <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                      <div className="bg-slate-100/60 border-b border-slate-200 px-6 py-4 flex items-center justify-between text-slate-500 text-xs font-extrabold uppercase tracking-wider">
                        <span>Integrantes de la Liga</span>
                        <span className="bg-slate-200/80 text-slate-700 px-3 py-1 rounded-full font-black text-[10px] uppercase">
                          {leagues.find(l => l.id === selectedRankingLeagueId)?.name || "Clasificación"}
                        </span>
                      </div>

                      {!(leagueMembers[selectedRankingLeagueId]) || leagueMembers[selectedRankingLeagueId].length === 0 ? (
                        <div className="p-8 text-center text-slate-400 font-bold flex flex-col items-center justify-center gap-2">
                          <Loader2 className="w-6 h-6 text-violet-700 animate-spin" />
                          <span>Cargando posiciones de la liga...</span>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs sm:text-sm">
                            <thead>
                              <tr className="border-b border-slate-200 text-slate-400 uppercase font-black text-[10px] tracking-wider bg-slate-100/30">
                                <th className="py-3 px-6 text-center w-16">Pos</th>
                                <th className="py-3 px-4">Usuario</th>
                                <th className="py-3 px-6 text-right w-32">Puntos Totales</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {leagueMembers[selectedRankingLeagueId].map((user, index) => {
                                const isMe = user.id === profile?.id;
                                return (
                                  <tr
                                    key={user.id}
                                    className={`hover:bg-slate-50/50 transition-colors ${isMe ? "bg-violet-50/40 font-bold" : ""}`}
                                  >
                                    <td className="py-3.5 px-6 text-center font-black text-slate-800 text-sm">
                                      {index === 0 ? "🥇 1" : index === 1 ? "🥈 2" : index === 2 ? "🥉 3" : index + 1}
                                    </td>
                                    <td className="py-3.5 px-4 font-bold text-slate-900">
                                      <div className="flex items-center gap-2">
                                        {user.avatar_url ? (
                                          <img
                                            src={user.avatar_url}
                                            alt={user.name}
                                            className="w-6 h-6 rounded-full object-cover border border-violet-100"
                                          />
                                        ) : (
                                          <div className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-black text-[9px]">
                                            {user.name?.[0]?.toUpperCase() || ""}
                                          </div>
                                        )}
                                        <Link
                                          href={`/dashboard/users/${user.id}`}
                                          className="hover:text-violet-700 hover:underline transition-all cursor-pointer font-extrabold"
                                        >
                                          {user.name}
                                        </Link>
                                        {isMe && (
                                          <span className="ml-1 bg-violet-200 text-violet-800 font-black text-[9px] px-2 py-0.5 rounded uppercase">
                                            Tú
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-3.5 px-6 text-right font-black text-violet-700 text-base">
                                      {user.points} pts
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "faq" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Header info */}
              <div className="bg-gradient-to-r from-violet-700 to-indigo-600 text-white p-6 rounded-3xl shadow-lg select-none">
                <span className="bg-lime-400 text-violet-950 font-black text-[10px] tracking-wider uppercase px-3 py-1 rounded-full">
                  Soporte
                </span>
                <h2 className="text-2xl sm:text-3xl font-black uppercase mt-3 tracking-tight">
                  ❓ PREGUNTAS FRECUENTES
                </h2>
                <p className="text-white/80 text-xs sm:text-sm font-medium mt-1">
                  Aprende cómo funciona el cálculo de puntos y la dinámica de las ligas compartidas.
                </p>
              </div>

              {/* Accordion mockup */}
              <div className="space-y-4 select-none">
                {[
                  {
                    q: "¿Hasta qué hora puedo ingresar o modificar mis predicciones?",
                    a: "Tienes plazo hasta la hora del pitazo inicial (kickoff_time) de cada partido. El registro inicial de tu marcador es gratuito, pero si decides modificar una predicción ya enviada antes del inicio, tiene un costo de canje de 3 puntos de penalización."
                  },
                  {
                    q: "¿Qué sucede si olvido ingresar mi pronóstico para un partido?",
                    a: "Si no haces una predicción y el partido comienza (pasada la hora de inicio), al calcular los resultados del encuentro se te restará automáticamente 1 punto (-1 pt) de tu puntuación total."
                  },
                  {
                    q: "¿Cómo funciona la puntuación acumulativa de 5 puntos?",
                    a: "Recibes 2 puntos por tendencia (acertar ganador o empate). Si aciertas tendencia, obtienes +1 punto por diferencia exacta de goles. Adicionalmente, recibes +1 punto por cada gol exacto de cada equipo (tanto para el local como el visitante)."
                  },
                  {
                    q: "¿Las ligas compartidas tienen un límite de participantes?",
                    a: "¡Ninguno! Puedes crear ligas de forma ilimitada y compartir el código de 6 caracteres con todos los amigos que quieras. La tabla de posiciones se actualizará en tiempo real para todos."
                  },
                  {
                    q: "¿Cuándo se calculan los puntos de las jornadas?",
                    a: "Los puntos se calculan automáticamente unas horas después de finalizado cada partido. El sistema procesa los marcadores reales y actualiza inmediatamente las posiciones globales y las de tus ligas."
                  }
                ].map((faq, index) => (
                  <div
                    key={index}
                    className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-2"
                  >
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-800 leading-tight">
                      {faq.q}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
                      {faq.a}
                    </p>
                  </div>
                ))}
              </div>

              {/* FOOTER DE MUNDIALARIO BY BREINAKOSLAB */}
              <footer className="bg-white border border-slate-200 rounded-3xl p-6 mt-12 select-none shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex flex-col items-center sm:items-start gap-1">
                  <div className="bg-violet-700 text-white px-4 py-1.5 rounded-full inline-flex items-center gap-2 font-black tracking-tighter text-xs border border-violet-850 shadow-sm">
                    <span className="text-orange-400">✦</span>
                    <span>MUNDIALARIO</span>
                    <span className="text-orange-400">✦</span>
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center sm:text-left mt-1">
                    Mundialario By <span className="text-violet-700 hover:text-violet-800 transition-colors cursor-pointer font-black font-sans">BreinakosLab</span>
                  </p>
                </div>

                <div className="text-center sm:text-right">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    Creado por el equipo de<span className="text-violet-700 font-black font-sans">BreinakosLab</span>.
                  </p>
                </div>
              </footer>

            </div>
          )}

        </main>
      </div>

      {/* MOBILE STICKY BOTTOM NAVIGATION BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-50 w-full bg-white/95 backdrop-blur-sm border-t border-slate-100 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] py-2.5 px-6 flex justify-between items-center md:hidden select-none">

        {/* Play (Jugar) */}
        <button
          onClick={() => setActiveTab("predictions")}
          className="flex flex-col items-center gap-1 group cursor-pointer"
        >
          <Gamepad2 className={`w-5 h-5 transition-colors ${activeTab === "predictions" ? "text-violet-700" : "text-slate-400"}`} />
          <span className={`text-[10px] font-black uppercase tracking-wider ${activeTab === "predictions" ? "text-violet-700" : "text-slate-400"}`}>
            Jugar
          </span>
        </button>

        {/* Groups (Ligas) */}
        <button
          onClick={() => setActiveTab("leagues")}
          className="flex flex-col items-center gap-1 group cursor-pointer"
        >
          <Users className={`w-5 h-5 transition-colors ${activeTab === "leagues" ? "text-violet-700" : "text-slate-400"}`} />
          <span className={`text-[10px] font-black uppercase tracking-wider ${activeTab === "leagues" ? "text-violet-700" : "text-slate-400"}`}>
            Ligas
          </span>
        </button>

        {/* Ranking */}
        <button
          onClick={() => setActiveTab("ranking")}
          className="flex flex-col items-center gap-1 group cursor-pointer"
        >
          <Trophy className={`w-5 h-5 transition-colors ${activeTab === "ranking" ? "text-violet-700" : "text-slate-400"}`} />
          <span className={`text-[10px] font-black uppercase tracking-wider ${activeTab === "ranking" ? "text-violet-700" : "text-slate-400"}`}>
            Ranking
          </span>
        </button>

        {/* Historial */}
        <button
          onClick={() => setActiveTab("history")}
          className="flex flex-col items-center gap-1 group cursor-pointer"
        >
          <Calendar className={`w-5 h-5 transition-colors ${activeTab === "history" ? "text-violet-700" : "text-slate-400"}`} />
          <span className={`text-[10px] font-black uppercase tracking-wider ${activeTab === "history" ? "text-violet-700" : "text-slate-400"}`}>
            Historial
          </span>
        </button>

        {/* FAQs */}
        <button
          onClick={() => setActiveTab("faq")}
          className="flex flex-col items-center gap-1 group cursor-pointer"
        >
          <HelpCircle className={`w-5 h-5 transition-colors ${activeTab === "faq" ? "text-violet-700" : "text-slate-400"}`} />
          <span className={`text-[10px] font-black uppercase tracking-wider ${activeTab === "faq" ? "text-violet-700" : "text-slate-400"}`}>
            Ayuda
          </span>
        </button>

      </div>

      {/* TIMED PREDICTION MODAL */}
      {activeMatchForPrediction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md px-4 select-none animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col justify-between animate-in zoom-in-95 duration-200">
            {/* Timer visual progress bar */}
            <div className="w-full h-2 bg-slate-100 relative">
              <div
                className="h-full bg-red-500 transition-all duration-1000 ease-linear"
                style={{ width: `${(predictionTimer / 15) * 100}%` }}
              ></div>
            </div>

            {/* Content container */}
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                  <Gamepad2 className="w-4 h-4 text-violet-700 animate-bounce" />
                  <span>Registrar Pronóstico</span>
                </h3>
                <span className="bg-red-50 text-red-600 border border-red-100 font-black text-xs px-3 py-1 rounded-full animate-pulse flex items-center gap-1">
                  ⏳ {predictionTimer}s
                </span>
              </div>

              {/* Teams Details */}
              <div className="flex items-center justify-around py-4">
                {/* Team A */}
                <div className="flex flex-col items-center gap-2 w-5/12 text-center">
                  {renderFlagCircle(activeMatchForPrediction.team_a, "w-10 h-10 text-xs mb-1")}
                  <span className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight">
                    {activeMatchForPrediction.team_a}
                  </span>
                  <div className="flex items-center gap-2 mt-2 justify-center">
                    <button
                      onClick={() => setPredScoreA(prev => Math.max(0, prev - 1))}
                      className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all active:scale-90 cursor-pointer"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-3xl font-black w-10 text-center text-violet-950">
                      {predScoreA}
                    </span>
                    <button
                      onClick={() => setPredScoreA(prev => prev + 1)}
                      className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all active:scale-90 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <span className="text-2xl font-black text-slate-300">-</span>

                {/* Team B */}
                <div className="flex flex-col items-center gap-2 w-5/12 text-center">
                  {renderFlagCircle(activeMatchForPrediction.team_b, "w-10 h-10 text-xs mb-1")}
                  <span className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight">
                    {activeMatchForPrediction.team_b}
                  </span>
                  <div className="flex items-center gap-2 mt-2 justify-center">
                    <button
                      onClick={() => setPredScoreB(prev => Math.max(0, prev - 1))}
                      className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all active:scale-90 cursor-pointer"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-3xl font-black w-10 text-center text-violet-950">
                      {predScoreB}
                    </span>
                    <button
                      onClick={() => setPredScoreB(prev => prev + 1)}
                      className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all active:scale-90 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 font-semibold text-center mt-2 leading-tight">
                Al expirar los 15 segundos, se guardará automáticamente con el marcador actual.
              </p>
            </div>

            {/* Footer Actions */}
            <div className="bg-slate-50 px-6 py-4 flex gap-3 border-t border-slate-100">
              <button
                onClick={handleSaveTimedPrediction}
                className="w-full flex justify-center items-center gap-2 bg-violet-700 hover:bg-violet-800 text-white font-extrabold text-xs py-3 rounded-2xl shadow-sm transition-all active:scale-[0.98] cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Guardar Pronóstico</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PENALTY CONFIRMATION MODAL */}
      {showConfirmPenaltyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md px-4 select-none animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm shadow-2xl p-6 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center gap-3 text-center">
              <AlertCircle className="w-12 h-12 text-orange-500 animate-bounce" />
              <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">
                ¿Modificar Pronóstico?
              </h3>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                Modificar este pronóstico te costará <strong className="text-orange-600 font-black">3 puntos</strong> como pago. El costo se descontará de tu puntaje acumulado actual.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowConfirmPenaltyModal(null)}
                className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 font-extrabold text-xs rounded-xl uppercase tracking-wider transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmPenaltyPayAndModify}
                className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs rounded-xl uppercase tracking-wider shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                Pagar y Modificar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SHARE LEAGUE MODAL */}
      {createdLeagueShare && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md px-4 select-none animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm shadow-2xl p-6 space-y-6 animate-in zoom-in-95 duration-200 relative">
            {/* Close button */}
            <button
              onClick={() => setCreatedLeagueShare(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header info */}
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-full bg-lime-100 border border-lime-200 flex items-center justify-center text-lime-700 shadow-sm animate-bounce">
                <Share2 className="w-6 h-6 text-lime-600" />
              </div>
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                ¡Liga Creada con Éxito! 🎉
              </h3>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                ¡Tu grupo <strong className="text-violet-700">"{createdLeagueShare.name}"</strong> está listo! Comparte el código con tus amigos para empezar a jugar.
              </p>
            </div>

            {/* Invite Code Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center gap-2">
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Código de Invitación</span>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-black text-violet-950 tracking-wider">
                  {createdLeagueShare.inviteCode}
                </span>
                <button
                  onClick={() => copyToClipboard(createdLeagueShare.inviteCode)}
                  className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-700 transition-all cursor-pointer shadow-xs active:scale-95"
                  title="Copiar Código"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              {copiedCode === createdLeagueShare.inviteCode && (
                <span className="text-[9px] text-lime-600 font-black uppercase tracking-wider">¡Código copiado!</span>
              )}
            </div>

            {/* Sharing buttons */}
            <div className="space-y-3">
              {/* WhatsApp Share Button */}
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                  `¡Únete a mi liga "${createdLeagueShare.name}" en Mundialario! 🏆⚽\nCódigo de invitación: ${createdLeagueShare.inviteCode}\n\nRegístrate aquí para unirte: ${typeof window !== "undefined" ? window.location.origin : ""}/register?invite=${createdLeagueShare.inviteCode}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-emerald-500 hover:bg-emerald-600 transition-all shadow-sm shadow-emerald-500/10 active:scale-[0.98] cursor-pointer text-center"
              >
                <MessageCircle className="w-4.5 h-4.5 fill-current" />
                <span>Compartir en WhatsApp</span>
              </a>

              {/* Web Share (Native Share) Button - falls back to Instagram instruction */}
              <button
                onClick={async () => {
                  const shareText = `¡Únete a mi liga "${createdLeagueShare.name}" en Mundialario! 🏆⚽\nCódigo de invitación: ${createdLeagueShare.inviteCode}\n\nRegístrate aquí para unirte: ${window.location.origin}/register?invite=${createdLeagueShare.inviteCode}`;
                  if (typeof navigator !== "undefined" && navigator.share) {
                    try {
                      await navigator.share({
                        title: `Mundialario - Liga ${createdLeagueShare.name}`,
                        text: shareText,
                        url: `${window.location.origin}/register?invite=${createdLeagueShare.inviteCode}`
                      });
                    } catch (err) {
                      console.log("Error sharing", err);
                    }
                  } else {
                    navigator.clipboard.writeText(shareText);
                    alert("¡Mensaje completo copiado! Pégalo en tus historias de Instagram o chat.");
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-pink-600 hover:bg-pink-700 transition-all shadow-sm shadow-pink-600/10 active:scale-[0.98] cursor-pointer"
              >
                <Instagram className="w-4.5 h-4.5" />
                <span>Compartir en Historias / Redes</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
