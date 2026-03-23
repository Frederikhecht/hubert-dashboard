# Agents::SyncService
#
# Syncs agents from OpenClaw config into the local database.
# Agents need DB records to associate with tasks and store avatars.
#
# Usage:
#   result = Agents::SyncService.new.call
#   # => { created: ["Bernard"], updated: ["Vale"], missing: [], errors: [] }

module Agents
  class SyncService
    def initialize
      @openclaw = Openclaw::Service.new
    end

    def call
      return empty_result unless @openclaw.available?

      created = []
      updated = []
      errors  = []

      @openclaw.agents.each do |oc_agent|
        agent = Agent.find_or_initialize_by(openclaw_agent_id: oc_agent[:id])
        was_new = agent.new_record?

        agent.assign_attributes(name: oc_agent[:name], role: oc_agent[:role], active: true)

        if agent.changed? || was_new
          if agent.save
            was_new ? created << agent.name : updated << agent.name
          else
            errors << { agent_id: oc_agent[:id], messages: agent.errors.full_messages }
          end
        end
      end

      openclaw_ids = @openclaw.agents.map { |a| a[:id] }
      missing = Agent.where.not(openclaw_agent_id: openclaw_ids).pluck(:name, :openclaw_agent_id)

      { created: created, updated: updated, missing: missing, errors: errors }
    end

    private

    def empty_result
      { created: [], updated: [], missing: [], errors: [] }
    end
  end
end
