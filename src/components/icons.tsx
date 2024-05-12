'use client'
import {
  LucideIcon,
  LucideProps,
    User,
} from "lucide-react";

export type Icon = LucideIcon;

export const Icons = {
   user: User,
  azureAD: (props: LucideProps) => (
  <svg 
    width={props.width || "35px"} height={props.height || "35px"} viewBox="0 -50 300 300" xmlns="http://www.w3.org/2000/svg" { ...props }>
    <path d="M104.868 104.868H0V0h104.868v104.868z" fill="#f1511b"/>
    <path d="M220.654 104.868H115.788V0h104.866v104.868z" fill="#80cc28"/>
    <path d="M104.865 220.695H0V115.828h104.865v104.867z" fill="#00adef"/>
    <path d="M220.654 220.695H115.788V115.828h104.866v104.867z" fill="#fbbc09"/>
  </svg>
  ),

};
