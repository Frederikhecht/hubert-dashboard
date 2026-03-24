module Api
  class TasksController < ActionController::API
    def index
      tasks = Task.not_archived
        .where(status: %w[queue in_progress])
        .then { |scope| params[:agent_id].present? ? scope.where(agent_id: params[:agent_id]) : scope }
        .includes(:agent)
        .map { |t| serialize(t) }

      render json: tasks
    end

    def complete
      task = Task.find(params[:id])
      task.complete!
      task.task_activities.create!(
        action: "status_changed",
        details: "Completed by #{task.agent&.name || 'agent'}"
      )
      render json: { success: true }
    rescue ActiveRecord::RecordNotFound
      render json: { error: "Task not found" }, status: :not_found
    rescue StandardError => e
      render json: { error: e.message }, status: :unprocessable_entity
    end

    def log
      task = Task.find(params[:id])
      task.task_activities.create!(
        action: "status_changed",
        details: params[:message].to_s.truncate(500)
      )
      render json: { success: true }
    rescue ActiveRecord::RecordNotFound
      render json: { error: "Task not found" }, status: :not_found
    end

    private

    def serialize(task)
      {
        id: task.id,
        title: task.title,
        status: task.status,
        agentId: task.agent_id,
        sessionKey: task.session_key,
        scheduledFor: task.scheduled_for&.iso8601
      }
    end
  end
end
