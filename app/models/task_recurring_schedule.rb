class TaskRecurringSchedule < ApplicationRecord
  belongs_to :task_template
  has_many :tasks, dependent: :nullify

  FREQUENCY_TYPES = %w[every_n_hours daily specific_days weekly monthly yearly].freeze
  DAY_NAMES = %w[Sunday Monday Tuesday Wednesday Thursday Friday Saturday].freeze
  MONTH_NAMES = %w[January February March April May June July August September October November December].freeze

  validates :frequency_type, presence: true, inclusion: { in: FREQUENCY_TYPES }
  validates :interval, numericality: { greater_than: 0 }, allow_nil: true
  validates :days_of_week, presence: true, if: -> { frequency_type == "specific_days" }
  validates :day_of_week, inclusion: { in: 0..6 }, allow_nil: true
  validates :day_of_month, inclusion: { in: 1..31 }, allow_nil: true
  validates :month_of_year, inclusion: { in: 1..12 }, allow_nil: true
  validates :times_of_day, presence: true, unless: -> { frequency_type == "every_n_hours" }
  validate :validate_times_of_day_format, if: -> { times_of_day.present? }

  scope :active_schedules, -> { where(active: true) }

  def calculate_next_occurrence(from_time = Time.current)
    case frequency_type
    when "every_n_hours"  then next_every_n_hours(from_time)
    when "daily"          then next_with_times(from_time) { |date| date + 1.day }
    when "specific_days"  then next_with_times(from_time) { |date| next_specific_day_date(date) }
    when "weekly"         then next_with_times(from_time) { |date| next_weekly_date(date) }
    when "monthly"        then next_with_times(from_time) { |date| next_monthly_date(date) }
    when "yearly"         then next_with_times(from_time) { |date| next_yearly_date(date) }
    end
  end

  def spawn_next_task!
    return unless active?

    next_occurrence = calculate_next_occurrence
    update!(next_run_at: next_occurrence)
    task_template.create_task!(recurring_schedule: self, scheduled_for: next_occurrence)
  end

  def human_description
    base = case frequency_type
    when "every_n_hours"
      hours = interval || 1
      hours == 1 ? "Every hour" : "Every #{hours} hours"
    when "daily"
      "Every day"
    when "specific_days"
      day_names = (days_of_week || []).sort.map { |d| DAY_NAMES[d] }
      "Every #{day_names.join(', ')}"
    when "weekly"
      day_name = DAY_NAMES[day_of_week || 0]
      interval.to_i > 1 ? "Every #{interval} weeks on #{day_name}" : "Every #{day_name}"
    when "monthly"
      day = day_of_month || 1
      interval.to_i > 1 ? "Every #{interval} months on day #{day}" : "Monthly on day #{day}"
    when "yearly"
      month_name = MONTH_NAMES[(month_of_year || 1) - 1]
      day = day_of_month || 1
      "Every year on #{month_name} #{day}"
    else
      frequency_type
    end

    if frequency_type != "every_n_hours" && times_of_day.present?
      formatted_times = effective_times_of_day.map { |t| format_time_12h(t) }
      base += " at #{formatted_times.join(', ')}"
    end

    base
  end

  private

  def effective_times_of_day
    (times_of_day.presence || ["00:00"]).sort.uniq
  end

  def validate_times_of_day_format
    return unless times_of_day.is_a?(Array)

    times_of_day.each do |t|
      unless t.is_a?(String) && t.match?(/\A\d{2}:\d{2}\z/)
        errors.add(:times_of_day, "must contain times in HH:MM format")
        return
      end
      hour, minute = t.split(":").map(&:to_i)
      unless (0..23).cover?(hour) && (0..59).cover?(minute)
        errors.add(:times_of_day, "must contain valid times (00:00-23:59)")
        return
      end
    end
  end

  def format_time_12h(time_str)
    hour, minute = time_str.split(":").map(&:to_i)
    period = hour >= 12 ? "pm" : "am"
    display_hour = hour % 12
    display_hour = 12 if display_hour.zero?
    minute.zero? ? "#{display_hour}#{period}" : "#{display_hour}:#{minute.to_s.rjust(2, '0')}#{period}"
  end

  def next_with_times(from_time, &next_date_fn)
    today = from_time.to_date
    times = effective_times_of_day

    if date_matches_schedule?(today)
      next_time = times.find { |t| build_time(today, t) > from_time }
      return build_time(today, next_time) if next_time
    end

    next_date = next_date_fn.call(today)
    build_time(next_date, times.first)
  end

  def build_time(date, time_str)
    hour, minute = time_str.split(":").map(&:to_i)
    Time.zone.local(date.year, date.month, date.day, hour, minute)
  end

  def date_matches_schedule?(date)
    case frequency_type
    when "daily"         then true
    when "specific_days" then (days_of_week || []).include?(date.wday)
    when "weekly"        then date.wday == (day_of_week || 0)
    when "monthly"
      target = [day_of_month || 1, date.end_of_month.day].min
      date.day == target
    when "yearly"
      date.month == (month_of_year || 1) &&
        date.day == [day_of_month || 1, date.end_of_month.day].min
    else
      false
    end
  end

  def next_every_n_hours(from_time)
    hours = interval || 1
    next_hour = ((from_time.hour / hours) + 1) * hours

    if next_hour >= 24
      tomorrow = from_time.to_date + 1.day
      Time.zone.local(tomorrow.year, tomorrow.month, tomorrow.day, next_hour % 24, 0)
    else
      from_time.change(hour: next_hour, min: 0, sec: 0)
    end
  end

  def next_specific_day_date(from_date)
    sorted_days = (days_of_week || []).sort
    return from_date + 1.day if sorted_days.empty?

    next_day = sorted_days.find { |d| d > from_date.wday }
    if next_day
      from_date + (next_day - from_date.wday).days
    else
      from_date + (7 - from_date.wday + sorted_days.first).days
    end
  end

  def next_weekly_date(from_date)
    target_wday = day_of_week || 0
    weeks = interval || 1
    days_until = (target_wday - from_date.wday) % 7
    days_until = 7 if days_until.zero?
    next_date = from_date + days_until.days
    next_date += (weeks - 1) * 7 if weeks > 1 && days_until < 7
    next_date
  end

  def next_monthly_date(from_date)
    target_day = day_of_month || 1
    months = interval || 1
    next_date = from_date + months.months
    actual_day = [target_day, next_date.end_of_month.day].min
    Date.new(next_date.year, next_date.month, actual_day)
  end

  def next_yearly_date(from_date)
    target_month = month_of_year || 1
    target_day = day_of_month || 1
    next_year = from_date.year + 1
    actual_day = [target_day, Date.new(next_year, target_month, -1).day].min
    Date.new(next_year, target_month, actual_day)
  end
end
