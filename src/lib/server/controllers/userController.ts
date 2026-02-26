import db from "../db/db.js";
import type { PaginationInput } from "$lib/types/common";
import { GenerateToken, HashPassword, ValidatePassword, VerifyToken } from "./commonController.js";
import type { Cookies } from "@sveltejs/kit";
import type { UserRecordPublic, UserRecordDashboard } from "../types/db.js";
import { GetAllSiteData } from "./controller.js";
import { siteDataToVariables } from "../notification/notification_utils.js";
import sendEmail from "../notification/email_notification.js";
import { GetGeneralEmailTemplateById } from "./generalTemplateController.js";

export interface UserUpdateInput {
  userID: number;
  updateKey: string;
  updateValue: string;
}

interface ManualUserUpdateInput {
  updateType: string;
  role?: string;
  is_active?: number;
  password?: string;
  passwordPlain?: string;
}
interface PasswordUpdateInput {
  userID: number;
  newPassword: string;
  newPlainPassword: string;
}

interface NewUserInput {
  email: string;
  name: string;
  password: string;
  plainPassword: string;
  role: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeEmail = (email: string): string => email.trim().toLowerCase();
const normalizeName = (name: string): string => name.trim().replace(/\s+/g, " ");

const validateEmailOrThrow = (email: string): string => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw new Error("Email cannot be empty");
  }
  if (!EMAIL_REGEX.test(normalizedEmail)) {
    throw new Error("Please enter a valid email address");
  }
  return normalizedEmail;
};

const validateNameOrThrow = (name: string): string => {
  const normalizedName = normalizeName(name);
  if (!normalizedName) {
    throw new Error("Name cannot be empty");
  }
  if (normalizedName.length < 2) {
    throw new Error("Name must be at least 2 characters");
  }
  if (normalizedName.length > 100) {
    throw new Error("Name must be less than 100 characters");
  }
  return normalizedName;
};

export const GetAllUsersPaginated = async (data: PaginationInput): Promise<UserRecordPublic[]> => {
  return await db.getUsersPaginated(data.page, data.limit);
};

export const GetAllUsersPaginatedDashboard = async (data: PaginationInput): Promise<UserRecordDashboard[]> => {
  const users = await db.getUsersPaginated(data.page, data.limit);
  if (users.length === 0) return [];

  // Batch fetch password statuses for all users
  const userIds = users.map((u) => u.id);
  const passwordData = await db.getUserPasswordHashesByIds(userIds);
  const passwordMap = new Map(passwordData.map((p: { id: number; password_hash: string }) => [p.id, p.password_hash]));

  return users.map((u) => ({
    ...u,
    has_password: !!(passwordMap.get(u.id) && passwordMap.get(u.id) !== ""),
  }));
};

export const GetAllUsers = async () => {
  return await db.getAllUsers();
};

export const GetUsersCount = async () => {
  return await db.getUsersCount();
};

export const GetUserPasswordHashById = async (id: number) => {
  return await db.getUserPasswordHashById(id);
};

//getUserById
export const GetUserByID = async (userID: number): Promise<UserRecordPublic | undefined> => {
  return await db.getUserById(userID);
};

//getUserById with has_password for dashboard
export const GetUserByIDDashboard = async (userID: number): Promise<UserRecordDashboard | undefined> => {
  const user = await db.getUserById(userID);
  if (!user) return undefined;

  const passwordData = await db.getUserPasswordHashById(userID);
  return {
    ...user,
    has_password: !!(passwordData && passwordData.password_hash !== ""),
  };
};

//getUserByEmail
export const GetUserByEmail = async (email: string): Promise<UserRecordPublic | undefined> => {
  return await db.getUserByEmail(email);
};

export const UpdateUserData = async (data: UserUpdateInput): Promise<number> => {
  let userID = data.userID;
  let updateKey = data.updateKey;
  let updateValue = data.updateValue;

  //if updateKey is password, throw error
  if (updateKey === "password") {
    throw new Error("Password cannot be updated using this method");
  }
  if (updateKey === "role") {
    throw new Error("Role cannot be updated using this method");
  }
  //if updateValue is empty, throw error
  if (!!!updateValue) {
    throw new Error("Update value cannot be empty");
  }

  switch (updateKey) {
    case "name":
      return await db.updateUserName(userID, updateValue);
    case "is_verified":
      return await db.updateIsVerified(userID, parseInt(updateValue));
    default:
      throw new Error("Invalid update key");
  }
};

