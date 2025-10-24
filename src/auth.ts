import NextAuth from "next-auth"
import Google from "next-auth/providers/google"

// Configure your allowed domains here
const ALLOWED_DOMAINS: string[] = [
    "incision.care",
  // Add your organization domain(s) here
  // Example: "yourcompany.com"
]

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // If no allowed domains are configured, allow all (for initial setup)
      if (ALLOWED_DOMAINS.length === 0) {
        console.warn(
          "⚠️  WARNING: No allowed domains configured in auth.ts. Any Google account can sign in."
        )
        return true
      }

      // Check if the email domain is in the allowed list
      const email = user.email
      if (!email) return false

      const domain = email.split("@")[1]
      const isAllowed = ALLOWED_DOMAINS.includes(domain)

      if (!isAllowed) {
        console.log(`Access denied for domain: ${domain}`)
        return false
      }

      return true
    },
    async session({ session }) {
      return session
    },
  },
  pages: {
    signIn: "/",
    error: "/", // Error code passed in query string as ?error=
  },
  trustHost: true,
})

