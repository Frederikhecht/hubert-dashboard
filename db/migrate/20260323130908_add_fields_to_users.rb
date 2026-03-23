class AddFieldsToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :timezone, :string
    add_column :users, :task_pre_instructions, :text
  end
end
