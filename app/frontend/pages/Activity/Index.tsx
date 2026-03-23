import { AuthenticatedLayout } from '@/components/shell/AuthenticatedLayout'

export default function ActivityIndex() {
  return (
    <AuthenticatedLayout>
      <div className="p-6">
        <h1 className="text-2xl font-semibold text-neutral-900">Activity</h1>
        <p className="mt-2 text-sm text-neutral-500">Activity feed coming in Stage 6.</p>
      </div>
    </AuthenticatedLayout>
  )
}
