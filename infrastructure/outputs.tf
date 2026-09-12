output "aws_region" {
  description = "AWS region used by CloudSentinel"
  value       = var.aws_region
}

output "incidents_table_name" {
  description = "CloudSentinel incidents DynamoDB table"
  value       = aws_dynamodb_table.incidents.name
}