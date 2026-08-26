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
          <TabsTrigger key={tab.value} value={tab.value} className="flex-1">
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
