import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import GitHubProvider from "next-auth/providers/github"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account && user.email) {
        try {
          // Zkontroluj, zda uživatel již existuje
          const existingUser = await sql`
            SELECT id FROM user_profiles WHERE email = ${user.email}
          `

          if (existingUser.length === 0) {
            // Vytvoř nový profil uživatele
            await sql`
              INSERT INTO user_profiles (id, email, name, role)
              VALUES (${user.id}, ${user.email}, ${user.name || ""}, 'user')
            `
          } else {
            // Aktualizuj existující profil
            await sql`
              UPDATE user_profiles 
              SET name = ${user.name || ""}, updated_at = NOW()
              WHERE email = ${user.email}
            `
          }
        } catch (error) {
          console.error("Error creating/updating user profile:", error)
          return false
        }
      }
      return true
    },
    async session({ session, token }) {
      if (session.user?.email) {
        try {
          const userProfile = await sql`
            SELECT id, role FROM user_profiles WHERE email = ${session.user.email}
          `
          if (userProfile.length > 0) {
            session.user.id = userProfile[0].id
            session.user.role = userProfile[0].role
          }
        } catch (error) {
          console.error("Error fetching user profile:", error)
        }
      }
      return session
    },
  },
  pages: {
    signIn: "/",
  },
})

export { handler as GET, handler as POST }
