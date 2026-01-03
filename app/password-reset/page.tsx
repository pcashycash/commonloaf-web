"use client";

import { useState } from "react";
import { authService } from "@/lib/services/AuthService";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function PasswordResetPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const router = useRouter();

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isButtonEnabled = isEmailValid && !isLoading;

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isButtonEnabled) return;

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await authService.resetPasswordWithEmail(email);
      setSuccessMessage("Password reset email sent! Check your inbox.");
      setTimeout(() => {
        router.push("/");
      }, 3000);
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to send password reset email");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-background)]">
      <div className="flex-1 flex flex-col justify-center px-4 py-8">
        <div className="max-w-md w-full mx-auto">
          <h1 className="text-2xl font-semibold text-[var(--color-secondary-text)] mb-6">
            Reset Password
          </h1>

          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[var(--color-text)] mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                autoComplete="email"
              />
            </div>

            <button
              type="submit"
              disabled={!isButtonEnabled}
              className={`w-full py-3 rounded-xl font-semibold text-white ${
                isButtonEnabled
                  ? "bg-[var(--color-primary)]"
                  : "bg-[var(--color-primary)] opacity-50 cursor-not-allowed"
              }`}
            >
              {isLoading ? "Sending..." : "Send Reset Email"}
            </button>
          </form>

          <Link
            href="/"
            className="block w-full mt-4 text-sm text-[var(--color-warm-apricot)] underline text-center"
          >
            Back to Sign In
          </Link>

          {errorMessage && (
            <div className="mt-4 p-3 rounded-xl bg-[var(--color-accent)] bg-opacity-90 text-white text-sm">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="mt-4 p-3 rounded-xl bg-[var(--color-secondary)] bg-opacity-90 text-white text-sm">
              {successMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

