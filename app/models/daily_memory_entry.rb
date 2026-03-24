class DailyMemoryEntry < ApplicationRecord
  validates :entry_date, :summary, presence: true

  scope :ordered, -> { order(entry_date: :desc, created_at: :desc) }
end
