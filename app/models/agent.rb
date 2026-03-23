class Agent < ApplicationRecord
  has_one_attached :avatar

  validates :openclaw_agent_id, presence: true, uniqueness: true

  # Returns the path to the agent's avatar, or nil if none is attached.
  def avatar_url
    return nil unless avatar.attached?

    Rails.application.routes.url_helpers.rails_blob_path(avatar, only_path: true)
  end

  # Delegates live status check to OpenClaw service.
  def status
    Openclaw::Service.new.agent_status(openclaw_agent_id)
  end
end
