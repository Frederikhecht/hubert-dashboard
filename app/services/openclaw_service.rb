# Openclaw::Service
#
# Reads agent and skill data from the local OpenClaw filesystem.
# All integration is file-based — no HTTP API needed.
#
# Usage:
#   svc = Openclaw::Service.new
#   svc.available?           # => true / false
#   svc.agents               # => [{id:, name:, emoji:, role:, status:, avatarUrl:}, ...]
#   svc.agent("bernard")     # => {id:, name:, ..., model:, lastActiveAt:}
#   svc.agent_status("id")   # => "active" | "idle"
#   svc.all_skills           # => [{slug:, name:, description:}, ...]

class OpenclawService
  OPENCLAW_PATH = ENV.fetch("OPENCLAW_PATH") { File.expand_path("~/.openclaw") }
  ACTIVE_THRESHOLD_MINUTES = 10

  def initialize
    @config = load_config
  end

  def available?
    @config.present? && File.directory?(agents_dir)
  end

  # ---------------------------------------------------------------------------
  # Agents
  # ---------------------------------------------------------------------------

  def agents
    return [] unless available?

    (@config.dig("agents", "list") || []).map { |a| build_agent_summary(a) }
  end

  def agent(agent_id)
    return nil unless available?

    raw = (@config.dig("agents", "list") || []).find { |a| a["id"] == agent_id }
    raw ? build_agent_detail(raw) : nil
  end

  def agent_status(agent_id)
    sessions = load_agent_sessions(agent_id)
    return "idle" if sessions.empty?

    most_recent_ms = sessions.values.filter_map { |s| s["updatedAt"] }.max
    return "idle" unless most_recent_ms

    threshold_ms = ACTIVE_THRESHOLD_MINUTES.minutes.ago.to_i * 1000
    most_recent_ms > threshold_ms ? "active" : "idle"
  end

  # ---------------------------------------------------------------------------
  # Skills
  # ---------------------------------------------------------------------------

  def all_skills
    (load_managed_skills + load_workspace_skills).uniq { |s| s[:slug] }
  end

  def skill(slug)
    all_skills.find { |s| s[:slug] == slug }
  end

  private

  # ---------------------------------------------------------------------------
  # Config & session loading
  # ---------------------------------------------------------------------------

  def load_config
    path = File.join(OPENCLAW_PATH, "openclaw.json")
    return nil unless File.exist?(path)

    JSON.parse(File.read(path))
  rescue JSON::ParserError => e
    Rails.logger.error("[Openclaw] Config parse error: #{e.message}")
    nil
  end

  def agents_dir
    File.join(OPENCLAW_PATH, "agents")
  end

  def load_agent_sessions(agent_id)
    path = File.join(agents_dir, agent_id.to_s, "sessions", "sessions.json")
    return {} unless File.exist?(path)

    JSON.parse(File.read(path))
  rescue JSON::ParserError => e
    Rails.logger.error("[Openclaw] Sessions parse error for #{agent_id}: #{e.message}")
    {}
  end

  # ---------------------------------------------------------------------------
  # Agent builders
  # ---------------------------------------------------------------------------

  def build_agent_summary(raw)
    agent_id = raw["id"]
    db_agent = Agent.find_by(openclaw_agent_id: agent_id)

    {
      id: agent_id,
      name: raw["name"] || agent_id.titleize,
      emoji: raw.dig("identity", "emoji") || "🤖",
      role: extract_role(raw),
      status: agent_status(agent_id),
      avatarUrl: db_agent&.avatar_url
    }
  end

  def build_agent_detail(raw)
    agent_id = raw["id"]
    db_agent = Agent.find_by(openclaw_agent_id: agent_id)
    last_active = last_active_time(agent_id)

    {
      id: agent_id,
      name: raw["name"] || agent_id.titleize,
      emoji: raw.dig("identity", "emoji") || "🤖",
      role: extract_role(raw),
      model: extract_model(raw),
      status: agent_status(agent_id),
      lastActiveAt: last_active&.iso8601,
      avatarUrl: db_agent&.avatar_url
    }
  end

  def extract_role(raw)
    theme = raw.dig("identity", "theme")
    return "Assistant" unless theme

    theme.split("\u2014").first&.strip || "Assistant"
  end

  def extract_model(raw)
    model = dig_model(raw["model"]) || dig_model(@config.dig("agents", "defaults", "model"))
    model ? model.split("/").last : "unknown"
  end

  def dig_model(value)
    case value
    when String then value.presence
    when Hash   then value["primary"].presence
    end
  end

  def last_active_time(agent_id)
    sessions = load_agent_sessions(agent_id)
    return nil if sessions.empty?

    ms = sessions.values.filter_map { |s| s["updatedAt"] }.max
    ms ? Time.at(ms / 1000.0) : nil
  end

  # ---------------------------------------------------------------------------
  # Skills loading
  # ---------------------------------------------------------------------------

  def load_managed_skills
    load_skills_from(File.join(OPENCLAW_PATH, "skills"))
  end

  def load_workspace_skills
    workspace_paths.flat_map { |p| load_skills_from(File.join(p, "skills")) }
  end

  def workspace_paths
    return [] unless @config

    (@config.dig("workspaces") || {}).filter_map do |_key, ws|
      path = ws.is_a?(Hash) ? ws["path"] : nil
      path if path && File.directory?(path)
    end.uniq
  end

  def load_skills_from(dir)
    return [] unless File.directory?(dir)

    Dir.glob(File.join(dir, "*")).filter_map do |skill_dir|
      next unless File.directory?(skill_dir)

      skill_file = File.join(skill_dir, "SKILL.md")
      next unless File.exist?(skill_file)

      parse_skill_file(skill_file)
    end
  end

  def parse_skill_file(file_path)
    content = File.read(file_path)
    slug = File.basename(File.dirname(file_path))
    frontmatter, _body = extract_frontmatter(content)

    name = frontmatter&.dig("name").presence || slug.tr("-_", " ").titleize
    description = frontmatter&.dig("description").presence

    { slug: slug, name: name, description: description }
  rescue Errno::ENOENT, Errno::EACCES => e
    Rails.logger.debug("[Openclaw] Skill read error #{file_path}: #{e.message}")
    nil
  end

  def extract_frontmatter(content)
    return [ nil, content ] unless content.start_with?("---")

    parts = content.split(/^---\s*$/, 3)
    return [ nil, content ] if parts.length < 3

    frontmatter = YAML.safe_load(parts[1], permitted_classes: [ Symbol ])
    [ frontmatter, parts[2] ]
  rescue Psych::SyntaxError => e
    Rails.logger.debug("[Openclaw] YAML frontmatter parse error: #{e.message}")
    [ nil, content ]
  end
end
