import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  Bot,
  ChevronDown,
  Server,
  User,
  LogOut,
} from "lucide-react";
import { SiDiscord } from "react-icons/si";

export function Header() {
  const { user, isLoading, isAuthenticated, login, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [location] = useLocation();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isHome = location === "/";

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-black/95 backdrop-blur-md"
      data-testid="nav-main"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 h-16">
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer">
              <div className="w-10 h-10 rounded-md bg-primary/20 border border-primary flex items-center justify-center shadow-neon">
                <Bot className="w-6 h-6 text-primary" />
              </div>
              <span
                className="font-display font-bold text-xl text-primary"
                data-testid="text-logo"
              >
                StaffBot
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            {isHome ? (
              <>
                <a
                  href="#features"
                  className="text-muted-foreground transition-colors hover-elevate"
                  data-testid="link-nav-features"
                >
                  Features
                </a>
                <a
                  href="#commands"
                  className="text-muted-foreground transition-colors hover-elevate"
                  data-testid="link-nav-commands"
                >
                  Commands
                </a>
              </>
            ) : null}
            {isAuthenticated && (
              <Link href="/servers">
                <span
                  className="text-muted-foreground transition-colors cursor-pointer hover-elevate"
                  data-testid="link-nav-servers"
                >
                  My Servers
                </span>
              </Link>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isLoading ? (
              <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
            ) : isAuthenticated && user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 rounded-full pr-3 pl-1 py-1 bg-card border border-border hover-elevate transition-all"
                  data-testid="button-user-menu"
                >
                  <img
                    src={user.avatar}
                    alt={user.username}
                    className="w-8 h-8 rounded-full"
                    data-testid="img-user-avatar"
                  />
                  <span className="text-sm font-medium text-foreground" data-testid="text-username">
                    {user.globalName || user.username}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground transition-transform ${
                      dropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {dropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 rounded-xl bg-card border border-border shadow-lg py-2 z-50"
                    data-testid="dropdown-user-menu"
                  >
                    <div className="px-4 py-3 border-b border-border">
                      <div className="flex items-center gap-3">
                        <img
                          src={user.avatar}
                          alt={user.username}
                          className="w-10 h-10 rounded-full"
                        />
                        <div>
                          <p className="text-sm text-muted-foreground">Hey,</p>
                          <p className="font-semibold text-foreground">
                            {user.globalName || user.username}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="py-1">
                      <Link href="/servers">
                        <button
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 w-full px-4 py-2.5 text-left text-foreground hover-elevate"
                          data-testid="link-dropdown-servers"
                        >
                          <Server className="w-4 h-4 text-muted-foreground" />
                          My Servers
                        </button>
                      </Link>
                      <button
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-left text-foreground hover-elevate"
                        data-testid="link-dropdown-profile"
                      >
                        <User className="w-4 h-4 text-muted-foreground" />
                        Profile
                      </button>
                    </div>

                    <div className="border-t border-border pt-1">
                      <button
                        onClick={() => {
                          logout();
                          setDropdownOpen(false);
                        }}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-left text-red-400 hover-elevate"
                        data-testid="button-logout"
                      >
                        <LogOut className="w-4 h-4" />
                        Log out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Button
                variant="default"
                className="gap-2"
                data-testid="button-login-discord"
                onClick={login}
              >
                <SiDiscord className="w-4 h-4" />
                <span className="hidden sm:inline">Login with Discord</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
