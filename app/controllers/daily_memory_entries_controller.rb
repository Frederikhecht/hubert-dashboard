class DailyMemoryEntriesController < ApplicationController
  def index
    entries = DailyMemoryEntry.ordered
    render inertia: "DailyMemory/Index", props: {
      groupedEntries: grouped_entries(entries)
    }
  end

  def create
    entry = DailyMemoryEntry.new(daily_memory_entry_params)
    entry.project = entry.project&.strip.presence
    entry.entry_date ||= Date.current

    if entry.save
      redirect_to daily_memory_entries_path, notice: "Memory entry saved."
    else
      redirect_to daily_memory_entries_path, alert: entry.errors.full_messages.join(", ")
    end
  end

  private

  def daily_memory_entry_params
    params.require(:daily_memory_entry).permit(:entry_date, :project, :summary, :details)
  end

  def grouped_entries(entries)
    entries
      .group_by(&:entry_date)
      .sort_by { |date, _| date }
      .reverse
      .map do |date, group|
        {
          entryDate: date.iso8601,
          entryCount: group.size,
          entries: group.map { |entry| serialize_entry(entry) }
        }
      end
  end

  def serialize_entry(entry)
    {
      id: entry.id.to_s,
      entryDate: entry.entry_date.iso8601,
      project: entry.project,
      summary: entry.summary,
      details: entry.details,
      createdAt: entry.created_at.iso8601
    }
  end

end
