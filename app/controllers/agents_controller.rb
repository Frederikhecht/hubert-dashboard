class AgentsController < ApplicationController
  def index
    openclaw = OpenclawService.new
    agents = openclaw.agents.map do |agent|
      db_agent = Agent.find_by(openclaw_agent_id: agent[:id])
      agent.merge(dbId: db_agent&.id&.to_s)
    end

    render inertia: "Agents/Index", props: {
      agents: agents,
      openclawAvailable: openclaw.available?
    }
  end

  def show
    @agent = Agent.find(params[:id])
    openclaw = OpenclawService.new
    oc_agent = openclaw.agent(@agent.openclaw_agent_id)

    activities = TaskActivity.joins(:task)
      .where(tasks: { agent_id: @agent.id })
      .includes(task: :agent)
      .order(timestamp: :desc)
      .limit(50)

    render inertia: "Agents/Show", props: {
      agent: serialize_agent(@agent, oc_agent),
      activities: activities.map { |a| serialize_activity(a) },
      openclawAvailable: openclaw.available?
    }
  end

  def update
    agent = Agent.find(params[:id])
    agent.avatar.attach(params[:avatar]) if params[:avatar].present?
    redirect_back(fallback_location: agents_path)
  end

  def sync
    result = AgentSyncService.new.call
    parts = []
    parts << "#{result[:created].size} added"  if result[:created].any?
    parts << "#{result[:updated].size} updated" if result[:updated].any?
    parts << "#{result[:missing].size} missing" if result[:missing].any?
    notice = parts.any? ? "Agents synced: #{parts.join(', ')}." : "Agents already up to date."
    redirect_to agents_path, notice: notice
  end

  private

  def serialize_activity(activity)
    {
      id: activity.id.to_s,
      action: activity.action,
      details: activity.details,
      timestamp: activity.timestamp.iso8601,
      taskId: activity.task_id.to_s,
      taskTitle: activity.task.title,
      agentId: activity.task.agent_id&.to_s,
      agentName: activity.task.agent&.name,
      agentAvatarUrl: activity.task.agent&.avatar_url
    }
  end

  def serialize_agent(db_agent, oc_agent)
    {
      id: db_agent.id.to_s,
      openclawAgentId: db_agent.openclaw_agent_id,
      name: db_agent.name,
      role: db_agent.role,
      active: db_agent.active,
      avatarUrl: db_agent.avatar_url,
      emoji: oc_agent&.dig(:emoji),
      status: oc_agent&.dig(:status) || "idle",
      model: oc_agent&.dig(:model),
      lastActiveAt: oc_agent&.dig(:lastActiveAt)
    }
  end
end
