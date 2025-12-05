import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Header } from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Guild, ServerSettings, ServerStats, ApplicationsResponse, ApplicationSubmission, ApplicationConfig } from "@shared/schema";
import {
  ChevronLeft,
  ChevronRight,
  Settings,
  Users,
  Loader2,
  Check,
  X,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  HelpCircle,
  LayoutDashboard,
  Eye,
  MessageSquare,
  Sliders,
  PartyPopper,
  Crown,
  Send,
  Plus,
  Hash,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DiscordChannel {
  id: string;
  name: string;
  type: string;
  parentId?: string;
}

interface ChannelsResponse {
  textChannels: DiscordChannel[];
  categories: DiscordChannel[];
}

type TabType = "overview" | "applications" | "config" | "settings";

function getStatusIcon(status: string) {
  switch (status) {
    case "approved":
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case "rejected":
      return <XCircle className="w-4 h-4 text-destructive" />;
    default:
      return <HelpCircle className="w-4 h-4 text-yellow-500" />;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "approved":
      return (
        <Badge variant="outline" className="text-green-500 border-green-500/50 gap-1">
          <CheckCircle className="w-3 h-3" />
          Approved
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="outline" className="text-destructive border-destructive/50 gap-1">
          <XCircle className="w-3 h-3" />
          Rejected
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-yellow-500 border-yellow-500/50 gap-1">
          <Clock className="w-3 h-3" />
          Pending
        </Badge>
      );
  }
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

interface ApplicationDetailModalProps {
  application: ApplicationSubmission;
  guildId: string;
  onClose: () => void;
}

function ApplicationDetailModal({ application, guildId, onClose }: ApplicationDetailModalProps) {
  const [reason, setReason] = useState("");

  const updateApplication = useMutation({
    mutationFn: async (data: { status: string; reason?: string }) => {
      return apiRequest(`/api/guilds/${guildId}/applications/${application.applicationId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guilds", guildId, "applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/guilds", guildId, "stats"] });
      onClose();
    },
  });

  const handleAction = (status: "approved" | "rejected") => {
    updateApplication.mutate({ status, reason: reason || undefined });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <Card className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-hidden bg-card border-border">
        <CardHeader className="flex flex-row items-start justify-between gap-4 pb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <CardTitle className="text-xl" data-testid="modal-application-title">
                Application #{application.applicationId.slice(-8)}
              </CardTitle>
              {getStatusBadge(application.status)}
            </div>
            <CardDescription className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              {application.odTag}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            data-testid="button-close-modal"
          >
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {application.answers.map((answer, index) => (
                <div key={index} className="space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    {answer.question}
                  </p>
                  <div className="p-3 rounded-md bg-secondary/50 border border-border">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {answer.answer}
                    </p>
                  </div>
                </div>
              ))}

              {application.status !== "pending" && application.reason && (
                <div className="mt-6 p-4 rounded-md bg-secondary/30 border border-border">
                  <p className="text-sm font-medium text-foreground mb-2">
                    {application.status === "approved" ? "Approval" : "Rejection"} Reason
                  </p>
                  <p className="text-sm text-muted-foreground">{application.reason}</p>
                </div>
              )}
            </div>
          </ScrollArea>

          {application.status === "pending" && (
            <>
              <Separator className="my-4" />
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Reason (optional)
                  </label>
                  <Input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Add a reason for your decision..."
                    className="bg-background"
                    data-testid="input-reason"
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 gap-2 text-destructive border-destructive/50"
                    onClick={() => handleAction("rejected")}
                    disabled={updateApplication.isPending}
                    data-testid="button-reject"
                  >
                    {updateApplication.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    Reject
                  </Button>
                  <Button
                    className="flex-1 gap-2"
                    onClick={() => handleAction("approved")}
                    disabled={updateApplication.isPending}
                    data-testid="button-approve"
                  >
                    {updateApplication.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    Approve
                  </Button>
                </div>
              </div>
            </>
          )}

          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Submitted {formatDate(application.createdAt)}
              {application.reviewedAt && (
                <> | Reviewed {formatDate(application.reviewedAt)}</>
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface OverviewTabProps {
  guildId: string;
  stats: ServerStats | undefined;
  statsLoading: boolean;
}

function OverviewTab({ guildId, stats, statsLoading }: OverviewTabProps) {
  const { data: applicationsData } = useQuery<ApplicationsResponse>({
    queryKey: ["/api/guilds", guildId, "applications", { limit: 5 }],
    enabled: !!guildId,
  });

  const recentApplications = applicationsData?.applications || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold mb-2" data-testid="text-overview-title">
          Dashboard Overview
        </h2>
        <p className="text-muted-foreground">
          Monitor your staff applications at a glance
        </p>
      </div>

      {statsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="grid-stats">
            <Card className="bg-card/80 border-border" data-testid="stat-total">
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  <span className="font-mono text-2xl font-bold text-primary">
                    {stats?.totalApplications ?? 0}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">Total Applications</p>
              </CardContent>
            </Card>
            <Card className="bg-card/80 border-border" data-testid="stat-pending">
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <Clock className="w-5 h-5 text-yellow-500" />
                  <span className="font-mono text-2xl font-bold text-yellow-500">
                    {stats?.pending ?? 0}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
              </CardContent>
            </Card>
            <Card className="bg-card/80 border-border" data-testid="stat-approved">
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="font-mono text-2xl font-bold text-green-500">
                    {stats?.approved ?? 0}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">Approved</p>
              </CardContent>
            </Card>
            <Card className="bg-card/80 border-border" data-testid="stat-rejected">
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <XCircle className="w-5 h-5 text-destructive" />
                  <span className="font-mono text-2xl font-bold text-destructive">
                    {stats?.rejected ?? 0}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">Rejected</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="bg-card/80 border-border" data-testid="card-status-overview">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="w-5 h-5 text-primary" />
                  Application Status
                </CardTitle>
                <CardDescription>Breakdown by status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <span className="text-sm">Pending</span>
                    </div>
                    <span className="font-mono text-sm font-medium">{stats?.pending ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span className="text-sm">Approved</span>
                    </div>
                    <span className="font-mono text-sm font-medium">{stats?.approved ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-destructive" />
                      <span className="text-sm">Rejected</span>
                    </div>
                    <span className="font-mono text-sm font-medium">{stats?.rejected ?? 0}</span>
                  </div>
                </div>

                {(stats?.totalApplications ?? 0) > 0 && (
                  <div className="mt-6 h-3 rounded-full bg-secondary/50 overflow-hidden flex">
                    {stats?.pending && stats.pending > 0 && (
                      <div
                        className="bg-yellow-500 h-full"
                        style={{ width: `${(stats.pending / stats.totalApplications) * 100}%` }}
                      />
                    )}
                    {stats?.approved && stats.approved > 0 && (
                      <div
                        className="bg-green-500 h-full"
                        style={{ width: `${(stats.approved / stats.totalApplications) * 100}%` }}
                      />
                    )}
                    {stats?.rejected && stats.rejected > 0 && (
                      <div
                        className="bg-destructive h-full"
                        style={{ width: `${(stats.rejected / stats.totalApplications) * 100}%` }}
                      />
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card/80 border-border" data-testid="card-recent-applications">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="w-5 h-5 text-primary" />
                  Recent Applications
                </CardTitle>
                <CardDescription>Latest submissions</CardDescription>
              </CardHeader>
              <CardContent>
                {recentApplications.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No applications yet</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-3">
                      {recentApplications.map((app) => (
                        <div
                          key={app.applicationId}
                          className="flex items-center justify-between gap-2 p-2 rounded-md hover-elevate"
                          data-testid={`recent-app-${app.applicationId}`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {getStatusIcon(app.status)}
                            <span className="text-sm truncate">{app.odTag}</span>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {formatDate(app.createdAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card/80 border-border" data-testid="card-system-status">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings className="w-5 h-5 text-primary" />
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${stats?.enabled ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                  <span className="text-sm">
                    Applications {stats?.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <Separator orientation="vertical" className="h-4" />
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    {stats?.questionsCount ?? 0} Questions Configured
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

interface ApplicationsTabProps {
  guildId: string;
}

function ApplicationsTab({ guildId }: ApplicationsTabProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [selectedApplication, setSelectedApplication] = useState<ApplicationSubmission | null>(null);

  const { data, isLoading } = useQuery<ApplicationsResponse>({
    queryKey: ["/api/guilds", guildId, "applications", { status: statusFilter, page }],
    enabled: !!guildId,
  });

  const applications = data?.applications || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold mb-2" data-testid="text-applications-title">
          Staff Applications
        </h2>
        <p className="text-muted-foreground">
          Review and manage all staff applications
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {["all", "pending", "approved", "rejected"].map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setStatusFilter(status);
              setPage(1);
            }}
            className="capitalize"
            data-testid={`filter-${status}`}
          >
            {status}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : applications.length === 0 ? (
        <Card className="p-8 text-center bg-card/50">
          <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">
            No {statusFilter !== "all" ? statusFilter : ""} applications found
          </p>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {applications.map((app) => (
              <Card
                key={app.applicationId}
                className="p-4 bg-card/80 border-border hover-elevate cursor-pointer"
                onClick={() => setSelectedApplication(app)}
                data-testid={`application-card-${app.applicationId}`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {app.odTag}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        #{app.applicationId.slice(-8)} | {formatDate(app.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {getStatusBadge(app.status)}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedApplication(app);
                      }}
                      data-testid={`button-view-${app.applicationId}`}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                data-testid="button-prev-page"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground px-4">
                Page {page} of {pagination.pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page >= pagination.pages}
                data-testid="button-next-page"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {selectedApplication && (
        <ApplicationDetailModal
          application={selectedApplication}
          guildId={guildId}
          onClose={() => setSelectedApplication(null)}
        />
      )}
    </div>
  );
}

interface ConfigTabProps {
  guildId: string;
}

function ConfigTab({ guildId }: ConfigTabProps) {
  const { toast } = useToast();
  
  const { data: config, isLoading } = useQuery<ApplicationConfig>({
    queryKey: ["/api/guilds", guildId, "config"],
    enabled: !!guildId,
  });

  const { data: channelsData, isLoading: channelsLoading, refetch: refetchChannels } = useQuery<ChannelsResponse>({
    queryKey: ["/api/guilds", guildId, "channels"],
    enabled: !!guildId,
  });

  const [enabled, setEnabled] = useState(false);
  const [questions, setQuestions] = useState<string[]>([]);
  const [channelId, setChannelId] = useState("");
  const [logsChannelId, setLogsChannelId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [requiredRole, setRequiredRole] = useState("");
  const [approvedRole, setApprovedRole] = useState("");
  const [rejectedRole, setRejectedRole] = useState("");
  const [staffAdminRole, setStaffAdminRole] = useState("");
  const [cooldown, setCooldown] = useState(24);
  const [newQuestion, setNewQuestion] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (config && !initialized) {
      setEnabled(config.enabled);
      setQuestions(config.questions || []);
      setChannelId(config.channelId || "");
      setLogsChannelId(config.logsChannelId || "");
      setCategoryId(config.categoryId || "");
      setRequiredRole(config.requiredRole || "");
      setApprovedRole(config.approvedRole || "");
      setRejectedRole(config.rejectedRole || "");
      setStaffAdminRole(config.staffAdminRole || "");
      setCooldown(Math.floor((config.cooldown || 86400000) / 3600000));
      setInitialized(true);
    }
  }, [config, initialized]);

  const updateConfig = useMutation({
    mutationFn: async (data: Partial<ApplicationConfig>) => {
      return apiRequest(`/api/guilds/${guildId}/config`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guilds", guildId, "config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/guilds", guildId, "stats"] });
      setHasChanges(false);
      toast({
        title: "Config Saved",
        description: "Application configuration has been updated.",
      });
    },
  });

  const createChannels = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/guilds/${guildId}/channels/create`, {
        method: "POST",
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/guilds", guildId, "config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/guilds", guildId, "channels"] });
      setChannelId(data.applyChannel.id);
      setLogsChannelId(data.logsChannel.id);
      setCategoryId(data.category.id);
      setInitialized(false);
      toast({
        title: "Channels Created",
        description: "Application channels have been created and configured.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Channels",
        description: error?.message || "Could not create channels. Make sure the bot has Manage Channels permission.",
        variant: "destructive",
      });
    },
  });

  const handleAddQuestion = () => {
    if (newQuestion.trim() && questions.length < 25) {
      setQuestions([...questions, newQuestion.trim()]);
      setNewQuestion("");
      setHasChanges(true);
    }
  };

  const handleRemoveQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateConfig.mutate({
      enabled,
      questions,
      channelId: channelId || null,
      logsChannelId: logsChannelId || null,
      categoryId: categoryId || null,
      requiredRole: requiredRole || null,
      approvedRole: approvedRole || null,
      rejectedRole: rejectedRole || null,
      staffAdminRole: staffAdminRole || null,
      cooldown: cooldown * 3600000,
    });
  };

  const markChanged = () => setHasChanges(true);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold mb-2" data-testid="text-config-title">
          Application Config
        </h2>
        <p className="text-muted-foreground">
          Configure your staff application system
        </p>
      </div>

      <Card className="bg-card/80 border-border">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between gap-4 text-lg">
            <span>System Status</span>
            <Button
              variant={enabled ? "default" : "outline"}
              size="sm"
              onClick={() => { setEnabled(!enabled); markChanged(); }}
              data-testid="button-toggle-enabled"
            >
              {enabled ? <Check className="w-4 h-4 mr-2" /> : <X className="w-4 h-4 mr-2" />}
              {enabled ? "Enabled" : "Disabled"}
            </Button>
          </CardTitle>
          <CardDescription>
            Enable or disable the application system for this server
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="bg-card/80 border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Questions ({questions.length}/25)</CardTitle>
          <CardDescription>
            Add up to 25 questions for applicants to answer
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="Enter a new question..."
              className="bg-background"
              onKeyDown={(e) => e.key === "Enter" && handleAddQuestion()}
              data-testid="input-new-question"
            />
            <Button
              onClick={handleAddQuestion}
              disabled={!newQuestion.trim() || questions.length >= 25}
              data-testid="button-add-question"
            >
              Add
            </Button>
          </div>
          {questions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No questions configured yet
            </p>
          ) : (
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {questions.map((q, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-2 p-3 rounded-md bg-secondary/30 border border-border"
                    data-testid={`question-${i}`}
                  >
                    <span className="text-sm flex-1">{i + 1}. {q}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveQuestion(i)}
                      className="shrink-0 text-destructive"
                      data-testid={`button-remove-question-${i}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card/80 border-border">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="text-lg">Channel Configuration</CardTitle>
              <CardDescription>
                Set up the channels for applications
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchChannels()}
                disabled={channelsLoading}
                className="gap-2"
                data-testid="button-refresh-channels"
              >
                <RefreshCw className={`w-4 h-4 ${channelsLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                onClick={() => createChannels.mutate()}
                disabled={createChannels.isPending}
                className="gap-2"
                data-testid="button-create-channels"
              >
                {createChannels.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Create Default Channels
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Select existing channels from the dropdown, or click "Create Default Channels" to let the bot create them for you.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Application Channel</label>
              {channelsLoading ? (
                <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading channels...
                </div>
              ) : (
                <Select
                  value={channelId || "none"}
                  onValueChange={(value) => { setChannelId(value === "none" ? "" : value); markChanged(); }}
                >
                  <SelectTrigger className="bg-background" data-testid="select-application-channel">
                    <SelectValue placeholder="Select channel">
                      {channelId ? (
                        <span className="flex items-center gap-2">
                          <Hash className="w-4 h-4 text-muted-foreground" />
                          {channelsData?.textChannels.find(c => c.id === channelId)?.name || channelId}
                        </span>
                      ) : (
                        "Select channel"
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No channel selected</SelectItem>
                    {channelsData?.textChannels.map((channel) => (
                      <SelectItem key={channel.id} value={channel.id}>
                        <span className="flex items-center gap-2">
                          <Hash className="w-4 h-4 text-muted-foreground" />
                          {channel.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <p className="text-xs text-muted-foreground mt-1">Where users click "Apply Now"</p>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Logs Channel</label>
              {channelsLoading ? (
                <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading channels...
                </div>
              ) : (
                <Select
                  value={logsChannelId || "none"}
                  onValueChange={(value) => { setLogsChannelId(value === "none" ? "" : value); markChanged(); }}
                >
                  <SelectTrigger className="bg-background" data-testid="select-logs-channel">
                    <SelectValue placeholder="Select channel">
                      {logsChannelId ? (
                        <span className="flex items-center gap-2">
                          <Hash className="w-4 h-4 text-muted-foreground" />
                          {channelsData?.textChannels.find(c => c.id === logsChannelId)?.name || logsChannelId}
                        </span>
                      ) : (
                        "Select channel"
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No channel selected</SelectItem>
                    {channelsData?.textChannels.map((channel) => (
                      <SelectItem key={channel.id} value={channel.id}>
                        <span className="flex items-center gap-2">
                          <Hash className="w-4 h-4 text-muted-foreground" />
                          {channel.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <p className="text-xs text-muted-foreground mt-1">Where application logs are sent</p>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Category</label>
            {channelsLoading ? (
              <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading categories...
              </div>
            ) : (
              <Select
                value={categoryId || "none"}
                onValueChange={(value) => { setCategoryId(value === "none" ? "" : value); markChanged(); }}
              >
                <SelectTrigger className="bg-background max-w-md" data-testid="select-category">
                  <SelectValue placeholder="Select category">
                    {categoryId ? (
                      channelsData?.categories.find(c => c.id === categoryId)?.name || categoryId
                    ) : (
                      "Select category"
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category selected</SelectItem>
                  {channelsData?.categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <p className="text-xs text-muted-foreground mt-1">Category for application ticket channels (optional)</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/80 border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Role Configuration</CardTitle>
          <CardDescription>
            Configure roles for the application system (use Discord role IDs)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Required Role</label>
              <Input
                value={requiredRole}
                onChange={(e) => { setRequiredRole(e.target.value); markChanged(); }}
                placeholder="Role ID (optional)"
                className="bg-background"
                data-testid="input-required-role"
              />
              <p className="text-xs text-muted-foreground mt-1">Role needed to apply</p>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Staff Admin Role</label>
              <Input
                value={staffAdminRole}
                onChange={(e) => { setStaffAdminRole(e.target.value); markChanged(); }}
                placeholder="Role ID (optional)"
                className="bg-background"
                data-testid="input-staff-admin-role"
              />
              <p className="text-xs text-muted-foreground mt-1">Role to manage applications</p>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Approved Role</label>
              <Input
                value={approvedRole}
                onChange={(e) => { setApprovedRole(e.target.value); markChanged(); }}
                placeholder="Role ID (optional)"
                className="bg-background"
                data-testid="input-approved-role"
              />
              <p className="text-xs text-muted-foreground mt-1">Given when approved</p>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Rejected Role</label>
              <Input
                value={rejectedRole}
                onChange={(e) => { setRejectedRole(e.target.value); markChanged(); }}
                placeholder="Role ID (optional)"
                className="bg-background"
                data-testid="input-rejected-role"
              />
              <p className="text-xs text-muted-foreground mt-1">Given when rejected</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/80 border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Cooldown</CardTitle>
          <CardDescription>
            Time between applications from the same user
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              min="0"
              max="720"
              value={cooldown}
              onChange={(e) => { setCooldown(Number(e.target.value) || 0); markChanged(); }}
              className="bg-background w-24"
              data-testid="input-cooldown"
            />
            <span className="text-sm text-muted-foreground">hours</span>
          </div>
        </CardContent>
      </Card>

      {hasChanges && (
        <div className="flex items-center justify-end gap-4 pt-4 border-t border-border">
          <Button
            variant="ghost"
            onClick={() => {
              setInitialized(false);
              setHasChanges(false);
            }}
            data-testid="button-reset-config"
          >
            Reset
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateConfig.isPending}
            className="gap-2"
            data-testid="button-save-config"
          >
            {updateConfig.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            Save Changes
          </Button>
        </div>
      )}
    </div>
  );
}

interface SettingsTabProps {
  guildId: string;
  settings: ServerSettings | undefined;
  settingsLoading: boolean;
}

function SettingsTab({ guildId, settings, settingsLoading }: SettingsTabProps) {
  const [prefix, setPrefix] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [panelChannelId, setPanelChannelId] = useState("");
  const [logsChannelIdSetting, setLogsChannelIdSetting] = useState("");
  const [updateConfigOnSend, setUpdateConfigOnSend] = useState(true);
  const { toast } = useToast();

  const { data: channelsData, isLoading: channelsLoading, refetch: refetchChannels } = useQuery<ChannelsResponse>({
    queryKey: ["/api/guilds", guildId, "channels"],
    enabled: !!guildId,
  });

  const { data: config } = useQuery<ApplicationConfig>({
    queryKey: ["/api/guilds", guildId, "config"],
    enabled: !!guildId,
  });

  useEffect(() => {
    if (settings && prefix === null) {
      setPrefix(settings.prefix);
    }
  }, [settings, prefix]);

  useEffect(() => {
    if (config) {
      if (!panelChannelId && config.channelId) {
        setPanelChannelId(config.channelId);
      }
      if (!logsChannelIdSetting && config.logsChannelId) {
        setLogsChannelIdSetting(config.logsChannelId);
      }
    }
  }, [config, panelChannelId, logsChannelIdSetting]);

  const updateSettings = useMutation({
    mutationFn: async (data: Partial<ServerSettings>) => {
      return apiRequest(`/api/guilds/${guildId}/settings`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guilds", guildId, "settings"] });
      setHasChanges(false);
    },
  });

  const sendPanel = useMutation({
    mutationFn: async (data: { channelId?: string; updateConfig?: boolean }) => {
      return apiRequest(`/api/guilds/${guildId}/send-panel`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guilds", guildId, "config"] });
      toast({
        title: "Panel Sent",
        description: "The application panel has been sent to the selected channel.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send Panel",
        description: error?.message || "Could not send the application panel. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateLogsChannel = useMutation({
    mutationFn: async (logsChannelId: string) => {
      return apiRequest(`/api/guilds/${guildId}/config`, {
        method: "PATCH",
        body: JSON.stringify({ logsChannelId: logsChannelId || null }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guilds", guildId, "config"] });
      toast({
        title: "Logs Channel Updated",
        description: "Application logs will now be sent to the selected channel.",
      });
    },
  });

  const handlePrefixChange = (value: string) => {
    setPrefix(value);
    setHasChanges(value !== (settings?.prefix || "!"));
  };

  const handleSave = () => {
    if (prefix && prefix !== settings?.prefix) {
      updateSettings.mutate({ prefix });
    }
  };

  const handleSendPanel = () => {
    sendPanel.mutate({ 
      channelId: panelChannelId || undefined,
      updateConfig: updateConfigOnSend
    });
  };

  const handleLogsChannelChange = (channelId: string) => {
    setLogsChannelIdSetting(channelId === "none" ? "" : channelId);
    if (channelId !== "none") {
      updateLogsChannel.mutate(channelId);
    }
  };

  const currentPrefix = prefix ?? settings?.prefix ?? "!";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold mb-2" data-testid="text-settings-title">
          Server Settings
        </h2>
        <p className="text-muted-foreground">
          Configure your StaffBot experience
        </p>
      </div>

      {settingsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          <Card className="bg-card/80 border-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Command Prefix</CardTitle>
              <CardDescription>
                Set the prefix StaffBot should respond to
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                value={currentPrefix}
                onChange={(e) => handlePrefixChange(e.target.value)}
                placeholder="!"
                className="max-w-xs bg-background"
                data-testid="input-prefix"
              />
            </CardContent>
          </Card>

          <Card className="bg-card/80 border-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Language</CardTitle>
              <CardDescription>
                Default language for this server
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-background border border-border rounded-md px-4 py-3 max-w-xs">
                English
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/80 border-border">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Send className="w-5 h-5 text-primary" />
                    Send Panel
                  </CardTitle>
                  <CardDescription>
                    Send or resend the application panel to a channel
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchChannels()}
                  disabled={channelsLoading}
                  className="gap-2"
                  data-testid="button-refresh-panel-channels"
                >
                  <RefreshCw className={`w-4 h-4 ${channelsLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Select Channel</label>
                {channelsLoading ? (
                  <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading channels...
                  </div>
                ) : (
                  <Select
                    value={panelChannelId || "none"}
                    onValueChange={(value) => setPanelChannelId(value === "none" ? "" : value)}
                  >
                    <SelectTrigger className="bg-background max-w-md" data-testid="select-panel-channel">
                      <SelectValue placeholder="Select a channel">
                        {panelChannelId ? (
                          <span className="flex items-center gap-2">
                            <Hash className="w-4 h-4 text-muted-foreground" />
                            {channelsData?.textChannels.find(c => c.id === panelChannelId)?.name || panelChannelId}
                          </span>
                        ) : (
                          "Select a channel"
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select a channel...</SelectItem>
                      {channelsData?.textChannels.map((channel) => (
                        <SelectItem key={channel.id} value={channel.id}>
                          <span className="flex items-center gap-2">
                            <Hash className="w-4 h-4 text-muted-foreground" />
                            {channel.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Where the "Apply Now" button will be sent
                </p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="updateConfigOnSend"
                  checked={updateConfigOnSend}
                  onChange={(e) => setUpdateConfigOnSend(e.target.checked)}
                  className="w-4 h-4 rounded border-border"
                  data-testid="checkbox-update-config"
                />
                <label htmlFor="updateConfigOnSend" className="text-sm text-muted-foreground">
                  Set this as the default application channel
                </label>
              </div>

              <Button
                onClick={handleSendPanel}
                disabled={sendPanel.isPending || !panelChannelId}
                className="gap-2"
                data-testid="button-send-panel"
              >
                {sendPanel.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Send Panel
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-card/80 border-border">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5 text-primary" />
                Application Logs Channel
              </CardTitle>
              <CardDescription>
                Where application submissions and updates are logged
              </CardDescription>
            </CardHeader>
            <CardContent>
              {channelsLoading ? (
                <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading channels...
                </div>
              ) : (
                <Select
                  value={logsChannelIdSetting || "none"}
                  onValueChange={handleLogsChannelChange}
                >
                  <SelectTrigger className="bg-background max-w-md" data-testid="select-logs-channel-settings">
                    <SelectValue placeholder="Select logs channel">
                      {logsChannelIdSetting ? (
                        <span className="flex items-center gap-2">
                          <Hash className="w-4 h-4 text-muted-foreground" />
                          {channelsData?.textChannels.find(c => c.id === logsChannelIdSetting)?.name || logsChannelIdSetting}
                        </span>
                      ) : (
                        "Select logs channel"
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No logs channel</SelectItem>
                    {channelsData?.textChannels.map((channel) => (
                      <SelectItem key={channel.id} value={channel.id}>
                        <span className="flex items-center gap-2">
                          <Hash className="w-4 h-4 text-muted-foreground" />
                          {channel.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                All application submissions, approvals, and rejections will be logged here
              </p>
            </CardContent>
          </Card>

          {hasChanges && (
            <div className="flex items-center justify-end gap-4 pt-4 border-t border-border">
              <Button
                variant="ghost"
                onClick={() => {
                  setPrefix(settings?.prefix || "!");
                  setHasChanges(false);
                }}
                data-testid="button-reset"
              >
                Reset
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateSettings.isPending}
                className="gap-2"
                data-testid="button-save"
              >
                {updateSettings.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Save Changes
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ServerSettingsPage() {
  const { guildId } = useParams<{ guildId: string }>();
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [showBotAddedBanner, setShowBotAddedBanner] = useState(false);
  const searchString = useSearch();

  // Check for botAdded query parameter
  useEffect(() => {
    const searchParams = new URLSearchParams(searchString);
    if (searchParams.get("botAdded") === "true") {
      setShowBotAddedBanner(true);
      // Invalidate guilds cache to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/guilds"] });
      // Clean up URL
      window.history.replaceState({}, "", `/dashboard/${guildId}`);
      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => setShowBotAddedBanner(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchString, guildId]);

  const { data: guilds } = useQuery<Guild[]>({
    queryKey: ["/api/guilds"],
    enabled: isAuthenticated,
  });

  const guild = guilds?.find((g) => g.id === guildId);

  const { data: settings, isLoading: settingsLoading } = useQuery<ServerSettings>({
    queryKey: ["/api/guilds", guildId, "settings"],
    enabled: !!guildId && isAuthenticated,
  });

  const { data: stats, isLoading: statsLoading } = useQuery<ServerStats>({
    queryKey: ["/api/guilds", guildId, "stats"],
    enabled: !!guildId && isAuthenticated,
  });

  const navItems = [
    { id: "overview" as TabType, label: "Overview", icon: LayoutDashboard },
    { id: "applications" as TabType, label: "Applications", icon: FileText },
    { id: "config" as TabType, label: "Config", icon: Sliders },
    { id: "settings" as TabType, label: "Settings", icon: Settings },
  ];

  const premiumLink = { id: "premium", label: "Premium", icon: Crown, href: `/dashboard/${guildId}/premium` };

  return (
    <div className="min-h-screen bg-background" data-testid="page-server-settings">
      <Header />

      {/* Success banner when bot is added */}
      {showBotAddedBanner && (
        <div className="fixed top-16 left-0 right-0 z-40 bg-green-500/10 border-b border-green-500/30 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <PartyPopper className="w-5 h-5 text-green-500" />
              <p className="text-sm font-medium text-green-500">
                Bot successfully added to your server! You can now configure the application system.
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-green-500"
              onClick={() => setShowBotAddedBanner(false)}
              data-testid="button-dismiss-banner"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

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
              <Button
                key={item.id}
                variant={activeTab === item.id ? "secondary" : "ghost"}
                className={`w-full justify-start gap-2 ${
                  activeTab === item.id
                    ? "bg-primary/10 text-primary border-l-4 border-primary"
                    : "text-muted-foreground"
                }`}
                onClick={() => setActiveTab(item.id)}
                data-testid={`nav-${item.id}`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
                {item.id === "applications" && stats?.pending && stats.pending > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {stats.pending}
                  </Badge>
                )}
              </Button>
            ))}
            <Link href={premiumLink.href}>
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 text-muted-foreground"
                data-testid="nav-premium"
              >
                <Crown className="w-4 h-4 text-yellow-500" />
                {premiumLink.label}
              </Button>
            </Link>
          </nav>
        </aside>

        <main className="flex-1 ml-64 p-8">
          <div className="max-w-4xl">
            {activeTab === "overview" && (
              <OverviewTab guildId={guildId!} stats={stats} statsLoading={statsLoading} />
            )}
            {activeTab === "applications" && (
              <ApplicationsTab guildId={guildId!} />
            )}
            {activeTab === "config" && (
              <ConfigTab guildId={guildId!} />
            )}
            {activeTab === "settings" && (
              <SettingsTab guildId={guildId!} settings={settings} settingsLoading={settingsLoading} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
