import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "이메일을 입력해주세요.")
    .email("올바른 이메일 형식이 아닙니다."),

  password: z.string().min(8, "비밀번호는 8자 이상 입력해주세요."),
});

export type LoginForm = z.infer<typeof loginSchema>;
