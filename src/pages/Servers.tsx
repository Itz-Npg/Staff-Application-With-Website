import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { queryClient } from "@/lib/queryClient";
import type { Guild } from "@shared/schema";
import {
  Settings,
  Plus,
  Crown,
  Shield,
  Users,
  Loader2,
  ExternalLink,
  CheckCircle,
} from "lucide-react";

function ServerIcon({ guild }: { guild: Guild }) {
  if (guild.icon) {
    return (
      <img
        src={guild.icon}
        alt={guild.name}
        className="w-16 h-16 rounded-lg"
        data-testid={`img-server-icon-${guild.id}`}
      />
    );
  }

  const colors = [
    "from-cyan-500 to-blue-500",
    "from-purple-500 to-pink-500",
    "from-green-500 to-teal-500",
    "from-orange-500 to-red-500",
    "from-indigo-500 to-purple-500",
  ];
  const colorIndex = parseInt(guild.id.slice(-2), 16) % colors.length;

  return (
    <div
      className={`w-16 h-16 rounded-lg bg-gradient-to-br ${colors[colorIndex]} flex items-center justify-center text-white text-2xl font-bold`}
      data-testid={`icon-server-fallback-${guild.id}`}
    >
      {guild.name.charAt(0).toUpperCase()}
    </div>
  );
}

function ServerCard({ guild }: { guild: Guild }) {
  const { data: inviteData } = useQuery<{ url: string }>({
    queryKey: [`/api/invite-url?guildId=${guild.id}`],
    enabled: !guild.botAdded,
  });

  const handleInvite = () => {
    if (inviteData?.url) {
      window.open(inviteData.url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Card
      className="p-4 bg-card/80 border-border transition-all duration-200 hover-elevate"
      data-testid={`card-server-${guild.id}`}
    >
      <div className="flex items-start gap-4">
        <ServerIcon guild={guild} />
        <div className="flex-1 min-w-0">
          <h3
            className="font-semibold text-foreground truncate"
            data-testid={`text-server-name-${guild.id}`}
          >
            {guild.name}
          </h3>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {guild.owner && (
              <Badge
                variant="outline"
                className="text-yellow-400 border-yellow-400/50 gap-1"
                data-testid={`badge-owner-${guild.id}`}
              >
                <Crown className="w-3 h-3" />
                Owner
              </Badge>
            )}
            {!guild.owner && guild.isAdmin && (
              <Badge
                variant="outline"
                className="text-primary border-primary/50 gap-1"
                data-testid={`badge-admin-${guild.id}`}
              >
                <Shield className="w-3 h-3" />
                Admin
              </Badge>
            )}
            {guild.botAdded && (
              <Badge
                variant="outline"
                className="text-green-400 border-green-400/50 gap-1"
                data-testid={`badge-bot-added-${guild.id}`}
              >
                <Users className="w-3 h-3" />
                Bot Added
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4">
        {guild.botAdded ? (
          <Link href={`/dashboard/${guild.id}`}>
            <Button
              variant="default"
              className="w-full gap-2"
              data-testid={`button-manage-${guild.id}`}
            >
              <Settings className="w-4 h-4" />
              Manage
            </Button>
          </Link>
        ) : (
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleInvite}
            data-testid={`button-invite-${guild.id}`}
          >
            <Plus className="w-4 h-4" />
            Invite Bot
            <ExternalLink className="w-3 h-3" />
          </Button>
        )}
      </div>
    </Card>
  );
}

export default function Servers() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const shouldRefresh = searchParams.get("refresh") === "true";

  // Invalidate cache when returning from bot invite
  useEffect(() => {
    if (shouldRefresh && isAuthenticated) {
      queryClient.invalidateQueries({ queryKey: ["/api/guilds"] });
      // Clean up URL
      window.history.replaceState({}, "", "/servers");
    }
  }, [shouldRefresh, isAuthenticated]);

  const { data: guilds, isLoading: guildsLoading } = useQuery<Guild[]>({
    queryKey: ["/api/guilds"],
    enabled: isAuthenticated,
  });

  const isLoading = authLoading || guildsLoading;

  const addedServers = guilds?.filter((g) => g.botAdded) || [];
  const notAddedServers = guilds?.filter((g) => !g.botAdded) || [];

  return (
    <div className="min-h-screen bg-background" data-testid="page-servers">
      <Header />

      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1
            className="font-display text-3xl sm:text-4xl font-bold mb-2"
            data-testid="text-page-title"
          >
            My <span className="text-neon">Servers</span>
          </h1>
          <p className="text-muted-foreground" data-testid="text-page-description">
            Manage your Discord servers with StaffBot
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !isAuthenticated ? (
          <Card className="p-8 text-center bg-card/50">
            <p className="text-muted-foreground mb-4">
              Please connect your Discord account to view your servers.
            </p>
          </Card>
        ) : (
          <div className="space-y-10">
            {addedServers.length > 0 && (
              <section data-testid="section-added-servers">
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                  Servers with Bot ({addedServers.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {addedServers.map((guild) => (
                    <ServerCard key={guild.id} guild={guild} />
                  ))}
                </div>
              </section>
            )}

            {notAddedServers.length > 0 && (
              <section data-testid="section-not-added-servers">
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                  Add Bot to Server ({notAddedServers.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {notAddedServers.map((guild) => (
                    <ServerCard key={guild.id} guild={guild} />
                  ))}
                </div>
              </section>
            )}

            {guilds?.length === 0 && (
              <Card className="p-8 text-center bg-card/50">
                <p className="text-muted-foreground">
                  No servers found. Make sure you have admin permissions in at least one server.
                </p>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
