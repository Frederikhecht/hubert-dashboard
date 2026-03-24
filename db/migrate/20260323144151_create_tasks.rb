class CreateTasks < ActiveRecord::Migration[8.1]
  def change
    create_table :tasks do |t|
      t.string :title, null: false
      t.text :description
      t.string :skill
      t.string :status, null: false, default: "queue"
      t.integer :position, null: false, default: 0
      t.references :agent, null: true, foreign_key: true
      t.references :task_template, null: true, foreign_key: true
      t.bigint :task_recurring_schedule_id
      t.string :session_key
      t.datetime :dispatched_at
      t.datetime :scheduled_for
      t.datetime :completed_at
      t.datetime :archived_at

      t.timestamps
    end

    add_index :tasks, :status
    add_index :tasks, :archived_at
    add_index :tasks, :task_recurring_schedule_id
  end
end