export const CreateNewUser = async (currentUser: { role: string }, data: NewUserInput): Promise<number[]> => {
  let acceptedRoles = ["member", "editor"];
  if (!acceptedRoles.includes(data.role)) {
    throw new Error("Invalid role");
  }

  if (currentUser.role === "member") {
    throw new Error("Only admins and editors can create new users");
  }

  const normalizedEmail = validateEmailOrThrow(data.email);
  const normalizedName = validateNameOrThrow(data.name);

  //if data.password empty, throw error
  if (!!!data.password) {
    throw new Error("Password cannot be empty");
  }

  //if data.role empty, throw error
  if (!!!data.role) {
    throw new Error("Role cannot be empty");
  }

  //if data.password not equal to data.plainPassword, throw error
  if (data.password !== data.plainPassword) {
    throw new Error("Passwords do not match");
  }

  if (!ValidatePassword(data.password)) {
    throw new Error(
      "Password must contain at least 8 characters, one uppercase letter, one lowercase letter and one number",
    );
  }
  let user = {
    email: normalizedEmail,
    password_hash: await HashPassword(data.password),
    name: normalizedName,
    role: data.role,
  };
  return await db.insertUser(user);
};

export const CreateFirstUser = async (data: { email: string; name: string; password: string }): Promise<number[]> => {
  const normalizedEmail = validateEmailOrThrow(data.email);
  const normalizedName = validateNameOrThrow(data.name);
  if (!data.password) {
    throw new Error("Password cannot be empty");
  }
  if (!ValidatePassword(data.password)) {
    throw new Error(
      "Password must contain at least one digit, one lowercase letter, one uppercase letter, and have a minimum length of 8 characters",
    );
  }
  const user = {
    email: normalizedEmail,
    password_hash: await HashPassword(data.password),
    name: normalizedName,
    role: "admin",
    is_owner: "YES",
  };
  return await db.insertUser(user);
};

export const UpdatePassword = async (data: PasswordUpdateInput): Promise<number> => {
  let { userID, newPassword, newPlainPassword } = data;
  if (!ValidatePassword(newPassword)) {
    throw new Error(
      "Password must contain at least 8 characters, one uppercase letter, one lowercase letter and one number",
    );
  }
  // newPassword should match newPlainPassword
  if (newPassword !== newPlainPassword) {
    throw new Error("Passwords do not match");
  }

  //hash the password
  let hashedPassword = await HashPassword(newPassword);

  return await db.updateUserPassword({
    id: userID,
    password_hash: hashedPassword,
  });
};

export const ManualUpdateUserData = async (
  byUser: { role: string; is_owner: string },
  forUserId: number,
  data: ManualUserUpdateInput,
): Promise<number | undefined> => {
  let forUser = await db.getUserById(forUserId);
  if (!forUser) {
    throw new Error("User not found");
  }
  //only admins can update
  if (byUser.role !== "admin") {
    throw new Error("You do not have permission to update user");
  }
  // non-owner admins cannot modify other admins
  if (forUser.role === "admin" && byUser.is_owner !== "YES") {
    throw new Error("Only the owner can modify other admins");
  }
  if (data.updateType == "role") {
    if (!data.role) throw new Error("Role is required");
    return await db.updateUserRole(forUser.id, data.role);
  } else if (data.updateType == "is_active") {
    if (data.is_active === undefined) throw new Error("is_active is required");
    return await db.updateUserIsActive(forUser.id, data.is_active);
  } else if (data.updateType == "password") {
    if (!data.password || !data.passwordPlain) throw new Error("Password is required");
    return await UpdatePassword({
      userID: forUser.id,
      newPassword: data.password,
      newPlainPassword: data.passwordPlain,
    });
  }
};

export const GetLoggedInSession = async (cookies: Cookies): Promise<UserRecordPublic | null> => {
  let tokenData = cookies.get("kener-user");
  if (!!!tokenData) {
    return null;
  }
  const tokenUser = await VerifyToken(tokenData);
  if (!tokenUser) {
    return null;
  }
  const userDB = await db.getUserByEmail(tokenUser.email);
  if (!userDB) {
    return null;
  }
  if (!userDB.is_active) {
    return null;
  }
  return userDB;
};

//given a limit return total pages
export const GetTotalUserPages = async (limit: number): Promise<number> => {
  let totalUsers = await db.getTotalUsers();
  if (!totalUsers) return 0;
  let totalPages = Math.ceil(Number(totalUsers.count) / limit);
  return totalPages;
};

