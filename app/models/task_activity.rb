class TaskActivity < ApplicationRecord
  belongs_to :task

  ACTIONS = %w[assigned status_changed].freeze

  validates :action, presence: true, inclusion: { in: ACTIONS }
  validates :details, presence: true
  validates :timestamp, presence: true

  default_scope { order(timestamp: :desc) }

  before_validation :set_timestamp, on: :create

  private

  def set_timestamp
    self.timestamp ||= Time.current
  end
end
