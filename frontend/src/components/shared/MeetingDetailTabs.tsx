import type { ReactNode } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export interface MeetingDetailTab {
  value: string
  label: string
  content: ReactNode
}

export function MeetingDetailTabs({ tabs }: { tabs: MeetingDetailTab[] }) {
  return (
    <Tabs defaultValue={tabs[0]?.value}>
      <TabsList className="w-full">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} className="min-w-0 flex-1 truncate px-1 text-xs sm:px-1.5 sm:text-sm">
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value} className="space-y-4">
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  )
}
