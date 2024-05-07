"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CommandList } from "cmdk"
import { AllowedValue, UserInput, store } from "@/store/sales_data_store"


export function ComboboxCell({field, val, handleSelect, label}:{field: keyof UserInput, val?:string, handleSelect?:(currentValue:string)=>void, label?:string}) {
  const [open, setOpen] = React.useState(false)
  const [value, setValue] = React.useState(val || '')
  const [options, setOptions] = React.useState<AllowedValue[]>([])

  if (!label) label = ''
  
  React.useEffect(()=>{
    store.getAllowedValues(field).then(res=>{
        if (res) setOptions(res)
    })
  },[])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between"
        >
          {value
            ? options.find((option) => option.value === value)?.value
            : `Select ${label}...`}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
            
          <CommandInput placeholder={`Search ${label}...`} />
          <CommandList aria-disabled={false}>
          <CommandEmpty>No framework found.</CommandEmpty>
          <CommandGroup aria-disabled={false}>
            {options.map((option) => (
              <CommandItem
                key={option.value}
                value={option.value}
                onSelect={(currentValue) => {
                  handleSelect && handleSelect(currentValue === value ? "" : currentValue)
                  setValue(currentValue === value ? "" : currentValue)
                  setOpen(false)
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === option.value ? "opacity-100" : "opacity-0"
                  )}
                />
                {option.value}
              </CommandItem>
            ))}
          </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
