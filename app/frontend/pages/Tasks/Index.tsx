import { AuthenticatedLayout } from '@/components/shell/AuthenticatedLayout'

export default function TasksIndex() {
  return (
    <AuthenticatedLayout>
      <div className="p-6">
        <h1 className="text-2xl font-semibold text-neutral-900">Tasks</h1>
        <p className="mt-2 text-sm text-neutral-500">Task board coming in Stage 4.</p>
      </div>
    </AuthenticatedLayout>
  )
}
