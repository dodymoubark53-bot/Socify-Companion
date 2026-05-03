import { useState } from "react";
import { Link } from "wouter";
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.message ?? "Something went wrong");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090B] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-8 shadow-2xl">
          {!submitted ? (
            <>
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[#6366F1]/10 border border-[#6366F1]/20 mb-6 mx-auto">
                <Mail className="w-6 h-6 text-[#6366F1]" />
              </div>
              <h1 className="text-xl font-semibold text-[#FAFAFA] text-center mb-1">Reset your password</h1>
              <p className="text-sm text-[#71717A] text-center mb-6">
                Enter your email and we'll send you a reset link
              </p>

              {error && (
                <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[#A1A1AA]">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="bg-[#1C1C1F] border-[#27272A]"
                    required
                    autoFocus
                  />
                </div>
                <Button className="w-full" type="submit" disabled={loading || !email}>
                  {loading ? "Sending…" : "Send Reset Link"}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-[#71717A] hover:text-[#A1A1AA] transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to login
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-green-500/10 border border-green-500/20 mx-auto">
                <CheckCircle className="w-7 h-7 text-green-500" />
              </div>
              <h1 className="text-xl font-semibold text-[#FAFAFA]">Check your inbox</h1>
              <p className="text-sm text-[#71717A] max-w-xs mx-auto">
                We've sent a reset link to <strong className="text-[#A1A1AA]">{email}</strong>. It expires in 1 hour.
              </p>
              <p className="text-xs text-[#52525B]">Didn't receive it? Check your spam folder.</p>
              <div className="pt-2 space-y-2">
                <Button variant="outline" className="w-full" onClick={() => { setSubmitted(false); setEmail(""); }}>
                  Try a different email
                </Button>
                <Link href="/login">
                  <Button variant="ghost" className="w-full text-[#71717A]">Back to login</Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
