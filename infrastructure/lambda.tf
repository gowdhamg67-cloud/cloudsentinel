# ============================================================
# CLOUDSENTINEL INCIDENT LAMBDA
# ============================================================

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


# ============================================================
# CLOUDSENTINEL INCIDENT LAMBDA IAM POLICY
# ============================================================

resource "aws_iam_role_policy" "incident_lambda_policy" {
  name = "cloudsentinel-incident-lambda-policy"

  role = aws_iam_role.incident_lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"

    Statement = [

      # --------------------------------------------------------
      # DYNAMODB
      # --------------------------------------------------------

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


      # --------------------------------------------------------
      # CLOUDWATCH LOGGING
      # --------------------------------------------------------

      {
        Effect = "Allow"

        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]

        Resource = "*"
      },


      # --------------------------------------------------------
      # AMAZON BEDROCK
      # --------------------------------------------------------

      {
        Effect = "Allow"

        Action = [
          "bedrock:InvokeModel"
        ]

        Resource = "*"
      },


      # --------------------------------------------------------
      # CLOUDSENTINEL SELF-HEALING
      #
      # The Incident Lambda needs permission to:
      # 1. Update Payment Lambda configuration
      # 2. Check Payment Lambda configuration status
      # 3. Invoke Payment Lambda for health verification
      # --------------------------------------------------------

      {
        Effect = "Allow"

        Action = [
          "lambda:UpdateFunctionConfiguration",
          "lambda:GetFunctionConfiguration",
          "lambda:InvokeFunction"
        ]

        Resource = aws_lambda_function.payment_demo.arn
      }
    ]
  })
}


# ============================================================
# INCIDENT LAMBDA PACKAGE
# ============================================================

data "archive_file" "incident_lambda" {
  type = "zip"

  source_dir = "${path.module}/../services/incident-api/dist"

  output_path = "${path.module}/incident-api.zip"
}


# ============================================================
# CLOUDSENTINEL INCIDENT API LAMBDA
# ============================================================

resource "aws_lambda_function" "incident_api" {
  function_name = "cloudsentinel-incident-api"

  role = aws_iam_role.incident_lambda_role.arn

  runtime = "nodejs22.x"

  handler = "handler.handler"

  filename = data.archive_file.incident_lambda.output_path

  source_code_hash = data.archive_file.incident_lambda.output_base64sha256

  timeout = 10

  memory_size = 256

  environment {
    variables = {
      INCIDENTS_TABLE_NAME = aws_dynamodb_table.incidents.name

      PAYMENT_FUNCTION_NAME = "cloudsentinel-demo-payment"

      AI_MODE = "TEST"
    }
  }
}


# ============================================================
# CLOUDSENTINEL DEMO PAYMENT SERVICE
# ============================================================

resource "aws_iam_role" "payment_demo_role" {
  name = "cloudsentinel-payment-demo-role"

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


# ============================================================
# PAYMENT SERVICE IAM POLICY
# ============================================================

resource "aws_iam_role_policy" "payment_demo_policy" {
  name = "cloudsentinel-payment-demo-policy"

  role = aws_iam_role.payment_demo_role.id

  policy = jsonencode({
    Version = "2012-10-17"

    Statement = [

      # --------------------------------------------------------
      # CLOUDWATCH LOGGING ONLY
      # --------------------------------------------------------

      {
        Effect = "Allow"

        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]

        Resource = "*"
      }
    ]
  })
}


# ============================================================
# PAYMENT DEMO LAMBDA
# ============================================================

resource "aws_lambda_function" "payment_demo" {
  function_name = "cloudsentinel-demo-payment"

  role = aws_iam_role.payment_demo_role.arn

  runtime = "nodejs22.x"

  handler = "index.handler"

  filename = "${path.module}/payment-demo.zip"

  source_code_hash = filebase64sha256(
    "${path.module}/payment-demo.zip"
  )

  timeout = 10

  memory_size = 128

  environment {
    variables = {
      CLOUDSENTINEL_HEALTH = "HEALTHY"
    }
  }
}