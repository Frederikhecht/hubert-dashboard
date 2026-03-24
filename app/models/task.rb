class Task < ApplicationRecord
  belongs_to :agent, optional: true
  belongs_to :task_template, optional: true
  belongs_to :task_recurring_schedule, optional: true
  has_many :task_activities, dependent: :destroy

  STATUSES = %w[scheduled queue in_progress done].freeze

  validates :title, presence: true
  validates :status, presence: true, inclusion: { in: STATUSES }

  before_create :set_initial_position

  default_scope { order(position: :asc) }

  scope :not_archived, -> { where(archived_at: nil) }
  scope :archived, -> { where.not(archived_at: nil) }
  scope :done, -> { where(status: "done") }
  scope :queue, -> { where(status: "queue") }
  scope :dispatchable, -> { queue.where.not(agent_id: nil) }

  def self.auto_archive_old_done_tasks!
    done.not_archived.where("completed_at < ?", 3.days.ago).update_all(archived_at: Time.current)
  end

  def complete!
    update!(status: "done", completed_at: Time.current)
    spawn_next_recurring_task!
  end

  def dispatch!(session_key_value: nil)
    update!(
      status: "in_progress",
      dispatched_at: Time.current,
      session_key: session_key_value || generate_session_key
    )
  end

  def move_to(new_status: nil, new_position:)
    new_status ||= status
    old_status = status
    old_position = position

    transaction do
      if new_status != old_status
        Task.unscoped.where(status: old_status)
          .where("position > ?", old_position)
          .update_all("position = position - 1")

        Task.unscoped.where(status: new_status)
          .where("position >= ?", new_position)
          .update_all("position = position + 1")

        update!(status: new_status, position: new_position)
      else
        if new_position > old_position
          Task.unscoped.where(status: status)
            .where("position > ? AND position <= ?", old_position, new_position)
            .update_all("position = position - 1")
        elsif new_position < old_position
          Task.unscoped.where(status: status)
            .where("position >= ? AND position < ?", new_position, old_position)
            .update_all("position = position + 1")
        end

        update!(position: new_position) if new_position != old_position
      end
    end
  end

  def archive!
    transaction do
      Task.unscoped.where(status: status, archived_at: nil)
        .where("position > ?", position)
        .update_all("position = position - 1")

      update!(archived_at: Time.current)
    end

    task_activities.create!(action: "status_changed", details: "Task archived")
  end

  def archived?
    archived_at.present?
  end

  def spawn_next_recurring_task!
    return unless task_recurring_schedule&.active?
    task_recurring_schedule.spawn_next_task!
  rescue StandardError => e
    Rails.logger.error("[Task##{id}] Failed to spawn next recurring task: #{e.message}")
  end

  private

  def set_initial_position
    max_position = Task.unscoped.where(status: status).maximum(:position) || -1
    self.position = max_position + 1
  end

  def generate_session_key
    "dashboard:task:#{id}"
  end
end
