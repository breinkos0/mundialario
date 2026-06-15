"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export async function registerUser(prevState: any, formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;
  const leagueCode = formData.get("leagueCode") as string;

  if (!name || !email || !password || !confirmPassword) {
    return { error: "Todos los campos son obligatorios.", success: false };
  }

  if (password !== confirmPassword) {
    return { error: "Las contraseñas no coinciden.", success: false };
  }

  const supabase = await createClient();

  // Validate leagueCode if provided BEFORE registering
  let leagueIdToJoin = null;
  if (leagueCode && leagueCode.trim()) {
    const code = leagueCode.trim().toUpperCase();
    const { data: league, error: leagueError } = await supabase
      .from("leagues")
      .select("id")
      .eq("invite_code", code)
      .maybeSingle();

    if (leagueError || !league) {
      return { error: "El código de la liga no es válido o no existe.", success: false };
    }
    leagueIdToJoin = league.id;
  }

  // 1. Sign up the user in Supabase Auth with full_name metadata
  const { error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
      },
    },
  });

  if (signUpError) {
    return { error: signUpError.message, success: false };
  }

  // 2. If league code was provided, join the user to that league
  if (leagueIdToJoin) {
    const { data: dbUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (dbUser) {
      await supabase
        .from("league_members")
        .insert({
          league_id: leagueIdToJoin,
          user_id: dbUser.id
        });
    }
  }

  // Send email notification on registration
  const resendKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_EMAIL;

  if (resendKey && adminEmail) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: "Mundialario <onboarding@resend.dev>",
          to: adminEmail,
          subject: `🎉 ¡Nuevo Registro: ${name}!`,
          html: `<p>Se ha registrado un nuevo usuario en Mundialario:</p>
                 <ul>
                   <li><strong>Nombre:</strong> ${name}</li>
                   <li><strong>Correo:</strong> ${email}</li>
                   <li><strong>Liga unida:</strong> ${leagueCode && leagueCode.trim() ? leagueCode.trim().toUpperCase() : "Ninguna"}</li>
                 </ul>`,
        }),
      });
    } catch (e) {
      console.error("Error enviando correo de registro", e);
    }
  }

  // 3. Return success to allow frontend celebration
  return { error: "", success: true };
}

export async function loginUser(prevState: any, formData: FormData) {
  const emailOrUsername = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!emailOrUsername || !password) {
    return { error: "Todos los campos son obligatorios." };
  }

  const supabase = await createClient();
  let targetEmail = emailOrUsername.trim();

  // Resolve username to email if it's not a direct email address
  if (!targetEmail.includes("@")) {
    const { data: dbUser, error: dbUserError } = await supabase
      .from("users")
      .select("email")
      .eq("name", targetEmail)
      .maybeSingle();

    if (dbUserError || !dbUser) {
      return { error: "No se encontró ningún usuario con ese nombre de usuario." };
    }
    targetEmail = dbUser.email;
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: targetEmail,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

export async function sendResetPasswordLink(prevState: any, formData: FormData) {
  const emailOrUsername = formData.get("emailOrUsername") as string;

  if (!emailOrUsername || !emailOrUsername.trim()) {
    return { error: "El correo o nombre de usuario es obligatorio.", success: false };
  }

  const supabase = await createClient();
  let targetEmail = emailOrUsername.trim();

  // If it's a username, resolve email
  if (!targetEmail.includes("@")) {
    const { data: dbUser } = await supabase
      .from("users")
      .select("email")
      .eq("name", targetEmail)
      .maybeSingle();

    if (!dbUser) {
      return { error: "No se encontró ningún usuario con ese nombre de usuario.", success: false };
    }
    targetEmail = dbUser.email;
  }

  const { headers } = await import("next/headers");
  const headersList = await headers();
  const host = headersList.get("host") || "mundialario.vercel.app";
  const protocol = host.includes("localhost") ? "http" : "https";
  const origin = `${protocol}://${host}`;

  const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  if (error) {
    return { error: `Error al enviar correo: ${error.message}`, success: false };
  }

  return { error: "", success: true };
}

export async function updatePasswordAction(prevState: any, formData: FormData) {
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    return { error: "Todos los campos son obligatorios.", success: false };
  }

  if (password !== confirmPassword) {
    return { error: "Las contraseñas no coinciden.", success: false };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    return { error: `Error al actualizar la contraseña: ${error.message}`, success: false };
  }

  return { error: "", success: true };
}

export async function updateUserAvatar(avatarUrl: string) {
  const supabase = await createClient();

  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  if (authError || !authUser) {
    return { error: "No autenticado." };
  }

  const { error } = await supabase
    .from("users")
    .update({ avatar_url: avatarUrl })
    .eq("auth_id", authUser.id);

  if (error) {
    return { error: `Error al actualizar avatar: ${error.message}` };
  }

  return { success: true };
}
