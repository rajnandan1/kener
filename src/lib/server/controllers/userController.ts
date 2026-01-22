import db from "../db/db.js";
import type { PaginationInput } from "$lib/types/common";
import { HashPassword, ValidatePassword, VerifyToken } from "./commonController.js";
import type { Cookies } from "@sveltejs/kit";
import type { UserRecordPublic } from "../types/db.js";

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

export const GetAllUsersPaginated = async (data: PaginationInput): Promise<UserRecordPublic[]> => {
  return await db.getUsersPaginated(data.page, data.limit);
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
  //if updateValue is empty, throw error
  if (!!!updateValue) {
    throw new Error("Update value cannot be empty");
  }

  switch (updateKey) {
    case "name":
      return await db.updateUserName(userID, updateValue);
    case "role":
      return await db.updateUserRole(userID, updateValue);
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

  //if data.email empty, throw error
  if (!!!data.email) {
    throw new Error("Email cannot be empty");
  }

  //if data.name empty, throw error
  if (!!!data.name) {
    throw new Error("Name cannot be empty");
  }

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
    email: data.email,
    password_hash: await HashPassword(data.password),
    name: data.name,
    role: data.role,
  };
  return await db.insertUser(user);
};

export const CreateFirstUser = async (data: { email: string; name: string; password: string }): Promise<number[]> => {
  if (!data.email) {
    throw new Error("Email cannot be empty");
  }
  if (!data.name) {
    throw new Error("Name cannot be empty");
  }
  if (!data.password) {
    throw new Error("Password cannot be empty");
  }
  if (!ValidatePassword(data.password)) {
    throw new Error(
      "Password must contain at least one digit, one lowercase letter, one uppercase letter, and have a minimum length of 8 characters",
    );
  }
  const user = {
    email: data.email,
    password_hash: await HashPassword(data.password),
    name: data.name,
    role: "admin",
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
  byUser: { role: string },
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

export const IsLoggedInSession = async (
  cookies: Cookies,
): Promise<{
  error?: string;
  action?: string;
  location?: string;
  user?: UserRecordPublic;
}> => {
  let tokenData = cookies.get("kener-user");
  if (!!!tokenData) {
    //redirect to signin page if user is not authenticated
    //throw redirect(302, base + "/signin");
    return {
      error: "User not authenticated",
      action: "redirect",
      location: "/manage/signin",
    };
  }
  const tokenUser = await VerifyToken(tokenData);
  if (!tokenUser) {
    //redirect to signin page if user is not authenticated
    // throw redirect(302, base + "/signin/logout");
    return {
      error: "User not authenticated",
      action: "redirect",
      location: "/manage/signin/logout",
    };
  }
  const userDB = await db.getUserByEmail(tokenUser.email);
  if (!userDB) {
    //redirect to signin page if user is not authenticated
    // throw redirect(302, base + "/signin");
    return {
      error: "User not authenticated",
      action: "redirect",
      location: "/manage/signin",
    };
  }
  return {
    user: userDB,
  };
};

//given a limit return total pages
export const GetTotalUserPages = async (limit: number): Promise<number> => {
  let totalUsers = await db.getTotalUsers();
  if (!totalUsers) return 0;
  let totalPages = Math.ceil(Number(totalUsers.count) / limit);
  return totalPages;
};
