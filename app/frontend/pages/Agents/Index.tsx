import { AuthenticatedLayout } from '@/components/shell/AuthenticatedLayout'

export default function AgentsIndex() {
  return (
    <AuthenticatedLayout>
      <div className="p-6">
        <h1 className="text-2xl font-semibold text-neutral-900">Agents</h1>
        <p className="mt-2 text-sm text-neutral-500">Agent cards coming in Stage 2.</p>
      </div>
    </AuthenticatedLayout>
  )
}
