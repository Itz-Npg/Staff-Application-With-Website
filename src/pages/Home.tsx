import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/Header";
import { Link } from "wouter";
import {
  Bot,
  Shield,
  Users,
  Settings,
  FileText,
  Zap,
  CheckCircle,
  Terminal,
  ChevronRight,
  ExternalLink,
  BarChart3,
  MessageSquare,
  Code,
  Globe,
} from "lucide-react";
import { SiDiscord, SiGithub } from "react-icons/si";
import soulCosmicImg from "../assets/professional_develop_8179717b.jpg";
import aadityaImg from "../assets/professional_develop_11dcb99a.jpg";

const features = [
  {
    icon: FileText,
    title: "Application Forms",
    description:
      "Create customizable application forms with up to 25 questions. Perfect for staff recruitment.",
  },
  {
    icon: Shield,
    title: "Role Management",
    description:
      "Automatic role assignment on approval or rejection. Set required roles for applicants.",
  },
  {
    icon: Users,
    title: "Staff Review",
    description:
      "Dedicated review system with approve/reject buttons. Staff can manage applications efficiently.",
  },
  {
    icon: Settings,
    title: "Easy Configuration",
    description:
      "Interactive setup wizard for quick deployment. Configure questions, roles, and channels easily.",
  },
  {
    icon: BarChart3,
    title: "Statistics",
    description:
      "Track application metrics including total submissions, approval rates, and pending reviews.",
  },
  {
    icon: MessageSquare,
    title: "Notifications",
    description:
      "Automatic DM notifications to applicants about their application status updates.",
  },
];

const commands = [
  {
    name: "!application-setup",
    description: "Set up the application system with interactive wizard",
    category: "Config",
  },
  {
    name: "!application-config",
    description: "Configure questions, roles, and settings",
    category: "Config",
  },
  {
    name: "!apply",
    description: "Submit a staff application",
    category: "Utility",
  },
  {
    name: "!help",
    description: "View all available commands",
    category: "Utility",
  },
  {
    name: "!ping",
    description: "Check bot latency and response time",
    category: "Utility",
  },
];

const stats = [
  { value: "1+", label: "Active Servers" },
  { value: "100+", label: "Users Served" },
  { value: "99.9%", label: "Uptime" },
  { value: "24/7", label: "Support" },
];

const teamMembers = [
  {
    name: "Soul Cosmic",
    role: "Founder & Lead Developer",
    description: "Full Stack Developer with 6+ years of experience in building and optimizing Discord bots, web applications, and backend systems. Architected StaffBot's core features, ensuring seamless performance and user experience.",
    skills: ["Discord.js", "Node.js", "Full Stack"],
    image: soulCosmicImg,
    github: "https://github.com/SoulDevs",
    website: "https://soul.is-a.dev/",
  },
  {
    name: "Aaditya",
    role: "Web & Bot Developer",
    description: "Full-Stack Developer with 5+ years of coding experience, specializing in Discord bot development, web applications, and backend systems. Expert in building robust and scalable solutions across multiple platforms.",
    skills: ["Discord.js", "Node.js", "Web Dev"],
    image: aadityaImg,
    github: "https://github.com/Itz-Npg",
    website: "https://aaditya.is-a.dev/",
  },
];

