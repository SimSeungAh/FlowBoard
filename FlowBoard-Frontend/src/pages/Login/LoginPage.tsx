import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

import { login } from "@/api/auth";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useAuthStore } from "@/store/authStore";

interface LoginFormValues {
  email: string;
  password: string;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const setTokens = useAuthStore((state) => state.setTokens);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LoginFormValues>();

  const onSubmit = async (data: LoginFormValues) => {
    try {
      const response = await login(data);

      setTokens(response.accessToken, response.refreshToken);

      toast.success("로그인되었습니다.");
      navigate("/mypage");
    } catch {
      toast.error("로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.");
    }
  };

  return (
    <section className="flex w-full max-w-md flex-col justify-center px-6 py-20">
      <h1 className="mb-2 text-3xl font-bold">로그인</h1>

      <p className="mb-8 text-sm text-slate-500">계정 정보를 입력하고 로그인해주세요.</p>

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <Input
          label="이메일"
          type="email"
          placeholder="이메일을 입력하세요"
          {...register("email", { required: true })}
        />

        <Input
          label="비밀번호"
          type="password"
          placeholder="비밀번호를 입력하세요"
          {...register("password", { required: true })}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "로그인 중..." : "로그인"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        아직 계정이 없나요?{" "}
        <Link to="/signup" className="font-medium text-blue-600 hover:underline">
          회원가입
        </Link>
      </p>
    </section>
  );
}
