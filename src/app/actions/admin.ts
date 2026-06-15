"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// Helper to generate a custom Match ID (MTCH-XXXXXX)
function generateMatchId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "MTCH-";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Helper to generate a custom Post ID (PST-XXXXXX)
function generatePostId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "PST-";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Helper to verify admin role
async function verifyAdmin(supabase: any) {
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  if (authError || !authUser) {
    throw new Error("No autenticado.");
  }

  const { data: dbUser, error: dbUserError } = await supabase
    .from("users")
    .select("id, is_admin")
    .eq("auth_id", authUser.id)
    .single();

  if (dbUserError || !dbUser || !dbUser.is_admin) {
    throw new Error("Acceso denegado. No tienes permisos de administrador.");
  }

  return dbUser;
}

export async function createMatch(matchDate: string, kickoffTime: string, teamA: string, teamB: string) {
  if (!matchDate || !kickoffTime || !teamA || !teamB) {
    return { error: "Todos los campos del partido son obligatorios." };
  }

  if (teamA.trim() === teamB.trim()) {
    return { error: "Los equipos local y visitante no pueden ser iguales." };
  }

  const supabase = await createClient();

  try {
    await verifyAdmin(supabase);

    // Auto-create countries if they do not exist
    const { data: countryA } = await supabase
      .from("countries")
      .select("id")
      .eq("name", teamA.trim())
      .maybeSingle();

    if (!countryA) {
      await supabase
        .from("countries")
        .insert({ name: teamA.trim(), flag_url: null });
    }

    const { data: countryB } = await supabase
      .from("countries")
      .select("id")
      .eq("name", teamB.trim())
      .maybeSingle();

    if (!countryB) {
      await supabase
        .from("countries")
        .insert({ name: teamB.trim(), flag_url: null });
    }

    const matchId = generateMatchId();

    const { error } = await supabase
      .from("matches")
      .insert({
        id: matchId,
        match_date: matchDate,
        kickoff_time: kickoffTime,
        team_a: teamA.trim(),
        team_b: teamB.trim(),
        score_a: null,
        score_b: null,
        is_calculated: false
      });

    if (error) {
      return { error: `Error al crear partido: ${error.message}` };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/admin");
    return { success: true, matchId };
  } catch (err: any) {
    return { error: err.message || "Error al verificar permisos de administrador." };
  }
}

export async function updateMatchScore(matchId: string, scoreA: number, scoreB: number) {
  if (scoreA < 0 || scoreB < 0) {
    return { error: "Los marcadores de los partidos no pueden ser negativos." };
  }

  const supabase = await createClient();

  try {
    await verifyAdmin(supabase);

    const { error } = await supabase
      .from("matches")
      .update({
        score_a: scoreA,
        score_b: scoreB,
        is_calculated: false // Reset points calculations flag so points can be re-run
      })
      .eq("id", matchId);

    if (error) {
      return { error: `Error al registrar marcador: ${error.message}` };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/admin");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Error al verificar permisos de administrador." };
  }
}

export async function calculateMatchPointsAction(matchId: string) {
  const supabase = await createClient();

  try {
    const dbUser = await verifyAdmin(supabase);

    // Call stored procedure calculate_match_points(p_match_id)
    const { error } = await supabase.rpc("calculate_match_points", {
      p_match_id: matchId
    });

    if (error) {
      return { error: `Error al calcular puntos de predicciones: ${error.message}` };
    }

    // --- AUTOMATIC LEAGUE ANNOUNCEMENTS ---
    try {
      const { data: match } = await supabase
        .from("matches")
        .select("team_a, team_b, score_a, score_b")
        .eq("id", matchId)
        .single();

      if (match && match.score_a !== null && match.score_b !== null) {
        const { data: leagues } = await supabase
          .from("leagues")
          .select("id, name");

        if (leagues) {
          for (const league of leagues) {
            // Fetch members of this league
            const { data: members } = await supabase
              .from("league_members")
              .select("user_id")
              .eq("league_id", league.id);

            if (members && members.length > 0) {
              const memberIds = members.map((m: any) => m.user_id);

              // Fetch predictions for this match for these members
              const { data: preds } = await supabase
                .from("predictions")
                .select(`
                  points,
                  penalty,
                  pred_a,
                  pred_b,
                  user_id,
                  users (
                    name
                  )
                `)
                .eq("match_id", matchId)
                .in("user_id", memberIds);

              if (preds && preds.length > 0) {
                const sortedPreds = preds
                  .map((p: any) => {
                    const user = Array.isArray(p.users) ? p.users[0] : p.users;
                    const netPoints = (p.points || 0) - (p.penalty || 0);
                    return {
                      name: user?.name || "Usuario",
                      netPoints,
                      pred: `${p.pred_a} - ${p.pred_b}`,
                      points: p.points,
                      penalty: p.penalty
                    };
                  })
                  .sort((a, b) => b.netPoints - a.netPoints);

                let content = `📊 **RESULTADO DE PARTIDO**\n⚽ **${match.team_a} ${match.score_a} - ${match.score_b} ${match.team_b}**\n\n🏆 **PODIO DEL ENCUENTRO**:\n`;
                const medals = ["🥇", "🥈", "🥉"];
                const podium = sortedPreds.slice(0, 3);

                podium.forEach((p, idx) => {
                  const penaltyText = p.penalty > 0 ? ` (penalización -${p.penalty} pts)` : "";
                  content += `${medals[idx]} **${p.name}**: ${p.netPoints} pts [Pronóstico: ${p.pred}]${penaltyText}\n`;
                });

                const { error: postError } = await supabase
                  .from("league_posts")
                  .insert({
                    id: generatePostId(),
                    league_id: league.id,
                    user_id: dbUser.id,
                    content: content,
                    is_announcement: true,
                    announcement_type: "match_result"
                  });

                if (postError) {
                  console.error("Error inserting match result announcement:", postError);
                }
              }
            }
          }
        }
      }
    } catch (annError) {
      console.error("Error generating automatic league announcements:", annError);
    }
    // -------------------------------------

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/admin");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Error al verificar permisos de administrador." };
  }
}

