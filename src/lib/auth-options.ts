import { NextAuthOptions, Profile, Session } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import { JWT } from "next-auth/jwt";
import { User, Account } from "next-auth";

export const authOptions: NextAuthOptions = {
  providers: [
    
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID ?? "",
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET ?? "" ,
      tenantId: process.env.AZURE_AD_TENANT_ID ?? "",
    }),
  ],
  
  pages: {
    signIn: "/", //sigin page
  },
  callbacks: {
    async jwt({ token, user, account, profile}:{
      token: JWT,
      user?: User,
      account?: Account | null,
      profile?: Profile | undefined,
    }): Promise<JWT>{
      if (account && account.access_token) {
        token.accessToken = account.access_token;
      }
      return token
    },
  }
}

;