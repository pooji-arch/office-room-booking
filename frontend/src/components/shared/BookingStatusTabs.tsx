import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { BookingBucket } from "@/types"

interface BookingStatusTabsProps {
  value: BookingBucket
  onChange: (value: BookingBucket) => void
  tabs: { value: BookingBucket; label: string }[]
}

export function BookingStatusTabs({ value, onChange, tabs }: BookingStatusTabsProps) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as BookingBucket)}>
      <TabsList>
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
