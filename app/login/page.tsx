import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col px-6 pb-8 pt-20 md:items-center md:justify-center md:pt-8">
      <div className="flex flex-1 flex-col gap-10 md:w-[400px] md:flex-none">
        <div className="flex flex-col gap-2.5">
          <h1 className="font-display text-5xl text-red">식권장부</h1>
          <p className="text-[15px] text-sub">밥 한 번 산 거, 잊지 말자고요</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