export async function sendMatchdayAnnouncementAction(matchDate: string) {
  if (!matchDate) {
    return { error: "La fecha de la jornada es obligatoria." };
  }

  const supabase = await createClient();

  try {
    const dbUser = await verifyAdmin(supabase);

    // Fetch matches on this date
    const { data: matchesOnDate, error: matchesError } = await supabase
      .from("matches")
      .select("id, team_a, team_b, score_a, score_b")
      .eq("match_date", matchDate);

    if (matchesError || !matchesOnDate || matchesOnDate.length === 0) {
      return { error: `No se encontraron partidos registrados para la fecha ${matchDate}.` };
    }

    // Check if there are any uncalculated matches
    const uncalculated = matchesOnDate.filter((m: any) => m.score_a === null || m.score_b === null);
    if (uncalculated.length > 0) {
      return { error: `Hay partidos en esta fecha que aún no tienen marcador registrado.` };
    }

    const matchIds = matchesOnDate.map((m: any) => m.id);

    // Get all leagues
    const { data: leagues } = await supabase
      .from("leagues")
      .select("id, name");

    if (!leagues || leagues.length === 0) {
      return { error: "No hay ligas registradas." };
    }

    let announcementsSent = 0;

    for (const league of leagues) {
      // Get league members
      const { data: members } = await supabase
        .from("league_members")
        .select("user_id")
        .eq("league_id", league.id);

      if (members && members.length > 0) {
        const memberIds = members.map((m: any) => m.user_id);

        // Fetch predictions on these matches for members of this league
        const { data: preds } = await supabase
          .from("predictions")
          .select(`
            points,
            penalty,
            user_id,
            users (
              name
            )
          `)
          .in("match_id", matchIds)
          .in("user_id", memberIds);

        if (preds && preds.length > 0) {
          // Aggregate points by user
          const userScoresMap: Record<string, { name: string; score: number }> = {};
          
          preds.forEach((p: any) => {
            const user = Array.isArray(p.users) ? p.users[0] : p.users;
            if (user) {
              if (!userScoresMap[p.user_id]) {
                userScoresMap[p.user_id] = { name: user.name, score: 0 };
              }
              userScoresMap[p.user_id].score += (p.points || 0) - (p.penalty || 0);
            }
          });

          const sortedScores = Object.values(userScoresMap)
            .sort((a, b) => b.score - a.score);

          if (sortedScores.length > 0) {
            let content = `🏆 **CIERRE DE JORNADA - ${matchDate}**\n🏁 Resultados acumulados de los partidos de hoy:\n\n`;
            const medals = ["🥇", "🥈", "🥉"];
            const podium = sortedScores.slice(0, 3);

            podium.forEach((p, idx) => {
              content += `${medals[idx]} **${p.name}**: ${p.score} pts obtenidos hoy\n`;
            });

            content += "\n¡Felicidades a los líderes de la jornada! ⚽🔥";

            const { error: postError } = await supabase
              .from("league_posts")
              .insert({
                id: generatePostId(),
                league_id: league.id,
                user_id: dbUser.id,
                content: content,
                is_announcement: true,
                announcement_type: "matchday_result"
              });

            if (!postError) {
              announcementsSent++;
            } else {
              console.error("Error inserting matchday result announcement:", postError);
            }
          }
        }
      }
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/admin");
    return { success: true, count: announcementsSent };
  } catch (err: any) {
    return { error: err.message || "Error al realizar cierre de jornada." };
  }
}

export async function getCountries() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("countries")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    return { error: `Error al obtener países: ${error.message}` };
  }
  return { success: true, countries: data || [] };
}

