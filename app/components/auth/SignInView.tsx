"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/lib/services/AuthService";

export default function SignInView() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSignUp, setShowSignUp] = useState(false);

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isPasswordValid = password.length >= 6;
  const isButtonEnabled = isEmailValid && isPasswordValid && !isLoading;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isButtonEnabled) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await authService.signInWithEmailAndPassword(email, password);
      // Check for a ?next= redirect (e.g. from clicking "Book a Seat" on an event page)
      const next = new URLSearchParams(window.location.search).get("next");
      setTimeout(() => {
        if (next && next.startsWith("/")) {
          router.push(next);
        } else {
          router.refresh();
        }
      }, 300);
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to sign in");
      setIsLoading(false);
    }
  };

  if (showSignUp) {
    return <SignUpView onBack={() => setShowSignUp(false)} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-secondary-background)]">
      <div className="flex-1 flex flex-col justify-center px-4 py-8">
        <div className="max-w-md w-full mx-auto">
          {/* Logo */}
          <div className="flex flex-col items-center mb-12">
            <h1 className="text-5xl font-bold text-white tracking-wide" style={{ fontFamily: 'var(--font-abril), serif' }}>
              Common
            </h1>
            <h1 className="text-5xl font-bold text-white tracking-wide" style={{ fontFamily: 'var(--font-abril), serif' }}>
              Loaf
            </h1>
          </div>

          <h1 className="text-2xl font-semibold text-white mb-6">
            Sign In
          </h1>

          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-black focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-black focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                autoComplete="current-password"
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
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {errorMessage && (
            <div className="mt-4 p-3 rounded-xl bg-[var(--color-accent)] bg-opacity-90 text-white text-sm">
              {errorMessage}
            </div>
          )}

          <div className="mt-8 text-center">
            <a
              href="/gatherings"
              className="text-sm text-[var(--color-warm-apricot)] underline"
            >
              Browse upcoming dinners →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function SignUpView({ onBack }: { onBack: () => void }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isPhoneNumberValid = phoneNumber.replace(/\D/g, "").length >= 10;
  const isPasswordValid = password.length >= 6;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isVerificationCodeValid = verificationCode.length === 6 && /^\d+$/.test(verificationCode);
  const canSignUp = isPhoneNumberValid && isPasswordValid && firstName.trim().length > 0 && lastName.trim().length > 0 && isEmailValid;

  const handleSendCode = async () => {
    if (!isPhoneNumberValid) {
      setErrorMessage("Please enter a valid phone number");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // In a real implementation, you would call Firebase Phone Auth here
      // For now, we'll simulate it
      setIsCodeSent(true);
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to send verification code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAndCreate = async () => {
    if (!isVerificationCodeValid || !canSignUp) {
      setErrorMessage("Please complete all fields and enter the verification code");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await authService.createAccountWithEmailAndPassword(
        email,
        password,
        firstName,
        lastName,
        phoneNumber
      );
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to create account");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-secondary-background)]">
      <div className="flex-1 flex flex-col justify-center px-4 py-8">
        <div className="max-w-md w-full mx-auto">
          <h1 className="text-2xl font-semibold text-white mb-6">
            Create Account
          </h1>

          {!isCodeSent ? (
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSendCode(); }}>
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-white mb-2">
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First Name"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-black focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-white mb-2">
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last Name"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-black focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email Address"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-black focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              <div>
                <label htmlFor="phoneSignUp" className="block text-sm font-medium text-white mb-2">
                  Phone Number
                </label>
                <input
                  id="phoneSignUp"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Phone Number"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-black focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              <div>
                <label htmlFor="passwordSignUp" className="block text-sm font-medium text-white mb-2">
                  Password
                </label>
                <input
                  id="passwordSignUp"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-black focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              <button
                type="submit"
                disabled={!canSignUp || isLoading}
                className={`w-full py-3 rounded-xl font-semibold text-white ${
                  canSignUp && !isLoading
                    ? "bg-[var(--color-primary)]"
                    : "bg-[var(--color-primary)] opacity-50 cursor-not-allowed"
                }`}
              >
                {isLoading ? "Sending..." : "Continue"}
              </button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleVerifyAndCreate(); }}>
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-white mb-2">
                  Enter 6-digit code
                </label>
                <input
                  id="code"
                  type="text"
                  value={verificationCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setVerificationCode(value);
                  }}
                  placeholder="000000"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-black focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-center text-2xl tracking-widest"
                  maxLength={6}
                />
              </div>

              <button
                type="button"
                onClick={() => setIsCodeSent(false)}
                className="w-full text-sm text-[var(--color-warm-apricot)] underline"
              >
                Change Phone Number
              </button>

              <button
                type="submit"
                disabled={!isVerificationCodeValid || isLoading}
                className={`w-full py-3 rounded-xl font-semibold text-white ${
                  isVerificationCodeValid && !isLoading
                    ? "bg-[var(--color-primary)]"
                    : "bg-[var(--color-primary)] opacity-50 cursor-not-allowed"
                }`}
              >
                {isLoading ? "Creating..." : "Verify & Create Account"}
              </button>
            </form>
          )}

          <button
            onClick={onBack}
            className="w-full mt-4 text-sm text-[var(--color-warm-apricot)] underline"
          >
            Already have an account?
          </button>

          {errorMessage && (
            <div className="mt-4 p-3 rounded-xl bg-[var(--color-accent)] bg-opacity-90 text-white text-sm">
              {errorMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