//send invitation email to user for account creation
export const SendInvitationEmail = async (email: string, role: string, name: string, currentUserRole: string) => {
  if (currentUserRole === "member") {
    throw new Error("Only admins and editors can create new users");
  }

  // Admins can add admin, editor, member; Editors can only add editor, member
  const acceptedRoles = currentUserRole === "admin" ? ["admin", "editor", "member"] : ["editor", "member"];
  if (!acceptedRoles.includes(role)) {
    throw new Error("Invalid role");
  }

  const normalizedEmail = validateEmailOrThrow(email);
  const normalizedName = validateNameOrThrow(name);

  // Check if user with this email already exists
  const existingUser = await db.getUserByEmail(normalizedEmail);
  if (existingUser) {
    throw new Error(`A user with email ${normalizedEmail} already exists`);
  }

  //create user with empty password and is_active = 0
  try {
    await db.insertUser({
      email: normalizedEmail,
      password_hash: "",
      name: normalizedName,
      role,
      is_active: 0,
    });
  } catch (error: unknown) {
    // Handle database constraint errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("UNIQUE constraint failed") || errorMessage.includes("duplicate")) {
      throw new Error(`A user with email ${normalizedEmail} already exists`);
    }
    throw error;
  }

  const token = await GenerateToken({
    email: normalizedEmail,
    validTill: Date.now() + 7 * 24 * 60 * 60 * 1000, //7 days
  });

  const siteData = await GetAllSiteData();
  const siteVars = siteDataToVariables(siteData);
  const siteUrl = siteVars.site_url || "";
  let link = `${siteUrl}account/invitation?view=confirm_token&token=${token}`;

  const emailVars = {
    ...siteVars,
    invitation_link: link,
  };

  const template = await GetGeneralEmailTemplateById("invite_user");
  if (template) {
    await sendEmail(
      template.template_html_body || "",
      template.template_subject || "Your Invitation to Join",
      emailVars,
      [normalizedEmail],
      undefined,
      template.template_text_body || "",
    );
  }
};

//resend invitation email to existing user with blank password
export const ResendInvitationEmail = async (email: string, currentUserRole: string) => {
  if (currentUserRole === "member") {
    throw new Error("Only admins and editors can resend invitations");
  }

  const normalizedEmail = validateEmailOrThrow(email);

  const user = await db.getUserByEmail(normalizedEmail);
  if (!user) {
    throw new Error("User not found");
  }

  const passwordData = await db.getUserPasswordHashById(user.id);
  if (passwordData && passwordData.password_hash !== "") {
    throw new Error("User has already set their password");
  }

  const token = await GenerateToken({
    email: normalizedEmail,
    validTill: Date.now() + 7 * 24 * 60 * 60 * 1000, //7 days
  });

  const siteData = await GetAllSiteData();
  const siteVars = siteDataToVariables(siteData);
  const siteUrl = siteVars.site_url || "";
  let link = `${siteUrl}account/invitation?view=confirm_token&token=${token}`;

  const emailVars = {
    ...siteVars,
    invitation_link: link,
  };

  const template = await GetGeneralEmailTemplateById("invite_user");
  if (template) {
    await sendEmail(
      template.template_html_body || "",
      template.template_subject || "Your Invitation to Join",
      emailVars,
      [email],
      undefined,
      template.template_text_body || "",
    );
  }
};

// send verification email with verification link
export const SendVerificationEmail = async (toUserId: number, currentUser: { id: number; role: string }) => {
  if (!toUserId) {
    throw new Error("User ID is required");
  }

  // Only admins/editors can send verification to other users.
  // Members can only send verification email to themselves.
  if (currentUser.role === "member" && currentUser.id !== toUserId) {
    throw new Error("You do not have permission to send verification email for this user");
  }

  const user = await db.getUserById(toUserId);
  if (!user) {
    throw new Error("User not found");
  }

  if (user.is_verified) {
    throw new Error("User email is already verified");
  }

  const token = await GenerateToken({
    email: user.email,
    validTill: Date.now() + 24 * 60 * 60 * 1000, //24 hours
  });

  const siteData = await GetAllSiteData();
  const siteVars = siteDataToVariables(siteData);
  const siteUrl = siteVars.site_url || "";
  const verificationLink = `${siteUrl}account/verify?view=confirm_token&token=${token}`;

  const emailVars = {
    ...siteVars,
    verification_link: verificationLink,
  };

  const template = await GetGeneralEmailTemplateById("verify_email");
  if (!template) {
    throw new Error("Verify email template not found");
  }
  await sendEmail(
    template.template_html_body || "",
    template.template_subject || "Verify Your Email",
    emailVars,
    [user.email],
    undefined,
    template.template_text_body || "",
  );
};
