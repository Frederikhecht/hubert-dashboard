class TaskInstructionsBuilder
  def initialize(task)
    @task = task
  end

  def build
    parts = [@task.title]

    pre_instructions = User.first&.task_pre_instructions
    parts << "\n\n#{pre_instructions}" if pre_instructions.present?

    if @task.skill.present?
      parts << "\n\nUse the #{@task.skill} skill and read all of its instructions carefully and run them."
    end

    parts << "\n\n#{@task.description}" if @task.description.present?

    parts.join
  end
end
