import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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

  const friendList = friends.data || [];
  const requestList = requests.data || [];

  const nameForUserId = (userId: string) => {
    const fromFriends = friendList.find((f: any) => f.id === userId)?.username;
    return fromFriends || invitesFromNames[userId] || userId;
  };

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Friends</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="friends">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="friends">Friends</TabsTrigger>
              <TabsTrigger value="requests">Requests {requestList.length ? <span className="ml-2">({requestList.length})</span> : null}</TabsTrigger>
              <TabsTrigger value="search">Search</TabsTrigger>
            </TabsList>

            <TabsContent value="friends" className="space-y-3">
              {friendList.length === 0 ? (
                <p className="text-sm text-muted-foreground">No friends yet. Use the Search tab to add people.</p>
              ) : (
                <div className="space-y-2">
                  {friendList.map((f: any) => {
                    const isOnline = !!online[f.id];
                    return (
                      <div key={f.id} className="flex items-center justify-between rounded-md border p-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={f.avatarUrl || ""} />
                            <AvatarFallback>{String(f.username || "?").slice(0, 1).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="leading-tight">
                            <div className="flex items-center gap-2">
                              <div className="font-medium">{f.username}</div>
                              <Badge variant={isOnline ? "default" : "secondary"}>{isOnline ? "Online" : "Offline"}</Badge>
                            </div>
                            <div className="text-xs text-muted-foreground">/racer/{encodeURIComponent(f.username)}</div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button size="sm" variant="secondary" onClick={() => getSocket().emit("friends:invite", { toUserId: f.id })}>
                            Invite
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => remove.mutate(f.id)} disabled={remove.isPending}>
                            Remove
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {invites.length > 0 && (
                <>
                  <Separator className="my-3" />
                  <div className="rounded-md border p-3">
                    <div className="font-medium">Recent invites</div>
                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                      {invites.map((i, idx) => (
                        <div key={idx}>Invite from {nameForUserId(i.fromUserId)}</div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="requests" className="space-y-3">
              {requestList.length === 0 ? (
                <p className="text-sm text-muted-foreground">No pending requests.</p>
              ) : (
                <div className="space-y-2">
                  {requestList.map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between rounded-md border p-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback>{String(nameForUserId(r.fromUserId)).slice(0, 1).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{nameForUserId(r.fromUserId)}</div>
                          <div className="text-xs text-muted-foreground">Friend request</div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => respond.mutate({ requestId: r.id, accept: true })} disabled={respond.isPending}>
                          Accept
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => respond.mutate({ requestId: r.id, accept: false })} disabled={respond.isPending}>
                          Decline
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="search" className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search users</label>
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type at least 2 characters..." />
                <p className="text-xs text-muted-foreground">Search by username.</p>
              </div>

              <div className="space-y-2">
                {q.trim().length < 2 ? (
                  <p className="text-sm text-muted-foreground">Start typing to search.</p>
                ) : searchResults.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No users found.</p>
                ) : (
                  searchResults.map((u) => (
                    <div key={u.id} className="flex items-center justify-between rounded-md border p-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback>{String(u.username || "?").slice(0, 1).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{u.username}</div>
                          <div className="text-xs text-muted-foreground">/racer/{encodeURIComponent(u.username)}</div>
                        </div>
                      </div>
                      <Button size="sm" onClick={() => sendRequest.mutate(u.id)} disabled={sendRequest.isPending}>
                        Add
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
