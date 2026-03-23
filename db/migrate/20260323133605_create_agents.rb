class CreateAgents < ActiveRecord::Migration[8.1]
  def change
    create_table :agents do |t|
      t.string :openclaw_agent_id
      t.string :name
      t.string :role
      t.boolean :active

      t.timestamps
    end
    add_index :agents, :openclaw_agent_id, unique: true
  end
end
