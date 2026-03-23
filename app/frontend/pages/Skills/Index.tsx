import { AuthenticatedLayout } from '@/components/shell/AuthenticatedLayout'

export default function SkillsIndex() {
  return (
    <AuthenticatedLayout>
      <div className="p-6">
        <h1 className="text-2xl font-semibold text-neutral-900">Skills</h1>
        <p className="mt-2 text-sm text-neutral-500">Skills list coming in Stage 3.</p>
      </div>
    </AuthenticatedLayout>
  )
}
