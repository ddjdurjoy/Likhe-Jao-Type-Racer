import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Auth({ onAuthed }: { onAuthed?: () => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");

  const me = useQuery<any>({ queryKey: ["/api/auth/me"], retry: false });

  useEffect(() => {
    if (me.data) onAuthed?.();
  }, [me.data, onAuthed]);

  const signin = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/signin", { username, password });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const signup = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/signup", { username, password, email });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
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
          <Input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
          <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {mode === "signup" && (
            <Input placeholder="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} />
          )}

          <Button
            className="w-full"
            onClick={() => (mode === "signin" ? signin.mutate() : signup.mutate())}
            disabled={signin.isPending || signup.isPending}
          >
            {mode === "signin" ? "Sign in" : "Create account"}
          </Button>

          <Button variant="ghost" className="w-full" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
          </Button>

          {(signin.error || signup.error) && (
            <p className="text-sm text-destructive">
              {String((signin.error as any)?.message || (signup.error as any)?.message)}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
