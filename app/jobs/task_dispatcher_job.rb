class TaskDispatcherJob < ApplicationJob
  queue_as :default

  def perform
    promote_scheduled_tasks
    dispatch_queued_tasks
  end

  private

  def promote_scheduled_tasks
    Task.where(status: "scheduled").where("scheduled_for <= ?", Time.current).find_each do |task|
      task.update!(status: "queue")
      task.task_activities.create!(
        action: "status_changed",
        details: "Scheduled -> Queue (scheduled time arrived)"
      )
      Rails.logger.info("[Dispatcher] Promoted task ##{task.id} from scheduled to queue")
    rescue StandardError => e
      Rails.logger.error("[Dispatcher] Failed to promote task #{task.id}: #{e.message}")
    end
  end

  def dispatch_queued_tasks
    Task.dispatchable.find_each do |task|
      session_key = "dashboard:task:#{task.id}"
      task.dispatch!(session_key_value: session_key)

      task.task_activities.create!(
        action: "status_changed",
        details: "Dispatched to #{task.agent.name}"
      )

      TaskExecutionJob.perform_later(task.id)

      Rails.logger.info("[Dispatcher] Dispatched task ##{task.id} to #{task.agent.name}")
    rescue StandardError => e
      Rails.logger.error("[Dispatcher] Failed to dispatch task #{task.id}: #{e.message}")
    end
  end
end
