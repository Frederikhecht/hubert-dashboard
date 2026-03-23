User.find_or_create_by!(email_address: "admin@example.com") do |u|
  u.password = "password"
  u.password_confirmation = "password"
  u.timezone = "Europe/Copenhagen"
end

puts "Seeded user: admin@example.com / password"
