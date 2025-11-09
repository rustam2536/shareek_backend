export interface IUser {
  name: string;
  phone: string;
  countryCode: string;
  uniqueId: string;
  status: boolean;
  isVerified: boolean;
  blocked: boolean;
  mobileToken: string;
  // referral
  email: string; // Optional with default value ""
  password: string;
  salt: string;
  role: UserRole, // Optional with default "user"
  whatsapp: string,
  profile: string,
  adId: string, 
  expiryDate: string,
  wishlist: string[],
  blockedUsers: string[],
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUserInputDTO {
  name: string;
  email: string;
  password: string;
}

export enum LoginStatus {
  IN_PROGRESS = "In_Progress",
  SUCCESS = "Success",
  FAILED = "Failed",
  LOGOUT = "LogOut"
}

export enum UserRole {
  ADMIN = "admin",
  USER = "user",
}