import { local_api_url } from "./utils"
import { Session } from "next-auth"

export async function getCurrentUser() {
  try{
  const res = await fetch(`${local_api_url}/api/auth/current_user`,{
    method:'GET',
    credentials: 'include'
  })
  if(res.ok){
    const session: Session = await res.json()
    return session
  }
 
  }catch(err){
    console.warn({err})
  }
}

export async function signOut() {
  try{
    const response = await fetch(`${local_api_url}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',  // Ensure cookies are sent with the request
    });

    if (response.ok) {
      return     
    } else {
      return null
    }
  }catch(err){
    console.error("could not log out")
    return null
  }
  
}