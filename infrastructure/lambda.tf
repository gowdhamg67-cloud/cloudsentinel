resource "aws_iam_role" "incident_lambda_role" {
  name = "cloudsentinel-incident-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"

    Statement = [{
      Effect = "Allow"

      Principal = {
        Service = "lambda.amazonaws.com"
      }

      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "incident_lambda_policy" {
  name = "cloudsentinel-incident-lambda-policy"
  role = aws_iam_role.incident_lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"

    Statement = [
      {
        Effect = "Allow"

        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]

        Resource = aws_dynamodb_table.incidents.arn
      },

      {
        Effect = "Allow"

        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]

        Resource = "*"
      },

      {
        Effect = "Allow"

        Action = [
          "bedrock:InvokeModel"
        ]

        Resource = "*"
      }
    ]
  })
}

data "archive_file" "incident_lambda" {
  type        = "zip"
  source_dir  = "${path.module}/../services/incident-api/dist"
  output_path = "${path.module}/incident-api.zip"
}

resource "aws_lambda_function" "incident_api" {
  function_name = "cloudsentinel-incident-api"

  role = aws_iam_role.incident_lambda_role.arn

  runtime = "nodejs22.x"
  handler = "handler.handler"

  filename         = data.archive_file.incident_lambda.output_path
  source_code_hash = data.archive_file.incident_lambda.output_base64sha256

  timeout     = 10
  memory_size = 256

  environment {
    variables = {
      INCIDENTS_TABLE_NAME = aws_dynamodb_table.incidents.name
    }
  }
}