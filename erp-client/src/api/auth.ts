import http from '@/api/http'
import type { ApiResult } from '@/types/api'

export interface LoginPayload {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  userId: number
  username: string
  realName: string
}

export interface CurrentUserResponse {
  userId: number
  username: string
  realName: string
  partnerId?: number | null
  status?: number | null
}

export interface ChangePasswordPayload {
  oldPassword: string
  newPassword: string
  confirmPassword: string
}

export async function loginRequest(payload: LoginPayload) {
  const response = await http.post<ApiResult<LoginResponse>>('/auth/login', payload)
  return response.data.data
}

export async function fetchCurrentUserRequest() {
  const response = await http.get<ApiResult<CurrentUserResponse>>('/auth/me')
  return response.data.data
}

export async function changePasswordRequest(payload: ChangePasswordPayload) {
  const response = await http.post<ApiResult<boolean>>('/auth/change-password', payload)
  return response.data.data
}
