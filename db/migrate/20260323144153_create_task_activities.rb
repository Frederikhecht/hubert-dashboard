class CreateTaskActivities < ActiveRecord::Migration[8.1]
  def change
    create_table :task_activities do |t|
      t.references :task, null: false, foreign_key: true
      t.string :action
      t.string :details
      t.datetime :timestamp

      t.timestamps
    end
  end
end
