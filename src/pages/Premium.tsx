import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Guild, GuildPremium } from "@shared/schema";
import {
  ChevronLeft,
  Crown,
  Loader2,
  Check,
  X,
  FileText,
  Users,
  Settings,
  LayoutDashboard,
  Sliders,
  Sparkles,
  Shield,
  Zap,
  Clock,
  AlertCircle,
  Gift,
} from "lucide-react";

type TabType = "overview" | "applications" | "config" | "settings" | "premium";

const PREMIUM_FEATURES = [
  {
    title: "Extended Applications",
    description: "Process up to 100 applications instead of 15",
    icon: FileText,
  },
  {
    title: "Priority Support",
    description: "Get faster response times from our support team",
    icon: Zap,
  },
  {
    title: "Advanced Analytics",
    description: "Access detailed statistics and insights",
    icon: Sparkles,
  },
  {
    title: "Custom Branding",
    description: "Customize the bot's appearance for your server",
    icon: Shield,
  },
];

function formatDate(dateString: string | null) {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getDaysRemaining(expiryDate: string | null): number | null {
  if (!expiryDate) return null;
  const expiry = new Date(expiryDate);
  const now = new Date();
  const diff = expiry.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function PremiumPage() {
  const { guildId } = useParams<{ guildId: string }>();
  const { isAuthenticated } = useAuth();
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [redeemSuccess, setRedeemSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("premium");

  const { data: guilds } = useQuery<Guild[]>({
    queryKey: ["/api/guilds"],
    enabled: isAuthenticated,
  });

  const guild = guilds?.find((g) => g.id === guildId);

  const { data: premium, isLoading: premiumLoading } = useQuery<GuildPremium>({
    queryKey: ["/api/guilds", guildId, "premium"],
    enabled: !!guildId && isAuthenticated,
  });

  const redeemMutation = useMutation({
    mutationFn: async (code: string) => {
      return apiRequest(`/api/guilds/${guildId}/premium/redeem`, {
        method: "POST",
        body: JSON.stringify({ code }),
      });
    },
    onSuccess: (data: any) => {
      setRedeemSuccess(data.message || "Premium activated successfully!");
      setRedeemError(null);
      setRedeemCode("");
      queryClient.invalidateQueries({ queryKey: ["/api/guilds", guildId, "premium"] });
    },
    onError: (error: any) => {
      setRedeemError(error.message || "Failed to redeem code");
      setRedeemSuccess(null);
    },
  });

  const handleRedeem = () => {
    if (!redeemCode.trim()) {
      setRedeemError("Please enter a premium code");
      return;
    }
    setRedeemError(null);
    setRedeemSuccess(null);
    redeemMutation.mutate(redeemCode.trim());
  };

  const daysRemaining = getDaysRemaining(premium?.premiumExpiry || null);

  const navItems = [
    { id: "overview" as TabType, label: "Overview", icon: LayoutDashboard, href: `/dashboard/${guildId}` },
    { id: "applications" as TabType, label: "Applications", icon: FileText, href: `/dashboard/${guildId}` },
    { id: "config" as TabType, label: "Config", icon: Sliders, href: `/dashboard/${guildId}` },
    { id: "settings" as TabType, label: "Settings", icon: Settings, href: `/dashboard/${guildId}` },
    { id: "premium" as TabType, label: "Premium", icon: Crown, href: `/dashboard/${guildId}/premium` },
  ];

  return (
    <div className="min-h-screen bg-background" data-testid="page-premium">
      <Header />

      <div className="pt-16 flex">
        <aside className="fixed left-0 top-16 bottom-0 w-64 bg-card/50 border-r border-border p-4 overflow-y-auto">
          <Link href="/servers">
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 mb-6 text-muted-foreground"
              data-testid="button-back-servers"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to Servers
            </Button>
          </Link>

          {guild && (
            <div className="mb-6 p-4 bg-card rounded-lg border border-border">
              <div className="flex flex-col items-center text-center">
                {guild.icon ? (
                  <img
                    src={guild.icon}
                    alt={guild.name}
                    className="w-16 h-16 rounded-lg mb-3"
                    data-testid="img-server-icon"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-white text-2xl font-bold mb-3">
                    {guild.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <h2 className="font-semibold text-foreground truncate max-w-full" data-testid="text-server-name">
                  {guild.name}
                </h2>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <Users className="w-3 h-3" />
                  Managing Server
                </p>
              </div>
            </div>
          )}

          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link key={item.id} href={item.href}>
                <Button
                  variant={activeTab === item.id ? "secondary" : "ghost"}
                  className={`w-full justify-start gap-2 ${
                    activeTab === item.id
                      ? "bg-primary/10 text-primary border-l-4 border-primary"
                      : "text-muted-foreground"
                  }`}
                  data-testid={`nav-${item.id}`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                  {item.id === "premium" && premium?.isPremium && (
                    <Badge variant="secondary" className="ml-auto bg-yellow-500/20 text-yellow-500">
                      Active
                    </Badge>
                  )}
                </Button>
              </Link>
            ))}
          </nav>
        </aside>

        <main className="flex-1 ml-64 p-8">
          <div className="max-w-4xl">
            <div className="flex items-center gap-3 mb-2">
              <Crown className="w-8 h-8 text-yellow-500" />
              <h1 className="font-display text-3xl font-bold" data-testid="text-premium-title">
                StaffBot Premium
              </h1>
            </div>
            <p className="text-muted-foreground mb-8">
              Unlock exclusive features and take your server to the next level
            </p>

            {premiumLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-8">
                <Card className="bg-card/80 border-border overflow-hidden">
                  <div className={`p-6 ${premium?.isPremium ? 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10' : 'bg-secondary/30'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center ${premium?.isPremium ? 'bg-yellow-500/20' : 'bg-muted'}`}>
                        <Crown className={`w-8 h-8 ${premium?.isPremium ? 'text-yellow-500' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold" data-testid="text-status-title">Premium Status</h2>
                        {premium?.isPremium ? (
                          <Badge className="bg-green-500/20 text-green-500 border-green-500/50 mt-1">
                            <Check className="w-3 h-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="mt-1">
                            <X className="w-3 h-3 mr-1" />
                            Not Active
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-6">
                    {premium?.isPremium ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Premium Since</span>
                          <span className="font-medium">{formatDate(premium.premiumSince)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Expires On</span>
                          <span className="font-medium">{formatDate(premium.premiumExpiry)}</span>
                        </div>
                        {daysRemaining !== null && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Days Remaining</span>
                            <Badge variant={daysRemaining > 7 ? "secondary" : "destructive"}>
                              <Clock className="w-3 h-3 mr-1" />
                              {daysRemaining} days
                            </Badge>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Application Limit</span>
                          <span className="font-medium">{premium.applicationsUsed} / {premium.applicationLimit}</span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${Math.min(100, (premium.applicationsUsed / premium.applicationLimit) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-4">
                        Upgrade to Premium to unlock all features and remove limits!
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-card/80 border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Gift className="w-5 h-5 text-primary" />
                      Redeem Premium Code
                    </CardTitle>
                    <CardDescription>
                      Have a premium code? Enter it below to activate premium features.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-3">
                      <Input
                        value={redeemCode}
                        onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                        placeholder="STAFF-XXXX-XXXX-XXXX-XXXX"
                        className="flex-1 font-mono bg-background"
                        data-testid="input-redeem-code"
                      />
                      <Button
                        onClick={handleRedeem}
                        disabled={redeemMutation.isPending}
                        className="gap-2"
                        data-testid="button-redeem"
                      >
                        {redeemMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Gift className="w-4 h-4" />
                        )}
                        Redeem
                      </Button>
                    </div>
                    {redeemError && (
                      <div className="mt-3 p-3 rounded-md bg-destructive/10 border border-destructive/30 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-destructive" />
                        <p className="text-sm text-destructive" data-testid="text-redeem-error">{redeemError}</p>
                      </div>
                    )}
                    {redeemSuccess && (
                      <div className="mt-3 p-3 rounded-md bg-green-500/10 border border-green-500/30 flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        <p className="text-sm text-green-500" data-testid="text-redeem-success">{redeemSuccess}</p>
                      </div>
                    )}
                    <p className="mt-3 text-xs text-muted-foreground">
                      Premium codes unlock features like extended application limits and more.
                    </p>
                  </CardContent>
                </Card>

                <div>
                  <h2 className="flex items-center gap-2 text-xl font-bold mb-4">
                    <Sparkles className="w-5 h-5 text-yellow-500" />
                    Premium Features
                  </h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    {PREMIUM_FEATURES.map((feature, index) => (
                      <Card
                        key={index}
                        className={`bg-card/80 border-border ${!premium?.isPremium ? 'opacity-60' : ''}`}
                        data-testid={`feature-card-${index}`}
                      >
                        <CardContent className="p-4 flex items-start gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${premium?.isPremium ? 'bg-yellow-500/20' : 'bg-secondary'}`}>
                            <feature.icon className={`w-5 h-5 ${premium?.isPremium ? 'text-yellow-500' : 'text-muted-foreground'}`} />
                          </div>
                          <div>
                            <h3 className="font-medium">{feature.title}</h3>
                            <p className="text-sm text-muted-foreground">{feature.description}</p>
                          </div>
                          {!premium?.isPremium && (
                            <Badge variant="outline" className="shrink-0 text-muted-foreground border-muted-foreground/30">
                              Locked
                            </Badge>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                <Card className="bg-secondary/30 border-border">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                      <div>
                        <h3 className="font-bold text-lg">Usage Limits</h3>
                        <p className="text-muted-foreground">
                          {premium?.isPremium 
                            ? `You can process up to ${premium.applicationLimit} applications.`
                            : `Free tier allows ${premium?.applicationLimit || 15} applications. Upgrade to Premium for 100!`
                          }
                        </p>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-primary">
                          {premium?.applicationsUsed || 0} / {premium?.applicationLimit || 15}
                        </div>
                        <p className="text-sm text-muted-foreground">Applications Used</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
