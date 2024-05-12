// Protecting routes with next-auth
// https://next-auth.js.org/configuration/nextjs#middleware
// https://nextjs.org/docs/app/building-your-application/routing/middleware

// import { withAuth } from "next-auth/middleware";

// export default withAuth({
//     callbacks: {
//         authorized: ({req, token}) => {
//             if (req.nextUrl.pathname === '/home/admin'){
//                 console.log({token})
//                 return token?.role === 'admin'
//             }
//             return Boolean(token)
//         }
//     }
// })


// export { default } from "next-auth/middleware";
// export const config = { matcher: ["/home/:path*","/dashboard/:path*"] };
