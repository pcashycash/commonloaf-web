"use client";

import { useState, useEffect } from "react";
import { firestoreService } from "@/lib/services/FirestoreService";
import type { User } from "@/lib/models/User";

type Step = "phone" | "confirm" | "new_user" | "success";

interface BookingModalProps {
  gatheringId: string;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export default function BookingModal({ gatheringId, onClose, onSuccess }: BookingModalProps) {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [foundUser, setFoundUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  // Animate in on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  const isPhoneValid = phone.replace(/\D/g, "").length >= 10;

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPhoneValid || isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      const user = await firestoreService.findUserByPhone(phone);
      if (user) {
        setFoundUser(user);
        setStep("confirm");
      } else {
        setStep("new_user");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmBook = async () => {
    if (!foundUser || isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      await firestoreService.registerGuestForGathering(gatheringId, foundUser);
      setStep("success");
      onSuccess(foundUser);
    } catch (err: any) {
      if (err.message === "Already registered") {
        setStep("success");
        onSuccess(foundUser);
      } else {
        setError(err.message || "Something went wrong. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewUserBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      const newUser = await firestoreService.createGuestUser(firstName.trim(), lastName.trim(), phone);
      await firestoreService.registerGuestForGathering(gatheringId, newUser);
      setStep("success");
      onSuccess(newUser);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60"
        style={{ opacity: visible ? 1 : 0, transition: "opacity 300ms ease" }}
        onClick={handleClose}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-[var(--color-secondary-background)] px-5 pt-6 pb-10"
        style={{
          transform: visible ? "translateY(0)" : "translateY(100%)",
          transition: "transform 300ms cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
        {/* Drag handle */}
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/20" />

        {step === "phone" && (
          <form onSubmit={handlePhoneSubmit} autoComplete="on" className="space-y-5">
            <div>
              <h2 className="text-2xl font-semibold text-white">What's your number?</h2>
              <p className="mt-1 text-sm text-gray-400">We'll use this to reserve your spot.</p>
            </div>

            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 000-0000"
              autoFocus
              autoComplete="tel"
              inputMode="tel"
              name="tel"
              className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-lg"
            />

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={!isPhoneValid || isLoading}
              className={`w-full rounded-xl py-4 font-semibold text-white ${
                isPhoneValid && !isLoading
                  ? "bg-[var(--color-primary)]"
                  : "bg-[var(--color-primary)] opacity-40 cursor-not-allowed"
              }`}
            >
              {isLoading ? "Looking you up…" : "Continue"}
            </button>
          </form>
        )}

        {step === "confirm" && foundUser && (
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-semibold text-white">
                Hi, {foundUser.firstName}!
              </h2>
              <p className="mt-1 text-sm text-gray-400">Tap below to grab your seat.</p>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              onClick={handleConfirmBook}
              disabled={isLoading}
              className={`w-full rounded-xl py-4 font-semibold text-white ${
                !isLoading ? "bg-[var(--color-primary)]" : "bg-[var(--color-primary)] opacity-40 cursor-not-allowed"
              }`}
            >
              {isLoading ? "Reserving…" : "Book my seat"}
            </button>

            <button
              onClick={() => { setFoundUser(null); setStep("phone"); setError(null); }}
              className="w-full text-sm text-gray-400 underline"
            >
              That's not me
            </button>
          </div>
        )}

        {step === "new_user" && (
          <form onSubmit={handleNewUserBook} className="space-y-5">
            <div>
              <h2 className="text-2xl font-semibold text-white">Just your name to get started.</h2>
              <p className="mt-1 text-sm text-gray-400">We'll have your spot saved in seconds.</p>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                autoFocus
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={!firstName.trim() || !lastName.trim() || isLoading}
              className={`w-full rounded-xl py-4 font-semibold text-white ${
                firstName.trim() && lastName.trim() && !isLoading
                  ? "bg-[var(--color-primary)]"
                  : "bg-[var(--color-primary)] opacity-40 cursor-not-allowed"
              }`}
            >
              {isLoading ? "Saving your spot…" : "Book my seat"}
            </button>

            <button
              onClick={() => { setStep("phone"); setError(null); }}
              className="w-full text-sm text-gray-400 underline"
            >
              Use a different number
            </button>
          </form>
        )}

        {step === "success" && (
          <div className="space-y-5 text-center">
            <div className="text-5xl">🎉</div>
            <div>
              <h2 className="text-2xl font-semibold text-white">You're in!</h2>
              <p className="mt-1 text-sm text-gray-400">We'll see you there.</p>
            </div>
            <button
              onClick={handleClose}
              className="w-full rounded-xl py-4 font-semibold text-white bg-[var(--color-primary)]"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </>
  );
}
