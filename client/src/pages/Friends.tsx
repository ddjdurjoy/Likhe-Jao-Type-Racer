import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserPlus, UserCheck, UserX, Search, MessageSquare, Trash2, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Link } from "wouter";

interface User {
  id: string;
  username: string;
  avatarUrl: string | null;
  displayName: string | null;
  isFriend?: boolean; // dynamic
}

interface FriendRequest {
  id: string;
  fromUserId: string;
  fromUser: User;
  status: "pending";
}

export default function Friends() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  // Friends List
  const { data: friends, isLoading: loadingFriends } = useQuery<User[]>({
    queryKey: ["/api/friends"],
  });

  // Friend Requests
  const { data: requests, isLoading: loadingRequests } = useQuery<FriendRequest[]>({
    queryKey: ["/api/friends/requests"],
  });

  // Search
  const { data: searchResults, isLoading: loadingSearch } = useQuery<User[]>({
    queryKey: ["/api/users/search", searchQuery],
    enabled: searchQuery.length >= 2,
  });

  // Mutations
  const sendRequest = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("POST", "/api/friends/request", { toUserId: userId });
    },
    onSuccess: () => {
      toast({ title: "Friend request sent!" });
      // Ideally we'd optimize this update, but simple invalidate is safer
    },
    onError: (err: any) => {
      toast({ title: "Failed to send request", description: err.message, variant: "destructive" });
    },
  });

  const respond = useMutation({
    mutationFn: async ({ requestId, accept }: { requestId: string; accept: boolean }) => {
      await apiRequest("POST", "/api/friends/respond", { requestId, accept });
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends/requests"] });
      toast({ title: vars.accept ? "Friend added!" : "Request declined" });
    },
  });

  const removeFriend = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/friends/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      toast({ title: "Friend removed" });
    },
  });

  return (
    <div className="container max-w-4xl mx-auto p-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Friends</h1>
          <p className="text-muted-foreground">Manage your friends and requests</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <Tabs defaultValue="list" className="w-full">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="list">My Friends ({friends?.length || 0})</TabsTrigger>
              <TabsTrigger value="requests">
                Requests ({requests?.length || 0})
                {requests?.length ? (
                  <span className="ml-2 w-2 h-2 bg-primary rounded-full animate-pulse" />
                ) : null}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="mt-4">
              <Card>
                <CardContent className="p-0">
                  {loadingFriends ? (
                    <div className="p-8 flex justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : friends?.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground">
                      <p>You haven't added any friends yet.</p>
                      <Button variant="ghost" onClick={() => document.getElementById("search-input")?.focus()}>
                        Search for people
                      </Button>
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px]">
                      <div className="divide-y">
                        {friends?.map((friend) => (
                          <div key={friend.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                            <Link href={`/racer/${friend.username}`}>
                              <a className="flex items-center gap-3">
                                <Avatar>
                                  <AvatarImage src={friend.avatarUrl || undefined} />
                                  <AvatarFallback>{friend.username[0].toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{friend.displayName || friend.username}</p>
                                  <p className="text-xs text-muted-foreground">@{friend.username}</p>
                                </div>
                              </a>
                            </Link>
                            <div className="flex items-center gap-2">
                              {/* Chat placeholder - for future implementation */}
                              {/* <Button size="icon" variant="ghost" title="Message">
                                <MessageSquare className="h-4 w-4" />
                              </Button> */}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                title="Remove friend"
                                onClick={() => {
                                  if (confirm("Remove this friend?")) {
                                    removeFriend.mutate(friend.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="requests" className="mt-4">
              <Card>
                <CardContent className="p-0">
                  {loadingRequests ? (
                    <div className="p-8 flex justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : requests?.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground">
                      <p>No pending friend requests.</p>
                    </div>
                  ) : (
                      <div className="divide-y">
                        {requests?.map((req) => (
                          <div key={req.id} className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={req.fromUser.avatarUrl || undefined} />
                                <AvatarFallback>{req.fromUser.username[0].toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{req.fromUser.displayName || req.fromUser.username}</p>
                                <p className="text-xs text-muted-foreground">@{req.fromUser.username}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                onClick={() => respond.mutate({ requestId: req.id, accept: true })}
                                disabled={respond.isPending}
                              >
                                {respond.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4 mr-2" />}
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => respond.mutate({ requestId: req.id, accept: false })}
                                disabled={respond.isPending}
                              >
                                <UserX className="h-4 w-4 mr-2" />
                                Decline
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Find People</CardTitle>
              <CardDescription>Search by username</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-input"
                  placeholder="Search..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {searchQuery.length >= 2 && (
                <div className="space-y-2 mt-4">
                  {loadingSearch ? (
                    <div className="text-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
                    </div>
                  ) : searchResults?.length === 0 ? (
                    <p className="text-sm text-center text-muted-foreground py-2">No users found.</p>
                  ) : (
                    <ScrollArea className="h-[300px]">
                       <div className="space-y-2">
                         {searchResults?.map((user) => (
                           <div key={user.id} className="flex items-center justify-between p-2 rounded-lg border bg-card">
                             <Link href={`/racer/${user.username}`}>
                               <a className="flex items-center gap-2 overflow-hidden">
                                 <Avatar className="h-8 w-8">
                                   <AvatarImage src={user.avatarUrl || undefined} />
                                   <AvatarFallback>{user.username[0]}</AvatarFallback>
                                 </Avatar>
                                 <div className="truncate">
                                   <p className="text-sm font-medium truncate">{user.username}</p>
                                 </div>
                               </a>
                             </Link>
                             
                             {/* Check if already friend logic is tricky without extra data, 
                                 but the backend blocks adding friends if already added or requested. 
                                 For now just show 'Add' and handle error/success toast */}
                             <Button
                               size="icon"
                               variant="ghost"
                               className="h-8 w-8"
                               onClick={() => sendRequest.mutate(user.id)}
                               disabled={sendRequest.isPending}
                               title="Send Friend Request"
                             >
                               <UserPlus className="h-4 w-4" />
                             </Button>
                           </div>
                         ))}
                       </div>
                    </ScrollArea>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
