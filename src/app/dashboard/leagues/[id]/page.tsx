"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { createPost, votePoll, deletePost } from "@/app/actions/posts";
import { leaveLeague, deleteLeague } from "@/app/actions/leagues";
import {
  Gamepad2,
  Users,
  Trophy,
  HelpCircle,
  LogOut,
  ArrowLeft,
  Copy,
  CheckCircle,
  AlertCircle,
  Send,
  Image,
  BarChart2,
  Trash2,
  User,
  Plus,
  X,
  Lock,
  MessageSquare,
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
};

type League = {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
};

type Post = {
  id: string;
  league_id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  poll_options: string[] | null;
  created_at: string;
  user?: {
    name: string;
    avatar_url?: string | null;
  };
};

type Vote = {
  post_id: string;
  user_id: string;
  option_index: number;
  created_at: string;
};

export default function LeagueDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const leagueId = params.id as string;

  // DB States
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [league, setLeague] = useState<League | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);

  // UI / Loading States
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);

  // Form States
  const [postText, setPostText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showPoll, setShowPoll] = useState(false);
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Voting loading map
  const [votingMap, setVotingMap] = useState<Record<string, boolean>>({});

  // Delete modal states
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [isDeletingPost, setIsDeletingPost] = useState(false);

  // Leave/Delete League States
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [isDeletingLeague, setIsDeletingLeague] = useState(false);

  const handleLeaveLeague = async () => {
    setIsLeaving(true);
    try {
      const res = await leaveLeague(leagueId);
      if (res.error) {
        alert(res.error);
        setIsLeaving(false);
      } else {
        setShowLeaveModal(false);
        router.push("/dashboard?tab=leagues");
      }
    } catch (err: any) {
      console.error(err);
      alert("Error al intentar abandonar la liga.");
      setIsLeaving(false);
    }
  };

  const handleDeleteLeague = async () => {
    setIsDeletingLeague(true);
    try {
      const res = await deleteLeague(leagueId, deleteConfirmationText);
      if (res.error) {
        alert(res.error);
        setIsDeletingLeague(false);
      } else {
        setShowDeleteModal(false);
        router.push("/dashboard?tab=leagues");
      }
    } catch (err: any) {
      console.error(err);
      alert("Error al intentar eliminar la liga.");
      setIsDeletingLeague(false);
    }
  };

  const isLeagueOwner = profile?.id === league?.owner_id;

  // Tab controller state
  const [leagueTab, setLeagueTab] = useState<"trash" | "leaderboard">("trash");

  // Share league modal state
  const [shareLeagueData, setShareLeagueData] = useState<{ name: string; inviteCode: string } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab") as any;
    if (tabParam && ["trash", "leaderboard"].includes(tabParam)) {
      setLeagueTab(tabParam);
    }
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("tab") !== leagueTab) {
      url.searchParams.set("tab", leagueTab);
      window.history.replaceState(null, "", url.pathname + url.search);
    }
  }, [leagueTab]);

  useEffect(() => {
    if (!leagueId) return;

    fetchData();

    // Subscribe to realtime updates for posts and votes
    const channel = supabase
      .channel(`league-${leagueId}-realtime`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "league_posts",
          filter: `league_id=eq.${leagueId}`
        },
        () => {
          fetchData(true);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "poll_votes"
        },
        () => {
          fetchData(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leagueId]);

  const fetchData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    setErrorMsg("");
    try {
      // 1. Get Auth Session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      // 2. Get User Profile
      const { data: userProfile, error: profileError } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", session.user.id)
        .single();

      if (profileError || !userProfile) {
        console.error("Profile resolution error", profileError);
        setErrorMsg("No se pudo resolver tu perfil de usuario.");
        setIsLoading(false);
        return;
      }
      setProfile(userProfile as UserProfile);

      // 3. Fetch League Info
      const { data: leagueData, error: leagueError } = await supabase
        .from("leagues")
        .select("*")
        .eq("id", leagueId)
        .single();

      if (leagueError || !leagueData) {
        setErrorMsg("La liga solicitada no existe o no tienes acceso.");
        setIsLoading(false);
        return;
      }
      setLeague(leagueData as League);

      // 4. Fetch Members Leaderboard
      let { data: membersData, error: membersError } = await supabase
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

      let activeMembersList: any[] = [];
      if (membersError) {
        console.warn("total_points query failed, falling back to predictions:", membersError.message);
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
          activeMembersList = fallbackData
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
        }
      } else if (membersData) {
        activeMembersList = membersData
          .map((item: any) => {
            const user = Array.isArray(item.users) ? item.users[0] : item.users;
            return {
              id: user?.id,
              name: user?.name,
              points: user?.total_points || 0,
              avatar_url: user?.avatar_url
            };
          })
          .sort((a, b) => b.points - a.points);
      }
      setMembers(activeMembersList);

      // 5. Fetch Posts (Trash Talk)
      const { data: postsData, error: postsError } = await supabase
        .from("league_posts")
        .select("*")
        .eq("league_id", leagueId)
        .order("created_at", { ascending: false });

      if (postsError) {
        console.error("Posts fetch error:", postsError);
      }

      if (postsData) {
        const mappedPosts = postsData.map((p: any) => {
          const author = activeMembersList.find((m: any) => m.id === p.user_id);
          return {
            ...p,
            user: { 
              name: author?.name || "Usuario",
              avatar_url: author?.avatar_url
            }
          };
        });
        setPosts(mappedPosts as Post[]);

        // 6. Fetch Votes for these posts
        if (mappedPosts.length > 0) {
          const postIds = mappedPosts.map(p => p.id);
          const { data: votesData } = await supabase
            .from("poll_votes")
            .select("*")
            .in("post_id", postIds);

          if (votesData) {
            setVotes(votesData as Vote[]);
          }
        }
      }

    } catch (err) {
      console.error("Error fetching league data", err);
      setErrorMsg("Ocurrió un error al cargar la información.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAddPollOption = () => {
    if (pollOptions.length < 4) {
      setPollOptions(prev => [...prev, ""]);
    }
  };

  const handleRemovePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(prev => prev.filter((_, idx) => idx !== index));
    }
  };

  const handlePollOptionTextChange = (index: number, val: string) => {
    setPollOptions(prev => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  const compressImage = (file: File, maxW = 1024, maxH = 1024, quality = 0.7): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith("image/")) {
        resolve(file);
        return;
      }
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = document.createElement("img");
        img.src = event.target?.result as string;
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxW) {
              height = Math.round((height * maxW) / width);
              width = maxW;
            }
          } else {
            if (height > maxH) {
              width = Math.round((width * maxH) / height);
              height = maxH;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(file);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                resolve(file);
              }
            },
            "image/jpeg",
            quality
          );
        };
        img.onerror = () => reject(new Error("Image load failed"));
      };
      reader.onerror = () => reject(new Error("File read failed"));
    });
  };

  // Direct storage upload to Supabase bucket with client-side JPEG compression
  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const compressedBlob = await compressImage(file);
      const fileExt = "jpg"; // Convert to JPEG format
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${profile?.id || "anon"}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("trash-talk")
        .upload(filePath, compressedBlob, {
          contentType: "image/jpeg"
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        alert(`Error de almacenamiento: ${uploadError.message}`);
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("trash-talk")
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err) {
      console.error("Upload error", err);
      return null;
    }
  };

  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postText.trim()) return;
    setIsSubmitting(true);

    try {
      let uploadedUrl = "";
      if (selectedFile) {
        setIsUploading(true);
        const url = await uploadImage(selectedFile);
        if (url) {
          uploadedUrl = url;
        } else {
          setIsUploading(false);
          setIsSubmitting(false);
          return;
        }
        setIsUploading(false);
      }

      // Filter poll options
      let activePollOptions: string[] | undefined = undefined;
      if (showPoll) {
        activePollOptions = pollOptions.filter(opt => opt.trim().length > 0);
        if (activePollOptions.length < 2) {
          alert("Debes escribir al menos 2 opciones para la encuesta.");
          setIsSubmitting(false);
          return;
        }
      }

      const res = await createPost(leagueId, postText, uploadedUrl, activePollOptions);
      if (res.error) {
        alert(res.error);
      } else {
        // Clear form
        setPostText("");
        removeSelectedFile();
        setShowPoll(false);
        setPollOptions(["", ""]);
        // Refresh feed
        await fetchData(true);
      }
    } catch (err) {
      console.error("Error creating post", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVote = async (postId: string, optionIndex: number) => {
    setVotingMap(prev => ({ ...prev, [postId]: true }));
    try {
      const res = await votePoll(postId, optionIndex);
      if (res.error) {
        alert(res.error);
      } else {
        // Refresh feed to show recalculated vote bars
        await fetchData(true);
      }
    } catch (err) {
      console.error("Error voting", err);
    } finally {
      setVotingMap(prev => ({ ...prev, [postId]: false }));
    }
  };

  const handleDeletePost = (postId: string) => {
    setPostToDelete(postId);
  };

  const confirmDeletePost = async () => {
    if (!postToDelete) return;
    setIsDeletingPost(true);
    try {
      const res = await deletePost(postToDelete);
      if (res.error) {
        alert(res.error);
      } else {
        await fetchData(true);
      }
    } catch (err) {
      console.error("Error deleting post", err);
    } finally {
      setIsDeletingPost(false);
      setPostToDelete(null);
    }
  };

  const formatRelativeTime = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHrs = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHrs / 24);

    if (diffSec < 60) return "ahora mismo";
    if (diffMin < 60) return `hace ${diffMin} min`;
    if (diffHrs < 24) return `hace ${diffHrs} ${diffHrs === 1 ? "hora" : "horas"}`;
    if (diffDays === 1) return "ayer";
    return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] bg-slate-50 text-slate-900 font-sans antialiased pb-20 md:pb-0 overflow-x-hidden w-full max-w-full select-none">
        {/* SIDEBAR SKELETON (DESKTOP ONLY) */}
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
              <div className="h-3 w-full bg-slate-200 rounded animate-pulse pt-2"></div>
            </div>
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-11 w-full bg-slate-100 rounded-xl animate-pulse"></div>
              ))}
            </div>
          </div>
          <div className="h-11 w-full bg-slate-100 rounded-xl animate-pulse"></div>
        </aside>

        {/* RIGHT CONTENT WRAPPER SKELETON */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* NAVBAR SKELETON */}
          <header className="sticky top-0 z-40 bg-white border-b border-slate-100 px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-full bg-slate-100 animate-pulse shrink-0"></div>
              <div className="h-8 w-40 bg-slate-200 rounded-full animate-pulse shrink-0"></div>
            </div>
            <div className="h-8 w-24 bg-slate-200 rounded-full animate-pulse shrink-0"></div>
          </header>

          {/* MAIN SKELETON */}
          <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6 md:py-8 space-y-6">
            {/* Tab switcher skeleton */}
            <div className="flex border-b border-slate-200 mb-6">
              <div className="flex-1 py-4 flex justify-center"><div className="h-4 w-24 bg-slate-200 rounded animate-pulse"></div></div>
              <div className="flex-1 py-4 flex justify-center"><div className="h-4 w-24 bg-slate-200 rounded animate-pulse"></div></div>
            </div>

            {/* Banner skeleton */}
            <div className="h-28 w-full bg-slate-200 rounded-3xl animate-pulse"></div>

            {/* Form Post skeleton */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-sm">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse shrink-0"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-16 w-full bg-slate-50 rounded-2xl animate-pulse"></div>
                  <div className="h-3 w-24 bg-slate-100 rounded animate-pulse"></div>
                </div>
              </div>
              <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                <div className="flex gap-2">
                  <div className="w-9 h-9 rounded-full bg-slate-100 animate-pulse"></div>
                  <div className="w-9 h-9 rounded-full bg-slate-100 animate-pulse"></div>
                </div>
                <div className="h-9 w-20 bg-slate-200 rounded-xl animate-pulse"></div>
              </div>
            </div>

            {/* Feed list skeletons */}
            <div className="space-y-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-sm">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-200 animate-pulse"></div>
                      <div className="h-3 w-20 bg-slate-200 rounded animate-pulse"></div>
                    </div>
                    <div className="h-3 w-12 bg-slate-100 rounded animate-pulse"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 w-full bg-slate-100 rounded animate-pulse"></div>
                    <div className="h-4 w-5/6 bg-slate-100 rounded animate-pulse"></div>
                  </div>
                </div>
              ))}
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

  if (errorMsg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full shadow-lg text-center flex flex-col items-center gap-4">
          <AlertCircle className="w-12 h-12 text-red-500 animate-bounce" />
          <h2 className="text-xl font-black text-slate-800 uppercase">Acceso Denegado</h2>
          <p className="text-sm font-semibold text-slate-500">{errorMsg}</p>
          <Link
            href="/dashboard"
            className="mt-2 w-full py-3 bg-violet-700 hover:bg-violet-800 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-colors inline-flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Volver al Dashboard
          </Link>
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
            <Link href="/dashboard" className="font-black tracking-tight text-slate-800 text-base uppercase hover:text-violet-700 transition-colors">
              Mundialario
            </Link>
          </div>

          {/* User overview inside sidebar */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-violet-200 text-violet-800 flex items-center justify-center font-black">
                {profile?.name?.[0]?.toUpperCase() || ""}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-extrabold text-sm text-slate-800 leading-tight truncate">{profile?.name}</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 truncate">{profile?.id}</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-200/50 flex justify-between items-center text-xs font-semibold text-slate-500">
              <span>Puntos Acumulados</span>
              <strong className="text-violet-700 font-black text-sm">
                {members.find(m => m.id === profile?.id)?.points || 0} pts
              </strong>
            </div>
          </div>

          {/* Sidebar links */}
          <nav className="flex flex-col gap-2">
            <button
              onClick={() => router.push("/dashboard?tab=predictions")}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-extrabold text-sm uppercase tracking-wide text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer"
            >
              <Gamepad2 className="w-4 h-4" />
              <span>Jugar</span>
            </button>
            <button
              onClick={() => router.push("/dashboard?tab=leagues")}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-extrabold text-sm uppercase tracking-wide bg-violet-700 text-white shadow-md shadow-violet-700/20 transition-all cursor-pointer"
            >
              <Users className="w-4 h-4" />
              <span>Mis Ligas</span>
            </button>
            <button
              onClick={() => router.push("/dashboard?tab=ranking")}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-extrabold text-sm uppercase tracking-wide text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer"
            >
              <Trophy className="w-4 h-4" />
              <span>Ranking</span>
            </button>
            <button
              onClick={() => router.push("/dashboard?tab=faq")}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-extrabold text-sm uppercase tracking-wide text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer"
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
        <header className="sticky top-0 z-40 bg-white border-b border-slate-100 px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <Link
              href="/dashboard?tab=leagues"
              className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-colors shadow-sm cursor-pointer shrink-0"
              title="Volver"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="bg-violet-700 text-white px-3 sm:px-4 py-2 rounded-full inline-flex items-center gap-1.5 sm:gap-2 font-black tracking-tighter text-[10px] sm:text-sm border border-violet-850 shadow-sm select-none min-w-0 shrink">
              <span className="truncate max-w-[35vw] sm:max-w-none">LIGA: {league?.name.toUpperCase()}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="bg-slate-100 border border-slate-200 rounded-full px-2.5 sm:px-3.5 py-1.5 flex items-center gap-1.5 sm:gap-2 shadow-sm select-none text-[9px] sm:text-[10px]">
              <span className="font-black text-slate-600 uppercase">
                Cód: {league?.invite_code}
              </span>
              <button
                onClick={() => copyToClipboard(league?.invite_code || "")}
                className="p-1 rounded bg-slate-200/60 text-slate-600 hover:text-slate-800 hover:bg-slate-300/80 transition-all cursor-pointer"
                title="Copiar Código"
              >
                <Copy className="w-3 h-3" />
              </button>
              {copiedCode && (
                <span className="text-[9px] text-lime-600 font-black uppercase tracking-wider">¡Copiado!</span>
              )}
            </div>

            <button
              onClick={() => {
                if (league) {
                  setShareLeagueData({
                    name: league.name,
                    inviteCode: league.invite_code
                  });
                }
              }}
              className="px-3.5 py-2 bg-violet-700 hover:bg-violet-800 text-white rounded-full flex items-center gap-1.5 text-xs font-black uppercase transition-all shadow-sm cursor-pointer"
              title="Compartir Liga"
            >
              <Share2 className="w-3.5 h-3.5 text-lime-400" />
              <span className="hidden sm:inline">Compartir Liga</span>
            </button>
          </div>
        </header>

        {/* DETAILED LEAGUE VIEWS CONTAINER */}
        <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6 md:py-8">
          
          {/* TAB SWITCHER */}
          <div className="flex border-b border-slate-200 select-none mb-6">
            <button
              type="button"
              onClick={() => setLeagueTab("trash")}
              className={`flex-1 py-3.5 text-center font-extrabold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                leagueTab === "trash"
                  ? "border-red-500 text-red-600 font-black"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Trash Talk</span>
            </button>
            <button
              type="button"
              onClick={() => setLeagueTab("leaderboard")}
              className={`flex-1 py-3.5 text-center font-extrabold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                leagueTab === "leaderboard"
                  ? "border-violet-700 text-violet-700 font-black"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>Tabla de Posiciones</span>
            </button>
          </div>

          {leagueTab === "trash" ? (
            /* LEFT 2 COLUMNS: TRASH TALK FEED */
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Box Title */}
              <div className="bg-gradient-to-r from-red-600 to-orange-500 text-white p-5 rounded-3xl shadow-md border border-red-700 select-none">
                <span className="bg-white/20 text-white font-black text-[9px] tracking-wider uppercase px-2.5 py-1 rounded-full">
                  Muro de la Liga
                </span>
                <h2 className="text-xl sm:text-2xl font-black uppercase mt-2.5 tracking-tight">
                  🔥 MURO DE TRASH TALK
                </h2>
                <p className="text-white/80 text-[11px] sm:text-xs font-semibold mt-0.5">
                  Haz bullying deportivo a tus amigos, sube fotos graciosas o lanza encuestas.
                </p>
              </div>

              {/* POST CREATION FORM */}
              <form onSubmit={handleSubmitPost} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
                <div className="flex gap-3">
                  {/* User avatar mockup */}
                  <div className="w-10 h-10 rounded-full bg-violet-100 text-violet-800 flex items-center justify-center font-black select-none shrink-0">
                    {profile?.name?.[0]?.toUpperCase() || ""}
                  </div>

                  <div className="flex-1 space-y-3">
                    <textarea
                      required
                      maxLength={254}
                      rows={3}
                      value={postText}
                      onChange={e => setPostText(e.target.value)}
                      placeholder="¿Quién es el más tronco de la liga? Lanza tu comentario..."
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm font-semibold transition-all resize-none"
                    />

                    {/* CHARACTER COUNTER */}
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold px-1 select-none">
                      <span>Máximo 254 caracteres</span>
                      <span className={postText.length >= 240 ? "text-red-500" : ""}>
                        {postText.length} / 254
                      </span>
                    </div>
                  </div>
                </div>

                {/* POLL CREATOR COMPONENT (IF TOGGLED ON) */}
                {showPoll && (
                  <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 ml-0 sm:ml-13 space-y-3 animate-in slide-in-from-top-2 duration-150 select-none">
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                      <div className="flex items-center gap-1.5 text-xs font-black text-slate-700 uppercase">
                        <BarChart2 className="w-4 h-4 text-violet-600" />
                        <span>Crear Encuesta</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowPoll(false)}
                        className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {pollOptions.map((option, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-slate-400 w-16">Opción {idx + 1}:</span>
                          <input
                            type="text"
                            required
                            placeholder={`Ej. Argentina`}
                            value={option}
                            onChange={e => handlePollOptionTextChange(idx, e.target.value)}
                            className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-violet-500"
                          />
                          {pollOptions.length > 2 && (
                            <button
                              type="button"
                              onClick={() => handleRemovePollOption(idx)}
                              className="text-red-500 hover:text-red-700 p-1"
                              title="Remover opción"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}

                      {pollOptions.length < 4 && (
                        <button
                          type="button"
                          onClick={handleAddPollOption}
                          className="text-[10px] font-black text-violet-700 hover:text-violet-900 uppercase flex items-center gap-1 mt-1 pl-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Agregar Opción ({pollOptions.length}/4)
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* PREVIEW SELECTED IMAGE */}
                {imagePreview && (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 max-h-60 ml-0 sm:ml-13 animate-in fade-in duration-200">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover max-h-60" />
                    <button
                      type="button"
                      onClick={removeSelectedFile}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* FOOTER ACTIONS BAR */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-3 select-none">
                  <div className="flex items-center gap-2">
                    {/* Add Image Button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className={`p-2.5 rounded-full hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer flex items-center justify-center border border-slate-100 ${
                        selectedFile ? "bg-red-50 border-red-100 text-red-600" : ""
                      }`}
                      title="Subir Imagen"
                    >
                      <Image className="w-4 h-4" />
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden"
                      />
                    </button>

                    {/* Add Poll Button */}
                    <button
                      type="button"
                      onClick={() => setShowPoll(!showPoll)}
                      className={`p-2.5 rounded-full hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer flex items-center justify-center border border-slate-100 ${
                        showPoll ? "bg-violet-50 border-violet-100 text-violet-700" : ""
                      }`}
                      title="Lanzar Encuesta"
                    >
                      <BarChart2 className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || isUploading}
                    className="px-5 py-2.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>{isUploading ? "Subiendo foto..." : "Publicando..."}</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Publicar</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* POSTS FEED LIST */}
              <div className="space-y-4">
                {posts.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400 font-semibold shadow-sm select-none">
                    <p className="text-lg">🔇 Muro vacío</p>
                    <p className="text-xs text-slate-400 mt-1">Nadie ha hablado de trash talk todavía. ¡Sé el primero!</p>
                  </div>
                ) : (
                  posts.map(post => {
                    const relativeTime = formatRelativeTime(post.created_at);
                    const isAuthor = post.user_id === profile?.id;
                    const isLeagueOwner = profile?.id === league?.owner_id;
                    const canDelete = isAuthor || isLeagueOwner;

                    // Poll states
                    const postVotes = votes.filter(v => v.post_id === post.id);
                    const totalVotes = postVotes.length;
                    const optionVotes = post.poll_options
                      ? post.poll_options.map((_, idx) => postVotes.filter(v => v.option_index === idx).length)
                      : [];
                    const maxVoteValue = optionVotes.length > 0 ? Math.max(...optionVotes) : 0;
                    const userVote = postVotes.find(v => v.user_id === profile?.id);
                    const hasVoted = !!userVote;

                    return (
                      <div
                        key={post.id}
                        className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4 hover:border-slate-300 transition-colors"
                      >
                        {/* Header Post */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {/* Author avatar */}
                            {post.user?.avatar_url ? (
                              <img
                                src={post.user.avatar_url}
                                alt={post.user.name}
                                className="w-9 h-9 rounded-full object-cover border border-violet-100"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-800 flex items-center justify-center font-black select-none text-xs animate-in fade-in duration-200">
                                {post.user?.name?.[0]?.toUpperCase() || ""}
                              </div>
                            )}
                            <div>
                              <h4 className="text-xs font-black text-slate-800 leading-tight">
                                {post.user?.name}{" "}
                                {isAuthor && (
                                  <span className="bg-violet-100 text-violet-800 font-bold text-[8px] px-1.5 py-0.2 rounded uppercase ml-1">
                                    Tú
                                  </span>
                                )}
                              </h4>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 select-none">
                            <span className="text-[10px] text-slate-400 font-bold uppercase">
                              {relativeTime}
                            </span>
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => handleDeletePost(post.id)}
                                className="p-1 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                title="Eliminar publicación"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Content Post */}
                        <p className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed break-words whitespace-pre-line">
                          {post.content}
                        </p>

                        {/* Image Render */}
                        {post.image_url && (
                          <div className="rounded-2xl overflow-hidden border border-slate-100 bg-slate-50">
                            <img
                              src={post.image_url}
                              alt="Trash Talk Media"
                              className="w-full h-auto max-h-96 object-contain"
                              loading="lazy"
                            />
                          </div>
                        )}

                        {/* Poll Render */}
                        {post.poll_options && (
                          <div className="bg-slate-50/50 border border-slate-200/60 rounded-2xl p-4 space-y-2.5">
                            <div className="flex items-center justify-between text-[9px] font-black text-slate-400 uppercase tracking-wider select-none mb-1">
                              <span className="flex items-center gap-1">
                                <BarChart2 className="w-3.5 h-3.5 text-violet-600" /> Encuesta de Liga
                              </span>
                              <span>{totalVotes} {totalVotes === 1 ? "voto" : "votos"}</span>
                            </div>

                            <div className="space-y-2">
                              {post.poll_options.map((option, idx) => {
                                const voteCount = optionVotes[idx] || 0;
                                const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                                const isUserChoice = userVote?.option_index === idx;
                                const isWinning = voteCount === maxVoteValue && maxVoteValue > 0;

                                if (hasVoted) {
                                  // Render result bars
                                  return (
                                    <div
                                      key={idx}
                                      className="relative flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-white overflow-hidden text-xs select-none shadow-xs"
                                    >
                                      {/* PROGRESS FILL ANIMATION */}
                                      <div
                                        className={`absolute left-0 top-0 bottom-0 transition-all duration-700 ease-out ${
                                          isWinning ? "bg-lime-400/20" : "bg-purple-500/10"
                                        }`}
                                        style={{ width: `${percentage}%` }}
                                      />

                                      <span className="relative font-bold text-slate-800 flex items-center gap-1.5 min-w-0">
                                        <span className="truncate">{option}</span>
                                        {isUserChoice && (
                                          <span className="shrink-0 text-[8px] bg-violet-600 text-white font-extrabold px-1.5 py-0.5 rounded-full uppercase scale-90">
                                            Tu voto
                                          </span>
                                        )}
                                      </span>

                                      <span className="relative font-black text-slate-900 shrink-0">
                                        {percentage}% <span className="text-[10px] text-slate-400 font-semibold">({voteCount})</span>
                                      </span>
                                    </div>
                                  );
                                } else {
                                  // Render voting buttons
                                  const isVoting = votingMap[post.id];
                                  return (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => handleVote(post.id, idx)}
                                      disabled={isVoting}
                                      className="w-full text-left p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-xs font-bold text-slate-700 transition-all active:scale-[0.99] cursor-pointer shadow-xs disabled:opacity-50"
                                    >
                                      {option}
                                    </button>
                                  );
                                }
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

            </div>
          ) : (
            /* RIGHT COLUMN: LEAGUE MEMBERS STANDINGS */
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Leaderboard title */}
              <div className="bg-gradient-to-r from-violet-700 to-purple-600 text-white p-5 rounded-3xl shadow-md border border-violet-800 select-none">
                <span className="bg-white/20 text-white font-black text-[9px] tracking-wider uppercase px-2.5 py-1 rounded-full">
                  Clasificación
                </span>
                <h2 className="text-xl font-black uppercase mt-2.5 tracking-tight">
                  🏆 TABLA DE LIGA
                </h2>
                <p className="text-white/80 text-[11px] font-semibold mt-0.5">
                  Tabla de posiciones interna ordenada por puntos acumulados.
                </p>
              </div>

              {/* Members leaderboard */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
                <h3 className="text-[10px] font-black text-amber-950/40 uppercase tracking-widest px-1 select-none">
                  Participantes ({members.length})
                </h3>

                <div className="divide-y divide-slate-100">
                  {members.map((member, index) => {
                    const isMe = member.id === profile?.id;
                    const isOwner = member.id === league?.owner_id;

                    return (
                      <div
                        key={member.id}
                        className={`flex items-center justify-between py-3.5 px-2 transition-colors ${
                          isMe ? "bg-violet-50/40 rounded-2xl font-bold border border-violet-100/50" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Rank badge */}
                          <span className="w-6 text-center text-xs font-black text-slate-500 shrink-0">
                            {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                          </span>

                          {/* Member Avatar */}
                          {member.avatar_url ? (
                            <img
                              src={member.avatar_url}
                              alt={member.name}
                              className="w-7 h-7 rounded-full object-cover border border-violet-100 shrink-0"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-black text-[10px] shrink-0">
                              {member.name?.[0]?.toUpperCase() || ""}
                            </div>
                          )}

                          <div className="min-w-0">
                            <span className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                              <span className="truncate">{member.name}</span>
                              {isMe && (
                                <span className="shrink-0 text-[8px] bg-violet-200 text-violet-800 font-extrabold px-1.5 py-0.2 rounded uppercase">
                                  Tú
                                </span>
                              )}
                              {isOwner && (
                                <span className="shrink-0 text-[8px] bg-amber-100 text-amber-800 font-extrabold px-1.5 py-0.2 rounded uppercase flex items-center gap-0.5" title="Creador de la liga">
                                  👑 Creador
                                </span>
                              )}
                            </span>
                            <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                              {member.id}
                            </span>
                          </div>
                        </div>

                        <span className="text-xs sm:text-sm font-black text-slate-900 shrink-0">
                          {member.points} pts
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Zona de Peligro (Danger Zone) */}
              <div className="bg-white border border-red-100 rounded-3xl p-6 shadow-sm space-y-4 mt-6">
                <h3 className="text-sm font-black text-red-600 uppercase tracking-tight flex items-center gap-1.5 select-none">
                  <span>⚠️ Zona de Peligro</span>
                </h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  {isLeagueOwner
                    ? "Como creador de la liga, puedes eliminarla de forma permanente. Se borrarán todos los miembros, mensajes del muro y registros."
                    : "Si abandonas esta liga, ya no aparecerás en la clasificación ni tendrás acceso a su muro de Trash Talk."}
                </p>
                
                {isLeagueOwner ? (
                  <button
                    onClick={() => {
                      setDeleteStep(1);
                      setDeleteConfirmationText("");
                      setShowDeleteModal(true);
                    }}
                    className="w-full sm:w-auto px-5 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-sm transition-all active:scale-[0.98] cursor-pointer"
                  >
                    Eliminar Liga
                  </button>
                ) : (
                  <button
                    onClick={() => setShowLeaveModal(true)}
                    className="w-full sm:w-auto px-5 py-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-2xl text-xs font-black uppercase tracking-wider transition-all active:scale-[0.98] cursor-pointer"
                  >
                    Abandonar Liga
                  </button>
                )}
              </div>

            </div>
          )}
        </main>
      </div>

      {/* MOBILE STICKY BOTTOM NAVIGATION BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-50 w-full bg-white/95 backdrop-blur-sm border-t border-slate-100 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] py-2.5 px-6 flex justify-between items-center md:hidden select-none">
        <button
          onClick={() => router.push("/dashboard?tab=predictions")}
          className="flex flex-col items-center gap-1 group cursor-pointer"
        >
          <Gamepad2 className="w-5 h-5 text-slate-400" />
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Jugar
          </span>
        </button>

        <button
          onClick={() => router.push("/dashboard?tab=leagues")}
          className="flex flex-col items-center gap-1 group cursor-pointer"
        >
          <Users className="w-5 h-5 text-violet-700" />
          <span className="text-[10px] font-black uppercase tracking-wider text-violet-700">
            Ligas
          </span>
        </button>

        <button
          onClick={() => router.push("/dashboard?tab=ranking")}
          className="flex flex-col items-center gap-1 group cursor-pointer"
        >
          <Trophy className="w-5 h-5 text-slate-400" />
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Ranking
          </span>
        </button>

        <button
          onClick={() => router.push("/dashboard?tab=faq")}
          className="flex flex-col items-center gap-1 group cursor-pointer"
        >
          <HelpCircle className="w-5 h-5 text-slate-400" />
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Ayuda
          </span>
        </button>
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {postToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs select-none p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center border border-red-100 shrink-0">
              <Trash2 className="w-6 h-6 animate-pulse" />
            </div>
            
            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">¿Eliminar publicación?</h3>
              <p className="text-xs font-semibold text-slate-400 leading-relaxed">
                Esta acción no se puede deshacer y borrará permanentemente la publicación junto con todos sus votos de la base de datos.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full mt-2">
              <button
                type="button"
                disabled={isDeletingPost}
                onClick={() => setPostToDelete(null)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold text-xs rounded-xl uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingPost}
                onClick={confirmDeletePost}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer shadow-md hover:shadow-lg flex items-center justify-center gap-1.5"
              >
                {isDeletingPost ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <span>Eliminar</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SHARE LEAGUE MODAL */}
      {shareLeagueData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md px-4 select-none animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm shadow-2xl p-6 space-y-6 animate-in zoom-in-95 duration-200 relative text-left">
            {/* Close button */}
            <button
              onClick={() => setShareLeagueData(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header info */}
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-full bg-lime-100 border border-lime-200 flex items-center justify-center text-lime-700 shadow-sm">
                <Share2 className="w-6 h-6 text-lime-600" />
              </div>
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                Compartir Liga 🏆
              </h3>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                Invita a más amigos a unirse a la liga <strong className="text-violet-700">"{shareLeagueData.name}"</strong> para pronosticar y trash-talkear juntos.
              </p>
            </div>

            {/* Invite Code Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center gap-2">
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Código de Invitación</span>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-black text-violet-950 tracking-wider">
                  {shareLeagueData.inviteCode}
                </span>
                <button
                  onClick={() => copyToClipboard(shareLeagueData.inviteCode)}
                  className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-700 transition-all cursor-pointer shadow-xs active:scale-95"
                  title="Copiar Código"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              {copiedCode && (
                <span className="text-[9px] text-lime-600 font-black uppercase tracking-wider">¡Código copiado!</span>
              )}
            </div>

            {/* Sharing buttons */}
            <div className="space-y-3">
              {/* WhatsApp Share Button */}
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                  `¡Únete a mi liga "${shareLeagueData.name}" en Mundialario! 🏆⚽\nCódigo de invitación: ${shareLeagueData.inviteCode}\n\nRegístrate aquí para unirte: ${typeof window !== "undefined" ? window.location.origin : ""}/register?invite=${shareLeagueData.inviteCode}`
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
                  const shareText = `¡Únete a mi liga "${shareLeagueData.name}" en Mundialario! 🏆⚽\nCódigo de invitación: ${shareLeagueData.inviteCode}\n\nRegístrate aquí para unirte: ${window.location.origin}/register?invite=${shareLeagueData.inviteCode}`;
                  if (typeof navigator !== "undefined" && navigator.share) {
                    try {
                      await navigator.share({
                        title: `Mundialario - Liga ${shareLeagueData.name}`,
                        text: shareText,
                        url: `${window.location.origin}/register?invite=${shareLeagueData.inviteCode}`
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
      {/* LEAVE LEAGUE CONFIRMATION MODAL */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs select-none p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center border border-red-100 shrink-0">
              <AlertCircle className="w-6 h-6 animate-bounce" />
            </div>
            
            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">¿Abandonar esta liga?</h3>
              <p className="text-xs font-semibold text-slate-450 leading-relaxed">
                ¿Estás seguro de que deseas abandonar la liga <strong className="text-violet-750 font-black">"{league?.name}"</strong>? Esta es la segunda confirmación. Perderás tu puesto en la clasificación de forma permanente.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full mt-2">
              <button
                type="button"
                disabled={isLeaving}
                onClick={() => setShowLeaveModal(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold text-xs rounded-xl uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isLeaving}
                onClick={handleLeaveLeague}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer shadow-md hover:shadow-lg flex items-center justify-center gap-1.5"
              >
                {isLeaving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saliendo...</span>
                  </>
                ) : (
                  <span>Sí, abandonar</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE LEAGUE CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs select-none p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center border border-red-100 shrink-0">
              <Trash2 className="w-6 h-6 animate-pulse" />
            </div>

            {deleteStep === 1 ? (
              <>
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">¿Eliminar liga completa?</h3>
                  <p className="text-xs font-semibold text-slate-450 leading-relaxed">
                    Esta acción es irreversible y destruirá la liga <strong className="text-red-600 font-black">"{league?.name}"</strong> junto con todos sus miembros, predicciones internas y el chat. Esta es la segunda confirmación.
                  </p>
                </div>

                <div className="flex items-center gap-3 w-full mt-2">
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold text-xs rounded-xl uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteStep(2)}
                    className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl uppercase tracking-wider transition-colors cursor-pointer shadow-md"
                  >
                    Siguiente
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2 w-full">
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Tercera Confirmación</h3>
                  <p className="text-xs font-semibold text-slate-400 leading-relaxed">
                    Por favor escribe el nombre de la liga para confirmar la eliminación definitiva:
                  </p>
                  <div className="bg-slate-50 border border-slate-200 text-red-600 font-black text-xs p-3 rounded-2xl select-all select-none">
                    {league?.name}
                  </div>
                  <input
                    type="text"
                    placeholder="Escribe el nombre de la liga..."
                    value={deleteConfirmationText}
                    onChange={(e) => setDeleteConfirmationText(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500 bg-slate-50 text-center"
                  />
                </div>

                <div className="flex items-center gap-3 w-full mt-2">
                  <button
                    type="button"
                    disabled={isDeletingLeague}
                    onClick={() => setDeleteStep(1)}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold text-xs rounded-xl uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    Atrás
                  </button>
                  <button
                    type="button"
                    disabled={isDeletingLeague || deleteConfirmationText.trim().toLowerCase() !== league?.name.trim().toLowerCase()}
                    onClick={handleDeleteLeague}
                    className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl uppercase tracking-wider transition-colors disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:shadow-none cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                  >
                    {isDeletingLeague ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Eliminando...</span>
                      </>
                    ) : (
                      <span>Eliminar definitivamente</span>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
