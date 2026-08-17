import { Suspense } from "react";
import { LoginCard } from "./LoginCard";

export default function LoginPage() {
  return (
    <div className="content">
      <Suspense fallback={null}>
        <LoginCard />
      </Suspense>
    </div>
  );
}
