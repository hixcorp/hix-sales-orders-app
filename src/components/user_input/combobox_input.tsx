"use client"

import * as React from "react"
import { Check, ChevronsUpDown, CircleX } from "lucide-react"
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
import { AllowedValue, AllowedValueCreate, UserInput, store } from "@/store/sales_data_store"
import { cn } from "@/lib/utils"
import { useSnapshot } from "valtio"

export function ComboboxCell({
  field, val, handleSelect, label, addFn, removeFn
}:{
  field: keyof UserInput, 
  val?:string, handleSelect?:(currentValue:string)=>void, 
  label?:string, addFn?:(option:AllowedValueCreate)=>void, 
  removeFn?:(option:AllowedValue)=>void
}) {
  const [open, setOpen] = React.useState(false)
  const [value, setValue] = React.useState(val ? val : '')
  const [searchValue, setSearchValue] = React.useState('')
  const snap = useSnapshot(store)
  const options = snap.allowed_values.hasOwnProperty(field) ? snap.allowed_values[field] : []

  if (!label) label = ''


  const handleAddOption = () =>{
    const new_option: AllowedValueCreate = {type:field, value:searchValue}
    if(!!addFn) addFn(new_option)
  }

  const handleRemoveOption = async (option:AllowedValue) => {
    if(!!removeFn) removeFn(option)
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={`w-[200px] justify-between ${val ? '': 'text-muted'}`}
        >
          {val
            ? options.find((option) => String(option.value) === String(val))?.value
            : `Select ${label}...`}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command
          filter={(value,search)=>{
            setSearchValue(search)
            if (value.toLowerCase().includes(search.toLowerCase())) return 1
            return 0
          }}
        >
            
          <CommandInput placeholder={`Search ${label}...`} />
          <CommandList aria-disabled={false}>
          <CommandEmpty>
            {addFn ? 
                <Button className='py-0 m-0 w-full' variant={'outline'}
                  onClick={handleAddOption}
                >
                  {`Add ${searchValue}`}
                </Button>
              : 
              'No results'}
            </CommandEmpty>
          <CommandGroup aria-disabled={false}>
            {options.map((option) => (
              <div key={option.value} className="w-full flex items-center justify-between">
              <CommandItem
                
                value={option.value}
                onSelect={(currentValue) => {
                  handleSelect && handleSelect(currentValue === val ? "" : currentValue)
                  setValue(currentValue === val ? "" : currentValue)
                  setOpen(false)
                  
                }}
                className="w-full"
                
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === option.value ? "opacity-100" : "opacity-0"
                  )}
                />
                {option.value}
                
              </CommandItem>
              {
              removeFn && value.toLowerCase().includes(searchValue) && <CircleX className="text-muted hover:text-destructive hover:cursor-pointer"
                onClick={()=>handleRemoveOption(option)}
              />
              }
              </div>
              
            ))}
          </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
