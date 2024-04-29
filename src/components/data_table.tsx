'use client'

import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table"
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useSnapshot } from "valtio"
import { store } from "@/store/sales_data_store"
import { EditSalesSettings } from "./sales_orders/edit_sales_settings"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
}

export function DataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const snap = useSnapshot(store)

  return (
    <>
        <TableHeader>
          <TableRow className='text-[13px] font-extrabold align-left text-left'>
            {snap.sales_data.schema.map((s, i) => {
                const s_settings = snap.sales_settings.data.find(item => item.column_name === s);
                return !snap.editing && s_settings?.hidden ? null : (
                    <TableHead key={`header_${i}`} className='sticky top-0 px-1 bg-secondary'>
                        {s_settings?.display_name || s}
                    </TableHead>
                );
            })}
            <TableHead className='sticky top-0 px-1 bg-secondary'>Alerts</TableHead>
        </TableRow>
        {snap.editing && <EditSalesSettings />}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row, i) => (
              <TableRow
                key={`row_${i}`}
                data-state={row.getIsSelected() && "selected"}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
    </>
  )
}
