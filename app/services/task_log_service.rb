class TaskLogService
  OPENCLAW_PATH = OpenclawService::OPENCLAW_PATH

  def initialize(task)
    @task = task
  end

  def verbose_logs
    return nil unless @task.agent.present? && @task.dispatched_at.present?

    agent_id = @task.agent.openclaw_agent_id
    sessions = load_agent_sessions(agent_id)
    return nil if sessions.empty?

    sessions.each do |key, session|
      next if key.to_s.include?(":subagent:")

      file = resolve_session_file(agent_id, session)
      next unless file && File.exist?(file)

      entries = extract_task_entries(file)
      next if entries.empty?

      entries.sort_by! { |e| e[:timestamp_raw] || "" }
      return format_log(entries)
    end

    nil
  rescue StandardError => e
    Rails.logger.error("[TaskLogService] Error for task ##{@task.id}: #{e.message}")
    nil
  end

  private

  def load_agent_sessions(agent_id)
    path = File.join(OPENCLAW_PATH, "agents", agent_id, "sessions", "sessions.json")
    return {} unless File.exist?(path)

    data = JSON.parse(File.read(path))
    data.is_a?(Hash) && data.key?("sessions") ? data["sessions"] : data
  rescue JSON::ParserError
    {}
  end

  def extract_task_entries(file)
    all_entries = parse_session_entries(file)

    task_start_idx = nil
    task_end_idx = nil

    all_entries.each_with_index do |entry, idx|
      raw = entry[:raw]
      next unless raw["type"] == "message"

      message = raw["message"]
      next unless message && message["role"] == "user"

      text = extract_user_text(message["content"])
      next unless text

      if task_start_idx.nil? && text.include?(@task.title)
        task_start_idx = idx
      elsif task_start_idx && task_end_idx.nil?
        task_end_idx = idx
        break
      end
    end

    return [] unless task_start_idx

    task_end_idx ||= all_entries.size
    all_entries[task_start_idx...task_end_idx]
  end

  def extract_user_text(content)
    if content.is_a?(Array)
      content.find { |c| c["type"] == "text" }&.dig("text")
    elsif content.is_a?(String)
      content
    end
  end

  def resolve_session_file(agent_id, session)
    file = session["sessionFile"]
    return file if file && File.exist?(file)

    session_id = session["sessionId"]
    if session_id
      derived = File.join(OPENCLAW_PATH, "agents", agent_id, "sessions", "#{session_id}.jsonl")
      return derived if File.exist?(derived)
    end

    nil
  end

  def parse_session_entries(file)
    entries = []
    File.foreach(file) do |line|
      entry = JSON.parse(line)
      entries << { raw: entry, timestamp_raw: entry["timestamp"] }
    rescue JSON::ParserError
      next
    end
    entries
  end

  def format_log(entries)
    lines = []
    entries.each do |entry|
      formatted = format_entry(entry[:raw])
      lines << formatted if formatted
    end
    lines.join("\n\n")
  end

  def format_entry(raw)
    timestamp = format_timestamp(raw["timestamp"])

    case raw["type"]
    when "message"  then format_message(raw, timestamp)
    when "model_change" then "[#{timestamp}] MODEL CHANGE -> #{raw['modelId']}"
    end
  end

  def format_message(raw, timestamp)
    message = raw["message"]
    return nil unless message

    role = message["role"]&.upcase || "UNKNOWN"
    content = message["content"]
    model = message["model"]
    usage = message["usage"]

    header = "[#{timestamp}] #{role}"
    if role == "ASSISTANT" && model
      model_name = model.to_s.split("/").last
      header += "  ·  #{model_name}"
      if usage
        tokens = (usage["input"] || 0) + (usage["output"] || 0)
        cost = usage.dig("cost", "total")
        header += "  ·  #{number_with_delimiter(tokens)} tokens"
        header += "  ·  $#{'%.4f' % cost}" if cost && cost > 0
      end
    end

    separator = "-" * [header.length, 80].min

    body_parts = []
    if content.is_a?(Array)
      content.each do |block|
        case block["type"]
        when "thinking"
          thinking = block["thinking"]
          body_parts << "<thinking>\n#{thinking}\n</thinking>" if thinking.present?
        when "text"
          text = block["text"]
          body_parts << text if text.present?
        when "toolCall"
          name = block["name"]
          args = block["arguments"]
          args_str = args.is_a?(Hash) ? JSON.pretty_generate(truncate_values(args)) : args.to_s
          body_parts << "-> Tool: #{name}\n#{args_str}"
        when "toolResult"
          result_text = extract_tool_result(block)
          body_parts << "<- Tool Result:\n#{result_text}" if result_text.present?
        end
      end
    elsif content.is_a?(String)
      body_parts << content
    end

    return nil if body_parts.empty? && role != "USER"

    "#{header}\n#{separator}\n#{body_parts.join("\n\n")}"
  end

  def truncate_values(hash)
    hash.transform_values do |v|
      v.is_a?(String) && v.length > 2000 ? "#{v[0..2000]}... [truncated, #{v.length} chars total]" : v
    end
  end

  def extract_tool_result(block)
    result = block["result"]
    if result.is_a?(Array)
      text = result.select { |r| r["type"] == "text" }.map { |r| r["text"] }.join("\n")
      text.length > 3000 ? "#{text[0..3000]}... [truncated]" : text
    elsif result.is_a?(String)
      result.length > 3000 ? "#{result[0..3000]}... [truncated]" : result
    end
  end

  def format_timestamp(ts)
    return "unknown" unless ts
    Time.parse(ts).strftime("%Y-%m-%d %H:%M:%S")
  rescue ArgumentError
    ts.to_s
  end

  def number_with_delimiter(number)
    number.to_s.reverse.gsub(/(\d{3})(?=\d)/, '\\1,').reverse
  end
end