export default function Home() {
  const handleAddToDiscord = async () => {
    try {
      const response = await fetch("/api/invite-url");
      const data = await response.json();
      if (data.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Failed to get invite URL:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background" data-testid="page-home">
      <Header />

      <section className="relative min-h-[85vh] flex items-center justify-center pt-16 circuit-pattern" data-testid="section-hero">
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-background" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="mb-8 animate-float">
            <div className="w-24 h-24 mx-auto rounded-xl bg-primary/10 border-2 border-primary flex items-center justify-center shadow-neon-xl" data-testid="icon-hero-bot">
              <Bot className="w-14 h-14 text-primary" />
            </div>
          </div>
          <Badge variant="outline" className="mb-6" data-testid="badge-version">
            <Zap className="w-3 h-3 mr-1" />
            Version 1.0 Released
          </Badge>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 uppercase tracking-wide" data-testid="text-hero-title">
            <span className="text-foreground">Staff Application</span>
            <br />
            <span className="text-neon">Made Simple</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10" data-testid="text-hero-description">
            A powerful Discord bot for managing staff applications with
            interactive setup, configurable questions, and automatic role
            management.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="gap-2" data-testid="button-hero-add-discord" onClick={handleAddToDiscord}>
              <SiDiscord className="w-5 h-5" />
              Add to Discord
              <ExternalLink className="w-4 h-4" />
            </Button>
            <Link href="/dashboard">
              <Button variant="outline" size="lg" className="gap-2 w-full sm:w-auto" data-testid="button-hero-dashboard">
                View Dashboard
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 bg-secondary/30 grid-pattern" data-testid="section-stats">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center" data-testid={`stat-item-${index}`}>
                <div
                  className="font-mono text-4xl sm:text-5xl font-bold text-primary mb-2"
                  data-testid={`text-stat-value-${index}`}
                >
                  {stat.value}
                </div>
                <div className="text-muted-foreground" data-testid={`text-stat-label-${index}`}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="py-20 sm:py-32" data-testid="section-features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4" data-testid="badge-features">
              <CheckCircle className="w-3 h-3 mr-1" />
              Features
            </Badge>
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4 uppercase" data-testid="text-features-title">
              Everything You <span className="text-neon">Need</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto" data-testid="text-features-description">
              Comprehensive features designed to streamline your staff
              recruitment process.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="bg-card/50 border-border transition-all duration-300 group hover-elevate"
                data-testid={`card-feature-${index}`}
              >
                <CardHeader>
                  <div className="w-12 h-12 rounded-md bg-primary/10 border border-border flex items-center justify-center mb-4 transition-colors" data-testid={`icon-feature-${index}`}>
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="transition-colors" data-testid={`text-feature-title-${index}`}>
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground" data-testid={`text-feature-description-${index}`}>{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="commands" className="py-20 sm:py-32 bg-secondary/20 grid-pattern" data-testid="section-commands">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4" data-testid="badge-commands">
              <Terminal className="w-3 h-3 mr-1" />
              Commands
            </Badge>
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4 uppercase" data-testid="text-commands-title">
              Available <span className="text-neon">Commands</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto" data-testid="text-commands-description">
              Simple and intuitive commands to manage your application system.
            </p>
          </div>
          <div className="max-w-3xl mx-auto space-y-4">
            {commands.map((command, index) => (
              <Card
                key={index}
                className="bg-card/50 border-border transition-all duration-300 hover-elevate"
                data-testid={`card-command-${index}`}
              >
                <CardContent className="flex items-center justify-between gap-4 p-4">
                  <div className="flex items-center gap-4 flex-wrap">
                    <code className="font-mono text-primary bg-black/50 px-3 py-1 rounded-md border border-border" data-testid={`text-command-name-${index}`}>
                      {command.name}
                    </code>
                    <span className="text-foreground" data-testid={`text-command-description-${index}`}>{command.description}</span>
                  </div>
                  <Badge variant="secondary" className="shrink-0" data-testid={`badge-command-category-${index}`}>
                    {command.category}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="team" className="py-20 sm:py-32" data-testid="section-team">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4" data-testid="badge-team">
              <Users className="w-3 h-3 mr-1" />
              Team
            </Badge>
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4 uppercase" data-testid="text-team-title">
              Meet the <span className="text-neon">Masterminds</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto" data-testid="text-team-description">
              The talented individuals behind StaffBot who combine their expertise in development and design to create the perfect application experience for your Discord server.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {teamMembers.map((member, index) => (
              <Card
                key={index}
                className="bg-card/50 border-border overflow-visible"
                data-testid={`card-team-member-${index}`}
              >
                <CardHeader className="text-center pb-2">
                  <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden border-2 border-primary" data-testid={`img-team-member-${index}`}>
                    <img 
                      src={member.image} 
                      alt={member.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <CardTitle className="text-xl" data-testid={`text-team-name-${index}`}>{member.name}</CardTitle>
                  <p className="text-primary text-sm font-medium" data-testid={`text-team-role-${index}`}>{member.role}</p>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground text-sm mb-4" data-testid={`text-team-description-${index}`}>
                    {member.description}
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 mb-4">
                    {member.skills.map((skill, skillIndex) => (
                      <Badge key={skillIndex} variant="secondary" className="text-xs" data-testid={`badge-skill-${index}-${skillIndex}`}>
                        {skill}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex justify-center gap-3">
                    <a 
                      href={member.github} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      data-testid={`link-team-github-${index}`}
                    >
                      <Button size="icon" variant="ghost">
                        <SiGithub className="w-4 h-4" />
                      </Button>
                    </a>
                    <a 
                      href={member.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      data-testid={`link-team-website-${index}`}
                    >
                      <Button size="icon" variant="ghost">
                        <Globe className="w-4 h-4" />
                      </Button>
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-32" data-testid="section-cta">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-bold mb-6 uppercase" data-testid="text-cta-title">
            Ready to <span className="text-neon">Get Started?</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-10" data-testid="text-cta-description">
            Add StaffBot to your server and set up your application system in
            minutes. It's completely free to use!
          </p>
          <Button size="lg" className="gap-2" data-testid="button-cta-add-discord" onClick={handleAddToDiscord}>
            <SiDiscord className="w-5 h-5" />
            Add to Discord
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      </section>

      <footer className="border-t border-border bg-black py-12" data-testid="footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3" data-testid="footer-logo">
              <div className="w-8 h-8 rounded-md bg-primary/20 border border-primary flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <span className="font-display font-bold text-primary">StaffBot</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground flex-wrap">
              <a href="#features" className="transition-colors hover-elevate" data-testid="link-footer-features">
                Features
              </a>
              <a href="#commands" className="transition-colors hover-elevate" data-testid="link-footer-commands">
                Commands
              </a>
              <a href="#team" className="transition-colors hover-elevate" data-testid="link-footer-team">
                Team
              </a>
              <Link href="/dashboard">
                <span className="transition-colors cursor-pointer hover-elevate" data-testid="link-footer-dashboard">
                  Dashboard
                </span>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground" data-testid="text-footer-credits">
              Made with <span className="text-primary">neon</span> vibes
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
