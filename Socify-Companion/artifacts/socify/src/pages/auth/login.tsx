import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { useStore } from "@/store/use-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Command } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("admin@socify.com");
  const [password, setPassword] = useState("password123");
  const loginMutation = useLogin();
  const { setAuth } = useStore();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ data: { email, password } }, {
      onSuccess: (data) => {
        setAuth(data.token, data.user);
        toast({ title: "Welcome back", description: "Successfully logged in." });
        setLocation("/dashboard");
      },
      onError: (err: any) => {
        toast({ title: "Login failed", description: err?.message || "Invalid credentials", variant: "destructive" });
      }
    });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 p-8 bg-card border border-border rounded-xl shadow-2xl">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="bg-primary text-primary-foreground p-3 rounded-lg mb-4">
            <Command className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Log in to SOCIFY</h2>
          <p className="text-sm text-muted-foreground mt-2">Enter your email and password to access your command center</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 mt-8">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="bg-input/50"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link href="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link>
            </div>
            <Input 
              id="password" 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="bg-input/50"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? "Logging in..." : "Log in"}
          </Button>
        </form>

        <div className="text-center mt-6">
          <p className="text-sm text-muted-foreground">
            Don't have an account? <span className="text-primary hover:underline cursor-pointer" onClick={() => setLocation("/register")}>Sign up</span>
          </p>
        </div>
      </div>
    </div>
  );
}
