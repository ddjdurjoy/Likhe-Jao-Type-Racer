import { Link, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { HeaderLogo } from "@/components/ui/HeaderLogo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { WeatherToggle } from "@/components/ui/WeatherToggle";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { SoundControls } from "@/components/ui/SoundControls";
import { Download, Settings, UserRound, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import Auth from "@/pages/Auth";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGameStore } from "@/lib/stores/gameStore";
import type { Difficulty } from "@shared/schema";
import { useEffect, useMemo, useState } from "react";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

export function AppHeader() {
  const [, setLocation] = useLocation();
  const me = useQuery<any>({ queryKey: ["/api/auth/me"], retry: false });
  const { language, setLanguage, difficulty, setDifficulty } = useGameStore();

  const [profileUsername, setProfileUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("");
  const [verifyToken, setVerifyToken] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    if (!me.data) return;
    setProfileUsername(me.data.username || "");
    setDisplayName(me.data.displayName || "");
    setFirstName(me.data.firstName || "");
    setLastName(me.data.lastName || "");
    setEmail(me.data.email || "");
    setCountry(me.data.country || "");
  }, [me.data]);

  const needsEmailVerify = useMemo(() => !!me.data?.email && !me.data?.emailVerifiedAt, [me.data]);
  const [showSettings, setShowSettings] = useState(false);
  const { canInstall, promptInstall } = useInstallPrompt();
  const [showAuth, setShowAuth] = useState(false);


  const saveProfileSettings = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", "/api/auth/settings/profile", {
        username: profileUsername,
        displayName: displayName.trim() ? displayName.trim() : null,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Profile updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (err: any) => {
      toast({ title: "Profile update failed", description: err?.message || "Please try again.", variant: "destructive" as any });
    },
  });

  const saveAccountSettings = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", "/api/auth/settings/account", {
        firstName: firstName.trim() ? firstName.trim() : null,
        lastName: lastName.trim() ? lastName.trim() : null,
        email: email.trim() ? email.trim().toLowerCase() : null,
        country: country.trim() ? country.trim().toUpperCase() : null,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Account updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (err: any) => {
      toast({ title: "Account update failed", description: err?.message || "Please try again.", variant: "destructive" as any });
    },
  });

  const requestEmailVerify = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/email/request");
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Verification requested", description: data?.devToken ? `Dev token: ${data.devToken}` : "Check your email." });
      if (data?.devToken) setVerifyToken(data.devToken);
    },
    onError: (err: any) => {
      toast({ title: "Failed to request verification", description: err?.message || "Please try again.", variant: "destructive" as any });
    },
  });

  const changePassword = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/password", { currentPassword, newPassword });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Password changed" });
      setCurrentPassword("");
      setNewPassword("");
    },
    onError: (err: any) => {
      toast({ title: "Password change failed", description: err?.message || "Please try again.", variant: "destructive" as any });
    },
  });

  const verifyEmail = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/email/verify", { token: verifyToken.trim() });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Email verified" });
      setVerifyToken("");
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (err: any) => {
      toast({ title: "Verification failed", description: err?.message || "Invalid/expired token.", variant: "destructive" as any });
    },
  });

  const signout = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/signout");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setLocation("/");
    },
  });

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-transparent">
      <div className="flex items-center justify-between gap-2 p-3 sm:p-4 sm:px-6">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <HeaderLogo size={34} />

          {/* Mobile menu */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Menu">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0">
                <SheetHeader className="p-4 border-b">
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="p-4 flex flex-col gap-2">
                  <Link href="/" className="px-3 py-2 rounded hover:bg-muted">
                    Home
                  </Link>
                  <Link href="/practice" className="px-3 py-2 rounded hover:bg-muted">
                    Practice
                  </Link>
                  <Link href="/garage" className="px-3 py-2 rounded hover:bg-muted">
                    Garage
                  </Link>
                  <Link href="/leaderboard" className="px-3 py-2 rounded hover:bg-muted">
                    Leaderboard
                  </Link>
                  {me.data && (
                    <Link href="/friends" className="px-3 py-2 rounded hover:bg-muted">
                      Friends
                    </Link>
                  )}

                  <div className="mt-3 pt-3 border-t flex flex-col gap-2">
                    {!me.data ? (
                      <Button onClick={() => setShowAuth(true)} className="w-full">
                        Sign in
                      </Button>
                    ) : (
                      <>
                        <Button variant="outline" className="w-full" asChild>
                          <Link href="/player">Profile</Link>
                        </Button>
                        <Button
                          variant="destructive"
                          className="w-full"
                          onClick={() => signout.mutate()}
                          disabled={signout.isPending}
                        >
                          Sign out
                        </Button>
                      </>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t flex flex-wrap items-center gap-2">
                    <LanguageToggle />
                    <ThemeToggle />
                    <SoundControls />
                    <WeatherToggle />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <nav className="hidden md:flex items-center gap-2 text-sm">
            <Link href="/" className="px-2 py-1 rounded hover:bg-muted">Home</Link>
            <Link href="/practice" className="px-2 py-1 rounded hover:bg-muted">Practice</Link>
            <Link href="/garage" className="px-2 py-1 rounded hover:bg-muted">Garage</Link>
            <Link href="/leaderboard" className="px-2 py-1 rounded hover:bg-muted">Leaderboard</Link>
            {me.data && (
              <>
                <Link href="/friends" className="px-2 py-1 rounded hover:bg-muted">Friends</Link>
              </>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-end min-w-0">
          <LanguageToggle />
          <div className="hidden sm:flex items-center gap-1 sm:gap-2">
            <SoundControls />
            <WeatherToggle />
          </div>
          <ThemeToggle />
          {canInstall && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Install"
              onClick={async () => {
                const res = await promptInstall();
                if (res.outcome === "accepted") {
                  toast({ title: "Installed", description: "Likhe Jao was added to your home screen." });
                }
              }}
            >
              <Download className="w-5 h-5" />
            </Button>
          )}

          <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)} aria-label="Settings">
            <Settings className="w-5 h-5" />
          </Button>

          {me.data ? (
            <>
              <Button variant="ghost" size="icon" asChild aria-label="Profile">
                <Link href="/player">
                  <UserRound className="w-5 h-5" />
                </Link>
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => signout.mutate()}
                disabled={signout.isPending}
              >
                Sign out
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => setShowAuth(true)}>Sign in</Button>
          )}
        </div>
      </div>
      <Dialog open={showAuth} onOpenChange={setShowAuth}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle>Sign in / Sign up</DialogTitle>
          </DialogHeader>
          <Auth onAuthed={() => setShowAuth(false)} redirectTo="/player" />
        </DialogContent>
      </Dialog>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="w-[95vw] max-w-xl">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="game" className="mt-2">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="game">Game</TabsTrigger>
              <TabsTrigger value="profile" disabled={!me.data}>Profile</TabsTrigger>
              <TabsTrigger value="account" disabled={!me.data}>Account</TabsTrigger>
              <TabsTrigger value="password" disabled={!me.data}>Password</TabsTrigger>
            </TabsList>

            <TabsContent value="game" className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Language</label>
                <Select value={language} onValueChange={(v) => setLanguage(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="bn">Bengali</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Difficulty</label>
                <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="profile" className="space-y-4">
              {!me.data ? (
                <p className="text-sm text-muted-foreground">Sign in to edit your profile settings.</p>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Display name</label>
                    <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={50} placeholder="Your display name" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Username (unique)</label>
                    <Input value={profileUsername} onChange={(e) => setProfileUsername(e.target.value)} maxLength={24} placeholder="username" />
                    <p className="text-xs text-muted-foreground">This affects your public link: /racer/&lt;username&gt;</p>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={() => saveProfileSettings.mutate()} disabled={saveProfileSettings.isPending}>
                      {saveProfileSettings.isPending ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="account" className="space-y-4">
              {!me.data ? (
                <p className="text-sm text-muted-foreground">Sign in to edit your account.</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">First name</label>
                      <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={50} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Last name</label>
                      <Input value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={50} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <div className="flex gap-2">
                      <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
                      {needsEmailVerify && (
                        <Button variant="secondary" onClick={() => requestEmailVerify.mutate()} disabled={requestEmailVerify.isPending}>
                          {requestEmailVerify.isPending ? "Sending..." : "Verify email"}
                        </Button>
                      )}
                    </div>
                    {me.data.email && !needsEmailVerify && (
                      <p className="text-xs text-muted-foreground">Verified</p>
                    )}
                  </div>

                  {/* Dev-only: token entry. In production, user will click link from email. */}
                  {needsEmailVerify && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Verification token</label>
                      <div className="flex gap-2">
                        <Input value={verifyToken} onChange={(e) => setVerifyToken(e.target.value)} placeholder="Paste token" />
                        <Button onClick={() => verifyEmail.mutate()} disabled={verifyEmail.isPending || verifyToken.trim().length < 6}>
                          {verifyEmail.isPending ? "Verifying..." : "Confirm"}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Dev mode: the token is returned by the server. Production: you’ll receive a link by email.
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button onClick={() => saveAccountSettings.mutate()} disabled={saveAccountSettings.isPending}>
                      {saveAccountSettings.isPending ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="password" className="space-y-4">
              {!me.data ? (
                <p className="text-sm text-muted-foreground">Sign in to change your password.</p>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Current password</label>
                    <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">New password</label>
                    <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                    <p className="text-xs text-muted-foreground">Minimum 6 characters.</p>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      onClick={() => changePassword.mutate()}
                      disabled={changePassword.isPending || currentPassword.length < 1 || newPassword.length < 6}
                    >
                      {changePassword.isPending ? "Saving..." : "Change password"}
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </header>
  );
}
