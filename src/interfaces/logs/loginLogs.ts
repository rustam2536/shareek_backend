export interface LoginLogs {
  ip: string,
  os: string,
  lat: string,
  long: string,
  country: string,
  city: string,
  timezone: string,
  browser: string,
  loginTime?: number,
  logoutTime?: number,
  status: string,
  createdAt: number,
  userId: string,
  message: string,
  salt: string
  uniqueId: string
}
