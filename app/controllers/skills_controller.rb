class SkillsController < ApplicationController
  def index
    skills = Skill.ordered.map do |skill|
      { id: skill.id.to_s, slug: skill.slug, name: skill.name, description: skill.description }
    end

    render inertia: "Skills/Index", props: {
      skills: skills,
      openclawAvailable: OpenclawService.new.available?
    }
  end

  def sync
    result = SkillSyncService.new.call
    parts = []
    parts << "#{result[:created].size} added"  if result[:created].any?
    parts << "#{result[:updated].size} updated" if result[:updated].any?
    parts << "#{result[:missing].size} missing" if result[:missing].any?
    notice = parts.any? ? "Skills synced: #{parts.join(', ')}." : "Skills already up to date."
    redirect_to skills_path, notice: notice
  end
end
