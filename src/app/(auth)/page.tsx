"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";

const fetchUserRole = async (userId: string) => {
  const { data, error } = await supabaseClient
    .from("users")
    .select("role")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data?.role;
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const router = useRouter();

  // Debug: log image loading events and errors for the SVG
  useEffect(() => {
    const img = new window.Image();
    img.src = "/megacompany.svg";
    img.onload = () => {
      console.log("DEBUG: Image /megacompany.svg loaded successfully.");
    };
    img.onerror = () => {
      console.error("DEBUG: Failed to load image /megacompany.svg.");
    };
  }, []);

  const validateForm = () => {
    let valid = true;
    setEmailError(null);
    setPasswordError(null);

    if (!email) {
      setEmailError("Email is required.");
      valid = false;
    } else if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,}$/.test(email)) {
      setEmailError("Please enter a valid email address.");
      valid = false;
    }

    if (!password) {
      setPasswordError("Password is required.");
      valid = false;
    }

    return valid;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error("Login Failed", {
        description: error.message,
      });
      if (
        error.message.toLowerCase().includes("invalid login credentials") ||
        error.message.toLowerCase().includes("invalid email or password")
      ) {
        setPasswordError("Invalid email or password.");
      }
      setLoading(false);
      return;
    }

    const userId = data?.user?.id;
    if (!userId) {
      toast.error("User not found after login.");
      setLoading(false);
      return;
    }

    try {
      const role = await fetchUserRole(userId);

      if (!role) {
        toast.error("User role not found.");
        setLoading(false);
        return;
      }

      toast.success("Login Successful!", {
        description: "Redirecting...",
      });

      // Use the role value as-is (with underscores); normalize to lowercase only
      const roleName = role.toLowerCase();

      if (roleName === "stock_controller") {
        router.push("/dashboard/stock-controller");
      } else if (roleName === "stock_manager") {
        router.push("/dashboard/stock-manager");
      } else if (
        roleName === "admin" ||
        roleName === "general_manager" ||
        roleName === "branch_manager"
      ) {
        router.push("/dashboard/overview");
      } else if (roleName === "cashier") {
        router.push("/pos");
      } else {
        router.push("/dashboard/overview");
      }
    } catch (err: unknown) {
      const error = err as Error;
      toast.error("Failed to fetch user role.", {
        description: error.message || "Unknown error.",
      });
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full">
      {/* Logo Image with debug handler - SVG */}
      <div className="mb-8 flex flex-col items-center">
        <Image
          src="/megacompany.svg"
          alt="Mega Company Logo"
          width={300}
          height={100}
          style={{ objectFit: "contain" }}
          priority
          onLoad={() => {
            console.log("DEBUG: <Image /> onLoad triggered for /megacompany.svg");
          }}
        />
        <span className="sr-only text-3xl font-extrabold text-primary mb-3">
          MEGA COMPANY SARL
        </span>
        <span className="sr-only text-muted-foreground text-sm">
          Welcome! Please sign in to continue.
        </span>
      </div>
      <Card className="w-full max-w-sm shadow-xl border-0 rounded-2xl">
        <CardHeader className="pb-0">
          <CardTitle className="sr-only">Login</CardTitle>
          <CardDescription className="sr-only">
            Enter your email below to login to your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 py-6">
          <form onSubmit={handleLogin} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(null);
                }}
                disabled={loading}
                autoComplete="email"
                aria-invalid={!!emailError}
                aria-describedby={emailError ? "email-error" : undefined}
              />
              {emailError && (
                <p id="email-error" className="text-red-500 text-xs mt-1">{emailError}</p>
              )}
            </div>
            <div className="space-y-1.5 relative">
              <Label htmlFor="password" className="font-medium">Password</Label>
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError(null);
                }}
                disabled={loading}
                autoComplete="current-password"
                className="pr-10"
                aria-invalid={!!passwordError}
                aria-describedby={passwordError ? "password-error" : undefined}
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-[38px] transform -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                disabled={loading}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
              {passwordError && (
                <p id="password-error" className="text-red-500 text-xs mt-1">{passwordError}</p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full mt-2 font-semibold text-lg rounded-lg py-3 shadow-sm"
              disabled={loading}
            >
              {loading ? "Signing In..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 