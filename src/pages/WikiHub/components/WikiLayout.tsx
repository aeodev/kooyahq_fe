import { WikiSidebar } from './WikiSidebar'

type WikiLayoutProps = {
  children: React.ReactNode
}

export function WikiLayout({ children }: WikiLayoutProps) {
  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      <WikiSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
        {children}
      </div>
    </div>
  )
}
