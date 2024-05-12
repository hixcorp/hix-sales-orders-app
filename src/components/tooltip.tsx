'use client'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import React from 'react'

const HoverTooltip = ({content, children, className}:{content:React.ReactNode, children:React.ReactNode, className?:string}) => {
  return (
    <TooltipProvider>
    <Tooltip>
        <TooltipTrigger className={className}>{children}</TooltipTrigger>
        <TooltipContent >
            {content}
        </TooltipContent>
    </Tooltip>
    </TooltipProvider>

  )
}

export default HoverTooltip