'use client';

import { useSession, signIn, signOut } from "next-auth/react";
import { LogIn, LogOut, User } from "lucide-react";

export function AuthButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex items-center space-x-2 px-4 py-2 text-sm text-muted-foreground">
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        <span>Loading...</span>
      </div>
    );
  }

  if (session?.user) {
    return (
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 px-3 py-1.5 bg-muted/50 rounded-lg">
          <User className="w-4 h-4 text-muted-foreground" />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-foreground">
              {session.user.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {session.user.email}
            </span>
          </div>
        </div>
        <button
          onClick={() => signOut()}
          className="flex items-center space-x-2 px-4 py-2 text-sm bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign out</span>
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn("google")}
      className="flex items-center space-x-2 px-4 py-2 text-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors"
    >
      <LogIn className="w-4 h-4" />
      <span>Sign in with Google</span>
    </button>
  );
}

