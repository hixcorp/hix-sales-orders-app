import { api_url } from "./utils"
import { Session } from "next-auth"

export async function getCurrentUser() {
  try{
  const res = await fetch(`${api_url}/api/auth/current_user`,{
    method:'GET',
    credentials: 'include'
  })
  console.log({res})
  if(res.ok){
    const session: Session = await res.json()
    return session
  }
 
  }catch(err){
    console.warn({err})
  }
}

export async function signOut(callbackURL:string) {

  const response = await fetch(`${api_url}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',  // Ensure cookies are sent with the request
    });

    if (response.ok) {
      // Redirect to login page or home page after logout
      window.location.href = callbackURL;
    } else {
      alert('Failed to log out');
    }
}