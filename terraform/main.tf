terraform {
  required_providers {
    supabase = {
      source  = "supabase/supabase"
      version = "~> 1.0"
    }
  }
}

provider "supabase" {
  access_token = var.supabase_access_token
  project_id   = var.supabase_project_id
}

variable "supabase_access_token" {
  type      = string
  sensitive = true
}

variable "supabase_project_id" {
  type = string
}

# Example: Defining the App Users Table (Schema migration logic would go here or via plain SQL resource)
# Note: Supabase Terraform provider focuses mostly on Auth/Storage/Edge Functions settings.
# For table schema, we typically use the `supabase_db_database` resource or generic SQL execution.

resource "supabase_settings" "main" {
  project_id = var.supabase_project_id
  
  api = {
    max_rows = 1000
    extra_search_path = ["public", "extensions"] // Add extensions if used
  }
  
  auth = {
    site_url = "https://vectra.ai"
    email = {
      enable_signup = true
      double_confirm_changes = true
      enable_confirmations = true
    }
  }
}
