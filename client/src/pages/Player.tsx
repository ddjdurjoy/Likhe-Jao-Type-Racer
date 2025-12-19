import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PlayerPage() {
  const me = useQuery<any>({ queryKey: ["/api/auth/me"], retry: false });
  const signout = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/signout");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  if (!me.data) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Player</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">You are not signed in.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Player: {me.data.username}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-muted-foreground">
            Email: {me.data.email || "(none)"} {me.data.emailVerifiedAt ? "(verified)" : "(not verified)"}
          </div>
          <Button variant="destructive" onClick={() => signout.mutate()} disabled={signout.isPending}>
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
