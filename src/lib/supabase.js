import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://tsjcqbeaokhnrncpbkzx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzamNxYmVhb2tobnJuY3Bia3p4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNzYzMDgsImV4cCI6MjA5MTk1MjMwOH0.9rx6O9nhzXwvhdthLnE9oX1-xrS7cnncAGsITpQeGDE'
)
