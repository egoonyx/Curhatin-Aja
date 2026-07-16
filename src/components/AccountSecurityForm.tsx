"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AccountSecurityForm({ currentEmail }: { currentEmail: string }) {
  const [email, setEmail] = useState(currentEmail);
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailSaving(true);
    setEmailMessage(null);
    setEmailError(null);
    const supabase = createClient();

    const { error } = await supabase.auth.updateUser({ email });

    if (error) {
      setEmailError(error.message);
    } else {
      setEmailMessage(
        "Check your inbox to confirm the new email address - it won't switch over until you click the confirmation link."
      );
    }
    setEmailSaving(false);
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMessage(null);
    setPasswordError(null);

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords don't match.");
      return;
    }

    setPasswordSaving(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setPasswordError(error.message);
    } else {
      setPasswordMessage("Password updated.");
      setNewPassword("");
      setConfirmPassword("");
    }
    setPasswordSaving(false);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleEmailSubmit} className="card space-y-4 p-6">
        <h2 className="text-sm font-semibold text-slate-700">Change email</h2>
        <div>
          <label className="label">Email address</label>
          <input
            type="email"
            required
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        {emailError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{emailError}</p>
        )}
        {emailMessage && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-600">
            {emailMessage}
          </p>
        )}
        <button type="submit" disabled={emailSaving} className="btn-primary">
          {emailSaving ? "Saving..." : "Update email"}
        </button>
      </form>

      <form onSubmit={handlePasswordSubmit} className="card space-y-4 p-6">
        <h2 className="text-sm font-semibold text-slate-700">Change password</h2>
        <div>
          <label className="label">New password</label>
          <input
            type="password"
            required
            className="input"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 6 characters"
          />
        </div>
        <div>
          <label className="label">Confirm new password</label>
          <input
            type="password"
            required
            className="input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        {passwordError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{passwordError}</p>
        )}
        {passwordMessage && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-600">
            {passwordMessage}
          </p>
        )}
        <button type="submit" disabled={passwordSaving} className="btn-primary">
          {passwordSaving ? "Saving..." : "Update password"}
        </button>
      </form>
    </div>
  );
}
