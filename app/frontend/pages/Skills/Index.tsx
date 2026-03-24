import { router, usePage } from "@inertiajs/react"
import { RefreshCw, Sparkles } from "lucide-react"
import { AuthenticatedLayout } from "@/components/shell/AuthenticatedLayout"
import { Button } from "@/components/ui/button"
import type { Skill } from "@/types/skill"

interface Props {
  skills: Skill[]
  openclawAvailable: boolean
}

export default function SkillsIndex({ skills, openclawAvailable }: Props) {
  const { props } = usePage<any>()
  const notice = props.flash?.notice

  function handleSync() {
    router.post("/skills/sync")
  }

  return (
    <AuthenticatedLayout>
      <div className="p-6 max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-neutral-900">Skills</h1>
            <p className="mt-0.5 text-sm text-neutral-500">
              {openclawAvailable
                ? `${skills.length} skill${skills.length !== 1 ? "s" : ""} synced from OpenClaw`
                : "OpenClaw not available on this machine"}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={!openclawAvailable}
            className="gap-2"
          >
            <RefreshCw size={14} />
            Sync Skills
          </Button>
        </div>

        {/* Flash notice */}
        {notice && (
          <div className="mb-4 rounded-md bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-700">
            {notice}
          </div>
        )}

        {/* Skills list */}
        {skills.length > 0 ? (
          <div className="rounded-xl border border-neutral-200 divide-y divide-neutral-100 bg-white overflow-hidden">
            {skills.map((skill) => (
              <div key={skill.id} className="flex items-start gap-3 px-4 py-3">
                <Sparkles size={15} className="mt-0.5 shrink-0 text-neutral-400" />
                <div>
                  <p className="text-sm font-medium text-neutral-900">{skill.name}</p>
                  {skill.description && (
                    <p className="mt-0.5 text-xs text-neutral-500">{skill.description}</p>
                  )}
                  <p className="mt-0.5 text-xs text-neutral-400 font-mono">{skill.slug}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-neutral-200 p-12 text-center">
            <p className="text-sm text-neutral-500">
              {openclawAvailable
                ? "No skills found. Add SKILL.md files to ~/.openclaw/skills/ and sync."
                : "OpenClaw is not running on this machine. Skills will appear after syncing on the OpenClaw machine."}
            </p>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  )
}
