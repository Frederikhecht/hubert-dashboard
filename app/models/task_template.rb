class TaskTemplate < ApplicationRecord
  belongs_to :agent, optional: true
  has_many :tasks, dependent: :nullify
  has_many :task_recurring_schedules, dependent: :destroy

  validates :title, presence: true

  def create_task!(recurring_schedule: nil, scheduled_for: nil)
    task = tasks.create!(
      title: title,
      description: description,
      skill: skill,
      agent_id: agent_id,
      status: scheduled_for ? "scheduled" : "queue",
      scheduled_for: scheduled_for,
      task_recurring_schedule: recurring_schedule
    )

    details = "Created from template '#{title}'"
    details += " (recurring)" if recurring_schedule

    task.task_activities.create!(action: "assigned", details: details)

    task
  end
end
