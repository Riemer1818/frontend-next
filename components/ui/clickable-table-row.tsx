import * as React from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface ClickableTableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  /**
   * URL to navigate to when row is clicked
   */
  href: string
  /**
   * Optional: Open in new tab on Cmd/Ctrl + Click
   * @default true
   */
  openInNewTab?: boolean
  /**
   * Children elements (TableCell components)
   */
  children: React.ReactNode
}

/**
 * A table row that navigates to a URL when clicked.
 * Provides consistent hover states and keyboard navigation.
 *
 * @example
 * <ClickableTableRow href={`/companies/${company.id}`}>
 *   <TableCell>{company.name}</TableCell>
 *   <TableCell>{company.email}</TableCell>
 * </ClickableTableRow>
 */
export const ClickableTableRow = React.forwardRef<
  HTMLTableRowElement,
  ClickableTableRowProps
>(({ href, openInNewTab = true, children, className, onClick, ...props }, ref) => {
  const router = useRouter()

  const handleClick = (e: React.MouseEvent<HTMLTableRowElement>) => {
    // Allow opening in new tab with Cmd/Ctrl + Click
    if (openInNewTab && (e.metaKey || e.ctrlKey)) {
      window.open(href, '_blank')
      return
    }

    // Call custom onClick if provided
    if (onClick) {
      onClick(e)
    }

    // Navigate using Next.js router for client-side navigation
    router.push(href)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTableRowElement>) => {
    // Navigate on Enter or Space key
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      router.push(href)
    }
  }

  return (
    <tr
      ref={ref}
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        "cursor-pointer transition-colors",
        "hover:bg-secondary hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      {...props}
    >
      {children}
    </tr>
  )
})

ClickableTableRow.displayName = "ClickableTableRow"
