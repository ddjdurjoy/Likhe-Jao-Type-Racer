import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function PlayerPage() {
  const me = useQuery<any>({ queryKey: ["/api/auth/me"], retry: false });

  const publicUrl = useMemo(() => {
    const u = me.data?.username;
    if (!u) return null;
    return `${window.location.origin}/racer/${encodeURIComponent(u)}`;
  }, [me.data?.username]);

  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [bio, setBio] = useState<string>("");
  const [avatarVisibility, setAvatarVisibility] = useState<"public" | "friends" | "private">("public");
  const [bioVisibility, setBioVisibility] = useState<"public" | "friends" | "private">("public");

  // When "me" loads/refetches, sync local fields
  useEffect(() => {
    if (!me.data) return;
    setAvatarUrl(me.data.avatarUrl || "");
    setBio(me.data.bio || "");
    setAvatarVisibility((me.data.avatarVisibility as any) || "public");
    setBioVisibility((me.data.bioVisibility as any) || "public");
  }, [me.data?.avatarUrl, me.data?.bio, me.data]);
  const updateProfile = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", "/api/auth/profile", {
        avatarUrl: avatarUrl.trim() ? avatarUrl.trim() : null,
        bio: bio.trim() ? bio.trim() : null,
        avatarVisibility,
        bioVisibility,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Profile updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (err: any) => {
      toast({ title: "Failed to update profile", description: err?.message || "Please try again.", variant: "destructive" as any });
    },
  });

  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("avatar", file);
      const res = await fetch("/api/auth/avatar", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Upload failed (${res.status})`);
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Avatar updated" });
      setAvatarUrl(data?.avatarUrl || "");
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (err: any) => {
      toast({ title: "Avatar upload failed", description: err?.message || "Please try again.", variant: "destructive" as any });
    },
  });

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
      <div className="p-4 sm:p-6 max-w-xl mx-auto">
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
    <div className="p-4 sm:p-6 max-w-xl mx-auto space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Public profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Avatar</label>

            <div className="flex items-center gap-3">
              {avatarUrl ? (
                // eslint-disable-next-line jsx-a11y/alt-text
                <img src={avatarUrl} className="w-12 h-12 rounded-full object-cover border border-border" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center font-semibold">
                  {me.data.username?.slice(0, 1).toUpperCase()}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadAvatar.mutate(f);
                    e.currentTarget.value = "";
                  }}
                  disabled={uploadAvatar.isPending}
                />
                <p className="text-xs text-muted-foreground">Max 2MB. PNG/JPG/WebP/GIF.</p>
              </div>
            </div>

            <div className="space-y-1 pt-1">
              <label className="text-xs text-muted-foreground">Avatar privacy</label>
              <Select value={avatarVisibility} onValueChange={(v) => setAvatarVisibility(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="friends">Friends</SelectItem>
                  <SelectItem value="private">Only me</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-medium">Bio</label>
            </div>
            <Textarea
              placeholder="Tell people about your typing style..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={500}
            />

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Bio privacy</label>
              <Select value={bioVisibility} onValueChange={(v) => setBioVisibility(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="friends">Friends</SelectItem>
                  <SelectItem value="private">Only me</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending}>
              {updateProfile.isPending ? "Saving..." : "Save profile"}
            </Button>

            {me.data?.username && (
              <Button variant="outline" asChild>
                <Link href={`/racer/${encodeURIComponent(me.data.username)}`}>View public page</Link>
              </Button>
            )}

            {publicUrl && (
              <Button
                type="button"
                variant="secondary"
                onClick={async () => {
                  await navigator.clipboard.writeText(publicUrl);
                  toast({ title: "Copied", description: publicUrl });
                }}
              >
                Copy link
              </Button>
            )}
          </div>

          {publicUrl && <p className="text-xs text-muted-foreground break-all">{publicUrl}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-muted-foreground">
            Username: <span className="text-foreground font-medium">{me.data.username}</span>
          </div>
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
