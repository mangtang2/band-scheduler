'use server'

import { cookies } from "next/headers"
import { supabase } from "@/lib/supabase"
import { createClient } from "@supabase/supabase-js"

// 관리자 전용 우회(Bypass RLS) 클라이언트
// .env에 SUPABASE_SERVICE_ROLE_KEY가 등록되어 있어야만 작동합니다.
const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  : supabase // 키가 없으면 기존 anon 키로 임시 동작(경고용)

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

/**
 * Safely deletes a room from the server side.
 * Requires a valid admin session.
 */
export async function deleteRoom(roomId: string) {
  const isAdmin = await checkAdminSession()
  if (!isAdmin) {
    return { success: false, error: "관리자 권한이 없습니다." }
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("SUPABASE_SERVICE_ROLE_KEY가 없어 권한 문제가 발생할 수 있습니다.")
  }

  const { error } = await supabaseAdmin
    .from("rooms")
    .delete()
    .eq("id", roomId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}
