import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getSocket } from "@/lib/socket";

export default function FriendsPage() {
  const me = useQuery<any>({ queryKey: ["/api/auth/me"], retry: false });
  const [q, setQ] = useState("");

  const friends = useQuery<any[]>({
    queryKey: ["/api/friends"],
    enabled: !!me.data,
  });

  const [online, setOnline] = useState<Record<string, boolean>>({});
  const [invites, setInvites] = useState<any[]>([]);
  const [invitesFromNames, setInvitesFromNames] = useState<Record<string, string>>({});

  // Presence + invites via socket
  useMemo(() => {
    if (!me.data) return;
    const s = getSocket();
    s.emit("presence:auth", { userId: me.data.id });
    return;
  }, [me.data]);

  useMemo(() => {
    if (!me.data || !(friends.data || []).length) return;
    const ids = (friends.data || []).map((f: any) => f.id);
    getSocket().emit("presence:who", { userIds: ids });
  }, [me.data, friends.data]);

  const requests = useQuery<any[]>({
    queryKey: ["/api/friends/requests"],
    enabled: !!me.data,
  });

  const search = useQuery<any[]>({
    queryKey: ["/api/users/search", `?q=${encodeURIComponent(q)}`],
    enabled: !!me.data && q.trim().length >= 2,
  });

  const sendRequest = useMutation({
    mutationFn: async (toUserId: string) => {
      await apiRequest("POST", "/api/friends/request", { toUserId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends/requests"] });
    },
  });

  const respond = useMutation({
    mutationFn: async ({ requestId, accept }: { requestId: string; accept: boolean }) => {
      await apiRequest("POST", "/api/friends/respond", { requestId, accept });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends/requests"] });
    },
  });

  const remove = useMutation({
    mutationFn: async (friendUserId: string) => {
      await apiRequest("POST", "/api/friends/remove", { friendUserId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
    },
  });

  const searchResults = useMemo(() => search.data || [], [search.data]);

  useMemo(() => {
    if (!me.data) return;
    const s = getSocket();

    const onPresenceUpdate = ({ userId, online }: any) => {
      setOnline((prev) => ({ ...prev, [userId]: !!online }));
    };
    const onPresenceStatus = (rows: any[]) => {
      const map: Record<string, boolean> = {};
      for (const r of rows || []) map[r.userId] = !!r.online;
      setOnline((prev) => ({ ...prev, ...map }));
    };
    const onInvite = (payload: any) => {
      setInvites((prev) => [payload, ...prev].slice(0, 5));
      // Best-effort map userId -> username from current friends list
      const friendList = friends.data || [];
      const found = friendList.find((f: any) => f.id === payload.fromUserId);
      if (found) setInvitesFromNames((prev) => ({ ...prev, [payload.fromUserId]: found.username }));
    };

    s.on("presence:update", onPresenceUpdate);
    s.on("presence:status", onPresenceStatus);
    s.on("friends:invite", onInvite);

    return () => {
      s.off("presence:update", onPresenceUpdate);
      s.off("presence:status", onPresenceStatus);
      s.off("friends:invite", onInvite);
    };
  }, [me.data]);

  if (!me.data) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Friends</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Sign in to manage friends.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Friends</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="font-medium mb-1">Search users</div>
            <div className="flex gap-2">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search username..." />
            </div>
            <div className="mt-2 space-y-2">
              {searchResults.map((u) => (
                <div key={u.id} className="flex items-center justify-between border rounded-md p-2">
                  <div>{u.username}</div>
                  <Button size="sm" onClick={() => sendRequest.mutate(u.id)} disabled={sendRequest.isPending}>
                    Add
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="font-medium mb-1">Friend requests</div>
            <div className="space-y-2">
              {(requests.data || []).map((r: any) => (
                <div key={r.id} className="flex items-center justify-between border rounded-md p-2">
                  <div>Request from: {r.fromUserId}</div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => respond.mutate({ requestId: r.id, accept: true })}>Accept</Button>
                    <Button size="sm" variant="outline" onClick={() => respond.mutate({ requestId: r.id, accept: false })}>Decline</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="font-medium mb-1">Your friends</div>
            <div className="space-y-2">
              {(friends.data || []).map((f: any) => (
                <div key={f.id} className="flex items-center justify-between border rounded-md p-2">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block w-2 h-2 rounded-full ${online[f.id] ? 'bg-green-500' : 'bg-muted-foreground/40'}`} />
                    <div>{f.username}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => getSocket().emit('friends:invite', { toUserId: f.id })}>
                      Invite
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => remove.mutate(f.id)}>
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {invites.length > 0 && (
              <div className="mt-4 border rounded-md p-3">
                <div className="font-medium mb-2">Invites</div>
                <div className="space-y-1 text-sm">
                  {invites.map((i, idx) => (
                    <div key={idx}>Invite from {i.fromUserId}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
