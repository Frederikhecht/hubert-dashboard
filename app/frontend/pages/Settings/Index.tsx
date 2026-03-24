import { useState } from "react"
import { router, usePage } from "@inertiajs/react"
import { AuthenticatedLayout } from "@/components/shell/AuthenticatedLayout"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

interface Props {
  preInstructions: string
  timezone: string
}

export default function SettingsIndex({ preInstructions: initialPre, timezone: initialTz }: Props) {
  const { props } = usePage<any>()
  const notice = props.flash?.notice
  const alert = props.flash?.alert

  const [preInstructions, setPreInstructions] = useState(initialPre)
  const [timezone, setTimezone] = useState(initialTz)

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    router.patch("/settings", { preInstructions, timezone })
  }

  return (
    <AuthenticatedLayout>
      <div className="p-6 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-neutral-900">Settings</h1>
          <p className="mt-0.5 text-sm text-neutral-500">Global configuration for task dispatch.</p>
        </div>

        {notice && (
          <div className="mb-4 rounded-md bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-700">
            {notice}
          </div>
        )}
        {alert && (
          <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
            {alert}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">Task Pre-Instructions</h2>
              <p className="mt-0.5 text-xs text-neutral-500">
                These instructions are prepended to every task dispatched to an agent.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="preInstructions">Pre-instructions</Label>
              <textarea
                id="preInstructions"
                value={preInstructions}
                onChange={(e) => setPreInstructions(e.target.value)}
                rows={5}
                placeholder="e.g. Always cite sources. Use markdown formatting. Be concise."
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
              />
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">Timezone</h2>
              <p className="mt-0.5 text-xs text-neutral-500">
                Used for recurring task scheduling.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="timezone">Timezone</Label>
              <input
                id="timezone"
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="e.g. America/New_York"
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit">Save Settings</Button>
          </div>
        </form>
      </div>
    </AuthenticatedLayout>
  )
}
