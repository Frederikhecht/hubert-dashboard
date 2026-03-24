class Skill < ApplicationRecord
  validates :slug, presence: true, uniqueness: true
  validates :name, presence: true

  scope :ordered, -> { order(name: :asc) }
end
