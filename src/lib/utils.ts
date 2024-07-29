import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const local_api_url = "http://localhost:3000";
export const local_ws_url = "ws://localhost:3000";
export let server_url = "http://hixts001:8081";
export let server_ws_url = "ws://hixts001:8081";

export const toggleServer = () => {
  if (server_url === "http://localhost:3000") {
    server_url = "http://hixts001:8081";
    server_ws_url = "ws://hixts001:8081";
  }else{
    server_url = "http://localhost:3000";
    server_ws_url = "ws://localhost:3000";
  }
}