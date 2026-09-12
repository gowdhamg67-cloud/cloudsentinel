terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  required_version = ">= 1.6.0"
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "CloudSentinel"
      Environment = "dev"
      ManagedBy   = "Terraform"
    }
  }
}

resource "aws_dynamodb_table" "incidents" {
  name         = "cloudsentinel-incidents"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "incident_id"

  attribute {
    name = "incident_id"
    type = "S"
  }

  tags = {
    Name = "CloudSentinel Incidents"
  }
}