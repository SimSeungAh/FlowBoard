import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

import { signup } from "@/api/auth";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

interface SignupFormValues {
  email: string;
  password: string;
  nickname: string;
}

export default function SignupPage() {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<SignupFormValues>();

  const onSubmit = async (data: SignupFormValues) => {
    try {
      await signup(data);

      toast.success("회원가입이 완료되었습니다. 로그인해주세요.");
      navigate("/login");
    } catch {
      toast.error("회원가입에 실패했습니다. 입력값을 확인해주세요.");
    }
  };

  return (
    <section className="flex w-full max-w-md flex-col justify-center px-6 py-20">
      <h1 className="mb-2 text-3xl font-bold">회원가입</h1>

      <p className="mb-8 text-sm text-slate-500">사용할 계정 정보를 입력해주세요.</p>

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <Input
          label="이메일"
          type="email"
          placeholder="이메일을 입력하세요"
          {...register("email", { required: true })}
        />

        <Input
          label="닉네임"
          placeholder="닉네임을 입력하세요"
          {...register("nickname", { required: true })}
        />

        <Input
          label="비밀번호"
          type="password"
          placeholder="비밀번호를 입력하세요"
          {...register("password", { required: true })}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "가입 중..." : "회원가입"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        이미 계정이 있나요?{" "}
        <Link to="/login" className="font-medium text-blue-600 hover:underline">
          로그인
        </Link>
      </p>
    </section>
  );
}
