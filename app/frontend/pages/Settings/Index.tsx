import { AuthenticatedLayout } from '@/components/shell/AuthenticatedLayout'

export default function SettingsIndex() {
  return (
    <AuthenticatedLayout>
      <div className="p-6">
        <h1 className="text-2xl font-semibold text-neutral-900">Settings</h1>
        <p className="mt-2 text-sm text-neutral-500">Settings page coming in Stage 5.</p>
      </div>
    </AuthenticatedLayout>
  )
}
