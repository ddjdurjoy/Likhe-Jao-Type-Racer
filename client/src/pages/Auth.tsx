import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";

export default function Auth({ onAuthed }: { onAuthed?: () => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string; email?: string }>({});
  const [email, setEmail] = useState("");

  const me = useQuery<any>({ queryKey: ["/api/auth/me"], retry: false });

  useEffect(() => {
    if (me.data) onAuthed?.();
  }, [me.data, onAuthed]);

  const clearErrors = () => {
    setFormError(null);
    setFieldErrors({});
  };

  const validate = (): boolean => {
    const next: { username?: string; password?: string; email?: string } = {};
    const normalizedUsername = username.trim();
    if (normalizedUsername.length < 3) next.username = "Username must be at least 3 characters";
    if (/\s/.test(normalizedUsername)) next.username = "Username cannot contain spaces";
    if (password.length < 6) next.password = "Password must be at least 6 characters";
    if (mode === "signup" && email.trim().length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = "Enter a valid email";
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const applyServerError = (err: any) => {
    const msg = String(err?.message || err || "");
    // apiRequest throws: "<status>: <body>"
    const idx = msg.indexOf(": ");
    const body = idx >= 0 ? msg.slice(idx + 2) : msg;
    try {
      const parsed = JSON.parse(body);
      if (parsed?.error) {
        // sometimes error is a JSON-stringified array of zod issues
        if (typeof parsed.error === "string") {
          try {
            const issues = JSON.parse(parsed.error);
            if (Array.isArray(issues)) {
              const next: any = {};
              for (const issue of issues) {
                const path0 = issue?.path?.[0];
                if (path0) next[path0] = issue.message;
              }
              if (Object.keys(next).length) {
                setFieldErrors((prev) => ({ ...prev, ...next }));
                return;
              }
            }
          } catch {}
        }
        setFormError(typeof parsed.error === "string" ? parsed.error : JSON.stringify(parsed.error));
        return;
      }
    } catch {}
    setFormError(msg);
  };

  const signin = useMutation({
    onMutate: () => {
      clearErrors();
    },
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/signin", { username, password });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (err: any) => applyServerError(err),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] }),
  });

  const signup = useMutation({
    onMutate: () => {
      clearErrors();
    },
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/signup", { username, password, email });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (err: any) => applyServerError(err),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] }),
  });

  if (me.data) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Signed in as {me.data.username}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Go to Player page or Friends page from the header/navigation.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>{mode === "signin" ? "Sign in" : "Sign up"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Input
              placeholder="Username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (fieldErrors.username) setFieldErrors((p) => ({ ...p, username: undefined }));
              }}
            />
            {fieldErrors.username && (
              <p className="text-xs text-destructive">{fieldErrors.username}</p>
            )}
          </div>
          <div className="space-y-1">
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
                }}
                className="pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="text-xs text-destructive">{fieldErrors.password}</p>
            )}
          </div>
          {mode === "signup" && (
            <div className="space-y-1">
              <Input
                placeholder="Email (optional)"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
                }}
              />
              {fieldErrors.email && (
                <p className="text-xs text-destructive">{fieldErrors.email}</p>
              )}
            </div>
          )}

          <Button
            type="button"
            className="w-full"
            onClick={() => {
              clearErrors();
              if (!validate()) return;
              mode === "signin" ? signin.mutate() : signup.mutate();
            }}
            disabled={signin.isPending || signup.isPending}
          >
            {mode === "signin" ? "Sign in" : "Create account"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
          </Button>

          {(signin.isPending || signup.isPending) && (
            <p className="text-sm text-muted-foreground">Working...</p>
          )}

          {formError && (
            <p className="text-sm text-destructive whitespace-pre-wrap">{formError}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