export async function saveCountry(name: string, flagUrl: string) {
  if (!name.trim()) {
    return { error: "El nombre del país es obligatorio." };
  }

  const supabase = await createClient();

  try {
    await verifyAdmin(supabase);

    const { error } = await supabase
      .from("countries")
      .upsert(
        {
          name: name.trim(),
          flag_url: flagUrl.trim() || null
        },
        { onConflict: "name" }
      );

    if (error) {
      return { error: `Error al guardar país: ${error.message}` };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/admin");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Error al verificar permisos de administrador." };
  }
}

export async function editMatchDetails(
  matchId: string,
  teamA: string,
  teamB: string,
  matchDate: string,
  kickoffTime: string,
  scoreA: number | null,
  scoreB: number | null
) {
  if (!matchId || !teamA || !teamB || !matchDate || !kickoffTime) {
    return { error: "Todos los campos obligatorios del partido deben ser provistos." };
  }

  if (teamA.trim() === teamB.trim()) {
    return { error: "Los equipos local y visitante no pueden ser iguales." };
  }

  const supabase = await createClient();

  try {
    await verifyAdmin(supabase);

    // Auto-create countries if they do not exist
    const { data: countryA } = await supabase
      .from("countries")
      .select("id")
      .eq("name", teamA.trim())
      .maybeSingle();

    if (!countryA) {
      await supabase
        .from("countries")
        .insert({ name: teamA.trim(), flag_url: null });
    }

    const { data: countryB } = await supabase
      .from("countries")
      .select("id")
      .eq("name", teamB.trim())
      .maybeSingle();

    if (!countryB) {
      await supabase
        .from("countries")
        .insert({ name: teamB.trim(), flag_url: null });
    }

    // Fetch existing match details to check if score is modified
    const { data: existingMatch } = await supabase
      .from("matches")
      .select("score_a, score_b, is_calculated")
      .eq("id", matchId)
      .single();

    let shouldResetCalculation = false;
    if (existingMatch) {
      const scoreChanged = existingMatch.score_a !== scoreA || existingMatch.score_b !== scoreB;
      if (scoreChanged) {
        shouldResetCalculation = true;
      }
    }

    const updateData: any = {
      team_a: teamA.trim(),
      team_b: teamB.trim(),
      match_date: matchDate,
      kickoff_time: kickoffTime,
      score_a: scoreA,
      score_b: scoreB,
    };

    if (shouldResetCalculation) {
      updateData.is_calculated = false;
    }

    const { error } = await supabase
      .from("matches")
      .update(updateData)
      .eq("id", matchId);

    if (error) {
      return { error: `Error al modificar partido: ${error.message}` };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/admin");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Error al verificar permisos de administrador." };
  }
}
