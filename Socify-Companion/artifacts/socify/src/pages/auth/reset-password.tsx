import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { KeyRound, Eye, EyeOff, CheckCircle, ArrowLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPassword() {
  const [location, setLocation] = useLocation();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const token = new URLSearchParams(window.location.search).get("token");

  useEffect(() => {
    if (!token) setError("Invalid or missing reset link. Please request a new one.");
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? "Reset failed"); return; }
      setDone(true);
      setTimeout(() => setLocation("/login"), 3000);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const strength = password.length === 0 ? 0 : password.length < 8 ? 1 : password.length < 12 ? 2 : /[A-Z]/.test(password) && /[0-9]/.test(password) ? 4 : 3;
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength];
  const strengthColor = ["", "bg-red-500", "bg-amber-500", "bg-blue-500", "bg-green-500"][strength];

  return (
    <div className="min-h-screen bg-[#09090B] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-8 shadow-2xl">
          {done ? (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-green-500/10 border border-green-500/20 mx-auto">
                <CheckCircle className="w-7 h-7 text-green-500" />
              </div>
              <h1 className="text-xl font-semibold text-[#FAFAFA]">Password reset!</h1>
              <p className="text-sm text-[#71717A]">Your password has been updated. Redirecting you to login…</p>
              <Link href="/login">
                <Button className="w-full mt-2">Go to Login</Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[#6366F1]/10 border border-[#6366F1]/20 mb-6 mx-auto">
                <KeyRound className="w-6 h-6 text-[#6366F1]" />
              </div>
              <h1 className="text-xl font-semibold text-[#FAFAFA] text-center mb-1">Choose a new password</h1>
              <p className="text-sm text-[#71717A] text-center mb-6">Must be at least 8 characters</p>

              {error && (
                <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-[#A1A1AA]">New Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="bg-[#1C1C1F] border-[#27272A] pr-10"
                      required
                    />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#A1A1AA]" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {password.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex gap-1 h-1">
                        {[1, 2, 3, 4].map(i => (
                          <div key={i} className={`flex-1 rounded-full transition-all ${i <= strength ? strengthColor : "bg-[#27272A]"}`} />
                        ))}
                      </div>
                      <p className={`text-xs ${["", "text-red-400", "text-amber-400", "text-blue-400", "text-green-400"][strength]}`}>{strengthLabel}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm" className="text-[#A1A1AA]">Confirm Password</Label>
                  <Input
                    id="confirm"
                    type={showPassword ? "text" : "password"}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repeat your password"
                    className={`bg-[#1C1C1F] border-[#27272A] ${confirm && confirm !== password ? "border-red-500/50" : confirm && confirm === password ? "border-green-500/50" : ""}`}
                    required
                  />
                </div>

                <Button className="w-full" type="submit" disabled={loading || !token || !password || !confirm}>
                  {loading ? "Resetting…" : "Reset Password"}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-[#71717A] hover:text-[#A1A1AA] transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
