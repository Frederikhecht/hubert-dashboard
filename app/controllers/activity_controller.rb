class ActivityController < ApplicationController
  def index
    activities = TaskActivity.includes(task: :agent).order(timestamp: :desc).limit(100)

    if params[:agent_id].present?
      activities = activities.joins(:task).where(tasks: { agent_id: params[:agent_id] })
    end

    agents = Agent.order(:name).map { |a| { id: a.id.to_s, name: a.name, avatarUrl: a.avatar_url } }

    render inertia: "Activity/Index", props: {
      activities: activities.map { |a| serialize_activity(a) },
      agents: agents,
      selectedAgentId: params[:agent_id]
    }
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
end
