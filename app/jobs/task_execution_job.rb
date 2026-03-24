class TaskExecutionJob < ApplicationJob
  queue_as :default

  def perform(task_id)
    timezone = User.first&.timezone || "America/New_York"
    Time.use_zone(timezone) do
      perform_in_zone(task_id)
    end
  end

  private

  def perform_in_zone(task_id)
    task = Task.find_by(id: task_id)
    return unless task && task.status == "in_progress"

    result = OpenclawDispatchService.new.dispatch_task(task)

    if result[:success]
      task.complete!
      task.task_activities.create!(
        action: "status_changed",
        details: "Completed by #{task.agent&.name || 'agent'}"
      )
    else
      Rails.logger.error("[Execution] Task ##{task_id} failed: #{result[:error]}")
      task.task_activities.create!(
        action: "status_changed",
        details: "Dispatch failed: #{result[:error].to_s.truncate(200)}"
      )
    end
  rescue StandardError => e
    Rails.logger.error("[Execution] Task ##{task_id} error: #{e.message}")
  end
end
