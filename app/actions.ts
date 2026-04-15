'use server'

import { cookies } from "next/headers"
import { supabase } from "@/lib/supabase"

/**
 * Verifies the admin password and sets a secure cookie.
 */
export async function verifyAdminPassword(password: string) {
  const correctPassword = process.env.ADMIN_PASSWORD

  if (password === correctPassword) {
    cookies().set("admin_session", "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24, // 1 day
      path: "/",
    })
    return { success: true }
  }

  return { success: false }
}

/**
 * Checks if the current request has a valid admin session.
 */
export async function checkAdminSession() {
  const session = cookies().get("admin_session")
  return session?.value === "true"
}

/**
 * Clears the admin session.
 */
export async function logoutAdmin() {
  cookies().delete("admin_session")
}

/**
 * Verifies a room password and sets a session cookie for that room.
 */
export async function verifyRoomPassword(roomId: string, password: string) {
  const { data, error } = await supabase
    .from("rooms")
    .select("password")
    .eq("id", roomId)
    .single()

  if (error || !data) {
    return { success: false, error: "방을 찾을 수 없습니다." }
  }

  if (data.password === password) {
    cookies().set(`room_access_${roomId}`, "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    })
    return { success: true }
  }

  return { success: false, error: "비밀번호가 올바르지 않습니다." }
}

/**
 * Checks if the user has access to a specific room.
 */
export async function checkRoomAccess(roomId: string) {
  const { data, error } = await supabase
    .from("rooms")
    .select("password")
    .eq("id", roomId)
    .single()

  if (error || !data) return false
  
  // If room has no password, access is granted
  if (!data.password) return true

  // Otherwise, check for the cookie
  const session = cookies().get(`room_access_${roomId}`)
  return session?.value === "true"
}
