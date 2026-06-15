"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// Helper to generate a custom Post ID (PST-XXXXXX)
function generatePostId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "PST-";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function createPost(
  leagueId: string,
  content: string,
  imageUrl?: string,
  pollOptions?: string[]
) {
  const trimmedContent = content?.trim();
  if (!trimmedContent) {
    return { error: "El contenido de la publicación no puede estar vacío." };
  }

  if (trimmedContent.length > 254) {
    return { error: "El mensaje no puede superar los 254 caracteres." };
  }

  const supabase = await createClient();

  // 1. Get current authenticated user
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  if (authError || !authUser) {
    return { error: "No estás autenticado." };
  }

  // 2. Resolve internal user ID
  const { data: dbUser, error: dbUserError } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", authUser.id)
    .single();

  if (dbUserError || !dbUser) {
    return { error: "Error al resolver la información de tu usuario." };
  }

  const userId = dbUser.id;

  // 3. Check if user is a member of this league
  const { data: isMember } = await supabase
    .from("league_members")
    .select("league_id")
    .eq("league_id", leagueId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!isMember) {
    return { error: "No tienes permiso para publicar en esta liga." };
  }

  // 4. Validate poll options if present
  let cleanPollOptions: string[] | null = null;
  if (pollOptions && pollOptions.length > 0) {
    const validOptions = pollOptions.map(o => o.trim()).filter(o => o.length > 0);
    if (validOptions.length < 2 || validOptions.length > 4) {
      return { error: "Las encuestas deben tener entre 2 y 4 opciones válidas." };
    }
    cleanPollOptions = validOptions;
  }

  // 5. Insert the post
  const { error: insertError } = await supabase
    .from("league_posts")
    .insert({
      id: generatePostId(),
      league_id: leagueId,
      user_id: userId,
      content: trimmedContent,
      image_url: imageUrl || null,
      poll_options: cleanPollOptions,
    });

  if (insertError) {
    return { error: `Error al publicar: ${insertError.message}` };
  }

  revalidatePath(`/dashboard/leagues/${leagueId}`);
  return { success: true };
}

export async function votePoll(postId: string, optionIndex: number) {
  const supabase = await createClient();

  // 1. Get current authenticated user
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  if (authError || !authUser) {
    return { error: "No estás autenticado." };
  }

  // 2. Resolve internal user ID
  const { data: dbUser, error: dbUserError } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", authUser.id)
    .single();

  if (dbUserError || !dbUser) {
    return { error: "Error al resolver la información de tu usuario." };
  }

  const userId = dbUser.id;

  // 3. Get post details and verify league membership
  const { data: post, error: postError } = await supabase
    .from("league_posts")
    .select("league_id, poll_options")
    .eq("id", postId)
    .single();

  if (postError || !post) {
    return { error: "No se encontró la publicación especificada." };
  }

  if (!post.poll_options || optionIndex < 0 || optionIndex >= post.poll_options.length) {
    return { error: "Opción de encuesta inválida." };
  }

  const { data: isMember } = await supabase
    .from("league_members")
    .select("league_id")
    .eq("league_id", post.league_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!isMember) {
    return { error: "No perteneces a la liga de esta publicación." };
  }

  // 4. Record the vote (the PK unique constraint [post_id, user_id] ensures only one vote)
  const { error: voteError } = await supabase
    .from("poll_votes")
    .insert({
      post_id: postId,
      user_id: userId,
      option_index: optionIndex
    });

  if (voteError) {
    if (voteError.code === "23505") { // Unique violation in Postgres
      return { error: "Ya has votado en esta encuesta." };
    }
    return { error: `Error al registrar tu voto: ${voteError.message}` };
  }

  revalidatePath(`/dashboard/leagues/${post.league_id}`);
  return { success: true };
}

export async function deletePost(postId: string) {
  const supabase = await createClient();

  // 1. Get current authenticated user
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  if (authError || !authUser) {
    return { error: "No estás autenticado." };
  }

  // 2. Resolve internal user ID
  const { data: dbUser, error: dbUserError } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", authUser.id)
    .single();

  if (dbUserError || !dbUser) {
    return { error: "Error al resolver la información de tu usuario." };
  }

  const userId = dbUser.id;

  // 3. Fetch the post to retrieve league_id, user_id and verify owner/league owner
  const { data: post, error: postError } = await supabase
    .from("league_posts")
    .select(`
      league_id,
      user_id,
      leagues (
        owner_id
      )
    `)
    .eq("id", postId)
    .single();

  if (postError || !post) {
    return { error: "No se encontró la publicación o ya fue eliminada." };
  }

  const leagueOwnerId = Array.isArray(post.leagues)
    ? (post.leagues[0] as any)?.owner_id
    : (post.leagues as any)?.owner_id;

  const isPostAuthor = post.user_id === userId;
  const isLeagueOwner = leagueOwnerId === userId;

  if (!isPostAuthor && !isLeagueOwner) {
    return { error: "No tienes permisos para eliminar esta publicación." };
  }

  // 4. Delete the post
  const { error: deleteError } = await supabase
    .from("league_posts")
    .delete()
    .eq("id", postId);

  if (deleteError) {
    return { error: `Error al eliminar la publicación: ${deleteError.message}` };
  }

  revalidatePath(`/dashboard/leagues/${post.league_id}`);
  return { success: true };
}
