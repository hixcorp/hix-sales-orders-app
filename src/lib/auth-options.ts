import { NextAuthOptions, Profile, Session } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import CredentialProvider from "next-auth/providers/credentials";
import AzureADProvider from "next-auth/providers/azure-ad";
import { JWT } from "next-auth/jwt";
import { User, Account } from "next-auth";

export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID ?? "",
      clientSecret: process.env.GITHUB_SECRET ?? "",
    }),
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID ?? "",
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET ?? "" ,
      tenantId: process.env.AZURE_AD_TENANT_ID ?? "",
      // profile(profile){
      //   console.log({profile})
      //   return {id:profile.sub, image:profile.picture,...profile}
      // },
      // authorization: { params: { scope: 'openid profile email User.Read Group.Read.All GroupMember.Read.All' } },
    }),
    CredentialProvider({
      credentials: {
        email: {
          label: "email",
          type: "email",
          placeholder: "example@gmail.com",
        },
      },
      async authorize(credentials, req) {
        const user = { id: "1", name: "John", email: credentials?.email };
        if (user) {
          // Any object returned will be saved in `user` property of the JWT
          return user;
        } else {
          // If you return null then an error will be displayed advising the user to check their details.
          return null;

          // You can also Reject this callback with an Error thus the user will be sent to the error page with the error message as a query parameter
        }
      },
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
      // console.log({token, user, account, profile})
      if (account && account.access_token) {
        token.accessToken = account.access_token;
      }
      if (profile){
        // token.groups = profile.groups        
      }
      return token
    },
    async session({ session, token, user }: {session: Session, token: JWT, user: User}): Promise<Session>{  
      
    // session.accessToken = token.accessToken
    // session.groups = token.groups
    
    // console.log({token,session})
    return session
    }
  }
}

;