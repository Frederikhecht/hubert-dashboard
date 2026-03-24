# Skills::SyncService
#
# Syncs skills detected from OpenClaw into the local database.
# Skills need DB records to be referenced from tasks and templates.
#
# Usage:
#   result = Skills::SyncService.new.call
#   # => { created: ["Daily Report"], updated: [], missing: [], errors: [] }


class SkillSyncService
  def initialize
    @openclaw = OpenclawService.new
  end

  def call
    return empty_result unless @openclaw.available?

    created = []
    updated = []
    errors  = []

    detected = @openclaw.all_skills
    detected_slugs = detected.map { |s| s[:slug] }

    detected.each do |oc_skill|
      skill = Skill.find_or_initialize_by(slug: oc_skill[:slug])
      was_new = skill.new_record?

      skill.assign_attributes(name: oc_skill[:name], description: oc_skill[:description])

      if skill.changed? || was_new
        if skill.save
          was_new ? created << skill.name : updated << skill.name
        else
          errors << { slug: oc_skill[:slug], messages: skill.errors.full_messages }
        end
      end
    end

    missing = Skill.where.not(slug: detected_slugs).pluck(:name, :slug)

    { created: created, updated: updated, missing: missing, errors: errors }
  end

  private

  def empty_result
    { created: [], updated: [], missing: [], errors: [] }
  end
end
