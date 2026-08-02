import bcrypt from "bcryptjs";

import { env } from "@/config/env";
import type { LoginInput, RegisterInput } from "@/modules/auth/auth.schemas";
import { signAccessToken } from "@/modules/auth/token.service";
import { User, type UserDocument } from "@/modules/auth/user.model";
import { AppError } from "@/shared/AppError";
import { errorCodes } from "@/shared/errorCodes";
import { httpStatus } from "@/shared/httpStatus";

// Kullanıcı bulunamasa bile bu sabit hash'e karşı bcrypt.compare çalıştırılır. Gerçek bir
// kullanıcıda bcrypt karşılaştırması ~100ms sürer; olmayan kullanıcıda anında dönülürse
// saldırgan yanıt süresine bakarak hangi e-postaların kayıtlı olduğunu anlayabilir
// (timing attack). Sabit süre için her durumda aynı işi yapıyoruz.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync("dummy-password-for-timing-safety", env.BCRYPT_SALT_ROUNDS);

function sanitizeUser(user: UserDocument) {
  const { password: _password, __v: _v, ...safeUser } = user.toJSON();
  return safeUser;
}

export async function register(input: RegisterInput) {
  const existing = await User.findOne({ email: input.email });
  if (existing) {
    // Hata mesajında e-posta adresini yazma: yoksa kayıt ekranı bir e-posta doğrulama
    // aracına dönüşür (kullanıcı enumeration).
    throw AppError.conflict("email is already in use");
  }

  const user = await User.create(input);
  const token = signAccessToken({ sub: user.id, role: user.role });

  return { user: sanitizeUser(user), token };
}

export async function login(input: LoginInput) {
  const user = await User.findOne({ email: input.email }).select("+password");

  const hash = user?.password ?? DUMMY_PASSWORD_HASH;
  const passwordMatches = await bcrypt.compare(input.password, hash);

  if (!user || !passwordMatches) {
    throw new AppError(
      "Invalid email or password",
      httpStatus.UNAUTHORIZED,
      errorCodes.INVALID_CREDENTIALS,
    );
  }

  const token = signAccessToken({ sub: user.id, role: user.role });

  return { user: sanitizeUser(user), token };
}

export async function getCurrentUser(userId: string) {
  const user = await User.findById(userId);
  if (!user) {
    throw AppError.notFound("User");
  }

  return sanitizeUser(user);
}
