export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          activity_type: string
          created_at: string
          description: string | null
          id: string
          related_booking_id: string | null
          related_user_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          description?: string | null
          id?: string
          related_booking_id?: string | null
          related_user_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string | null
          id?: string
          related_booking_id?: string | null
          related_user_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_related_booking_id_fkey"
            columns: ["related_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_slots: {
        Row: {
          created_at: string
          day: string
          id: string
          period: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day: string
          id?: string
          period: string
          user_id: string
        }
        Update: {
          created_at?: string
          day?: string
          id?: string
          period?: string
          user_id?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          booking_date: string
          cancellation_reason: string | null
          cancelled_by: string | null
          children_ages: string | null
          created_at: string
          end_time: string | null
          family_user_id: string
          hourly_rate: number | null
          id: string
          nanny_user_id: string
          number_of_children: number | null
          service_type: string | null
          special_instructions: string | null
          start_time: string | null
          status: string
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          booking_date: string
          cancellation_reason?: string | null
          cancelled_by?: string | null
          children_ages?: string | null
          created_at?: string
          end_time?: string | null
          family_user_id: string
          hourly_rate?: number | null
          id?: string
          nanny_user_id: string
          number_of_children?: number | null
          service_type?: string | null
          special_instructions?: string | null
          start_time?: string | null
          status?: string
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          booking_date?: string
          cancellation_reason?: string | null
          cancelled_by?: string | null
          children_ages?: string | null
          created_at?: string
          end_time?: string | null
          family_user_id?: string
          hourly_rate?: number | null
          id?: string
          nanny_user_id?: string
          number_of_children?: number | null
          service_type?: string | null
          special_instructions?: string | null
          start_time?: string | null
          status?: string
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      children: {
        Row: {
          birth_year: number
          created_at: string
          family_user_id: string
          gender: string | null
          id: string
          name: string | null
          notes: string | null
          updated_at: string
        }
        Insert: {
          birth_year: number
          created_at?: string
          family_user_id: string
          gender?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          updated_at?: string
        }
        Update: {
          birth_year?: number
          created_at?: string
          family_user_id?: string
          gender?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          family_user_id: string
          id: string
          last_message_at: string | null
          nanny_user_id: string
        }
        Insert: {
          created_at?: string
          family_user_id: string
          id?: string
          last_message_at?: string | null
          nanny_user_id: string
        }
        Update: {
          created_at?: string
          family_user_id?: string
          id?: string
          last_message_at?: string | null
          nanny_user_id?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      family_profiles: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string
          household_description: string | null
          id: string
          is_seeded: boolean | null
          latitude: number | null
          longitude: number | null
          onboarding_completed: boolean | null
          pets_description: string | null
          postal_code: string | null
          preferred_language: string | null
          profile_status: string | null
          profile_visible: boolean | null
          special_requirements: string | null
          state: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          household_description?: string | null
          id?: string
          is_seeded?: boolean | null
          latitude?: number | null
          longitude?: number | null
          onboarding_completed?: boolean | null
          pets_description?: string | null
          postal_code?: string | null
          preferred_language?: string | null
          profile_status?: string | null
          profile_visible?: boolean | null
          special_requirements?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          household_description?: string | null
          id?: string
          is_seeded?: boolean | null
          latitude?: number | null
          longitude?: number | null
          onboarding_completed?: boolean | null
          pets_description?: string | null
          postal_code?: string | null
          preferred_language?: string | null
          profile_status?: string | null
          profile_visible?: boolean | null
          special_requirements?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      favorite_nannies: {
        Row: {
          created_at: string
          family_user_id: string
          id: string
          nanny_user_id: string
        }
        Insert: {
          created_at?: string
          family_user_id: string
          id?: string
          nanny_user_id: string
        }
        Update: {
          created_at?: string
          family_user_id?: string
          id?: string
          nanny_user_id?: string
        }
        Relationships: []
      }
      job_applications: {
        Row: {
          created_at: string
          id: string
          job_id: string
          message: string | null
          nanny_user_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          message?: string | null
          nanny_user_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          message?: string | null
          nanny_user_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          children_ages: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          currency: string | null
          description: string | null
          end_date: string | null
          family_user_id: string | null
          hourly_rate: number | null
          id: string
          job_source: string
          location: string | null
          number_of_children: number | null
          requirements: string | null
          schedule: string | null
          service_type: string
          start_date: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          children_ages?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          end_date?: string | null
          family_user_id?: string | null
          hourly_rate?: number | null
          id?: string
          job_source?: string
          location?: string | null
          number_of_children?: number | null
          requirements?: string | null
          schedule?: string | null
          service_type: string
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          children_ages?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          end_date?: string | null
          family_user_id?: string | null
          hourly_rate?: number | null
          id?: string
          job_source?: string
          location?: string | null
          number_of_children?: number | null
          requirements?: string | null
          schedule?: string | null
          service_type?: string
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          read: boolean | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read?: boolean | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read?: boolean | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      nanny_documents: {
        Row: {
          created_at: string
          document_name: string | null
          document_type: string
          document_url: string
          id: string
          reviewed_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          document_name?: string | null
          document_type: string
          document_url: string
          id?: string
          reviewed_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          document_name?: string | null
          document_type?: string
          document_url?: string
          id?: string
          reviewed_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      nanny_photos: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          is_primary: boolean | null
          photo_url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_primary?: boolean | null
          photo_url: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_primary?: boolean | null
          photo_url?: string
          user_id?: string
        }
        Relationships: []
      }
      nanny_profiles: {
        Row: {
          activities_offered: string[] | null
          ai_generated_description: string | null
          availability_notes: string | null
          available_cleaning_only: boolean | null
          available_friday: boolean | null
          available_monday: boolean | null
          available_saturday: boolean | null
          available_school_holidays: boolean | null
          available_sunday: boolean | null
          available_thursday: boolean | null
          available_tuesday: boolean | null
          available_wednesday: boolean | null
          avg_rating: number | null
          avg_response_time_hours: number | null
          babysitting_rate_chf: number | null
          background_check_passed: boolean | null
          bio: string | null
          can_cook: boolean | null
          can_do_light_housekeeping: boolean | null
          can_drive: boolean | null
          can_help_homework: boolean | null
          caregiver_types: string[] | null
          city: string | null
          comfortable_with_pets: boolean | null
          country: string | null
          course_links: Json | null
          created_at: string
          currency: string | null
          date_of_birth: string | null
          education: string | null
          email_verified: boolean | null
          experience_infants: boolean | null
          experience_preschool: boolean | null
          experience_school_age: boolean | null
          experience_special_needs: boolean | null
          experience_teenagers: boolean | null
          experience_toddlers: boolean | null
          gender: string | null
          has_car: boolean | null
          has_child_psychology: boolean | null
          has_cpr: boolean | null
          has_drivers_license: boolean | null
          has_early_childhood_cert: boolean | null
          has_first_aid: boolean | null
          has_montessori_cert: boolean | null
          has_nutrition_cert: boolean | null
          hourly_rate_recurring: number | null
          hourly_rate_spot: number | null
          id: string
          id_verified: boolean | null
          identity_verification_status: string | null
          identity_verified: boolean | null
          identity_verified_at: string | null
          job_alerts_enabled: boolean | null
          latitude: number | null
          longitude: number | null
          manual_identity_verified: boolean | null
          nationality: string | null
          offers_after_school: boolean | null
          offers_date_night: boolean | null
          offers_full_time: boolean | null
          offers_overnight: boolean | null
          offers_part_time: boolean | null
          offers_weekend_holiday: boolean | null
          onboarding_completed: boolean | null
          other_certifications: string[] | null
          part_time_childcare_rate_chf: number | null
          phone_number: string | null
          phone_verified: boolean | null
          police_certificate_passed: boolean | null
          postal_code: string | null
          profile_status: string
          profile_visible: boolean | null
          rejection_reason: string | null
          response_rate: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          smoking_status: string | null
          special_needs_details: string | null
          state: string | null
          total_reviews: number
          updated_at: string
          user_id: string
          video_intro_url: string | null
          voice_intro_url: string | null
          work_radius_km: number | null
          years_of_experience: number | null
        }
        Insert: {
          activities_offered?: string[] | null
          ai_generated_description?: string | null
          availability_notes?: string | null
          available_cleaning_only?: boolean | null
          available_friday?: boolean | null
          available_monday?: boolean | null
          available_saturday?: boolean | null
          available_school_holidays?: boolean | null
          available_sunday?: boolean | null
          available_thursday?: boolean | null
          available_tuesday?: boolean | null
          available_wednesday?: boolean | null
          avg_rating?: number | null
          avg_response_time_hours?: number | null
          babysitting_rate_chf?: number | null
          background_check_passed?: boolean | null
          bio?: string | null
          can_cook?: boolean | null
          can_do_light_housekeeping?: boolean | null
          can_drive?: boolean | null
          can_help_homework?: boolean | null
          caregiver_types?: string[] | null
          city?: string | null
          comfortable_with_pets?: boolean | null
          country?: string | null
          course_links?: Json | null
          created_at?: string
          currency?: string | null
          date_of_birth?: string | null
          education?: string | null
          email_verified?: boolean | null
          experience_infants?: boolean | null
          experience_preschool?: boolean | null
          experience_school_age?: boolean | null
          experience_special_needs?: boolean | null
          experience_teenagers?: boolean | null
          experience_toddlers?: boolean | null
          gender?: string | null
          has_car?: boolean | null
          has_child_psychology?: boolean | null
          has_cpr?: boolean | null
          has_drivers_license?: boolean | null
          has_early_childhood_cert?: boolean | null
          has_first_aid?: boolean | null
          has_montessori_cert?: boolean | null
          has_nutrition_cert?: boolean | null
          hourly_rate_recurring?: number | null
          hourly_rate_spot?: number | null
          id?: string
          id_verified?: boolean | null
          identity_verification_status?: string | null
          identity_verified?: boolean | null
          identity_verified_at?: string | null
          job_alerts_enabled?: boolean | null
          latitude?: number | null
          longitude?: number | null
          manual_identity_verified?: boolean | null
          nationality?: string | null
          offers_after_school?: boolean | null
          offers_date_night?: boolean | null
          offers_full_time?: boolean | null
          offers_overnight?: boolean | null
          offers_part_time?: boolean | null
          offers_weekend_holiday?: boolean | null
          onboarding_completed?: boolean | null
          other_certifications?: string[] | null
          part_time_childcare_rate_chf?: number | null
          phone_number?: string | null
          phone_verified?: boolean | null
          police_certificate_passed?: boolean | null
          postal_code?: string | null
          profile_status?: string
          profile_visible?: boolean | null
          rejection_reason?: string | null
          response_rate?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          smoking_status?: string | null
          special_needs_details?: string | null
          state?: string | null
          total_reviews?: number
          updated_at?: string
          user_id: string
          video_intro_url?: string | null
          voice_intro_url?: string | null
          work_radius_km?: number | null
          years_of_experience?: number | null
        }
        Update: {
          activities_offered?: string[] | null
          ai_generated_description?: string | null
          availability_notes?: string | null
          available_cleaning_only?: boolean | null
          available_friday?: boolean | null
          available_monday?: boolean | null
          available_saturday?: boolean | null
          available_school_holidays?: boolean | null
          available_sunday?: boolean | null
          available_thursday?: boolean | null
          available_tuesday?: boolean | null
          available_wednesday?: boolean | null
          avg_rating?: number | null
          avg_response_time_hours?: number | null
          babysitting_rate_chf?: number | null
          background_check_passed?: boolean | null
          bio?: string | null
          can_cook?: boolean | null
          can_do_light_housekeeping?: boolean | null
          can_drive?: boolean | null
          can_help_homework?: boolean | null
          caregiver_types?: string[] | null
          city?: string | null
          comfortable_with_pets?: boolean | null
          country?: string | null
          course_links?: Json | null
          created_at?: string
          currency?: string | null
          date_of_birth?: string | null
          education?: string | null
          email_verified?: boolean | null
          experience_infants?: boolean | null
          experience_preschool?: boolean | null
          experience_school_age?: boolean | null
          experience_special_needs?: boolean | null
          experience_teenagers?: boolean | null
          experience_toddlers?: boolean | null
          gender?: string | null
          has_car?: boolean | null
          has_child_psychology?: boolean | null
          has_cpr?: boolean | null
          has_drivers_license?: boolean | null
          has_early_childhood_cert?: boolean | null
          has_first_aid?: boolean | null
          has_montessori_cert?: boolean | null
          has_nutrition_cert?: boolean | null
          hourly_rate_recurring?: number | null
          hourly_rate_spot?: number | null
          id?: string
          id_verified?: boolean | null
          identity_verification_status?: string | null
          identity_verified?: boolean | null
          identity_verified_at?: string | null
          job_alerts_enabled?: boolean | null
          latitude?: number | null
          longitude?: number | null
          manual_identity_verified?: boolean | null
          nationality?: string | null
          offers_after_school?: boolean | null
          offers_date_night?: boolean | null
          offers_full_time?: boolean | null
          offers_overnight?: boolean | null
          offers_part_time?: boolean | null
          offers_weekend_holiday?: boolean | null
          onboarding_completed?: boolean | null
          other_certifications?: string[] | null
          part_time_childcare_rate_chf?: number | null
          phone_number?: string | null
          phone_verified?: boolean | null
          police_certificate_passed?: boolean | null
          postal_code?: string | null
          profile_status?: string
          profile_visible?: boolean | null
          rejection_reason?: string | null
          response_rate?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          smoking_status?: string | null
          special_needs_details?: string | null
          state?: string | null
          total_reviews?: number
          updated_at?: string
          user_id?: string
          video_intro_url?: string | null
          voice_intro_url?: string | null
          work_radius_km?: number | null
          years_of_experience?: number | null
        }
        Relationships: []
      }
      nanny_references: {
        Row: {
          content: string
          created_at: string
          family_user_id: string
          id: string
          is_flagged: boolean
          is_verified_interaction: boolean
          nanny_user_id: string
          rating: number
          relationship: string | null
          service_period: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          family_user_id: string
          id?: string
          is_flagged?: boolean
          is_verified_interaction?: boolean
          nanny_user_id: string
          rating: number
          relationship?: string | null
          service_period?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          family_user_id?: string
          id?: string
          is_flagged?: boolean
          is_verified_interaction?: boolean
          nanny_user_id?: string
          rating?: number
          relationship?: string | null
          service_period?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      nanny_self_references: {
        Row: {
          created_at: string
          family_name: string
          id: string
          reference_letter_url: string | null
          relationship: string | null
          service_period: string | null
          testimonial: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          family_name: string
          id?: string
          reference_letter_url?: string | null
          relationship?: string | null
          service_period?: string | null
          testimonial?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          family_name?: string
          id?: string
          reference_letter_url?: string | null
          relationship?: string | null
          service_period?: string | null
          testimonial?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string | null
          read: boolean
          related_job_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          read?: boolean
          related_job_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          read?: boolean
          related_job_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_related_job_id_fkey"
            columns: ["related_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          booking_id: string | null
          created_at: string
          currency: string
          description: string | null
          family_user_id: string
          id: string
          nanny_user_id: string
          paid_at: string | null
          payment_type: string
          status: string
        }
        Insert: {
          amount: number
          booking_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          family_user_id: string
          id?: string
          nanny_user_id: string
          paid_at?: string | null
          payment_type?: string
          status?: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          family_user_id?: string
          id?: string
          nanny_user_id?: string
          paid_at?: string | null
          payment_type?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          languages: string[] | null
          location: string | null
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          languages?: string[] | null
          location?: string | null
          phone?: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          languages?: string[] | null
          location?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_certificates: {
        Row: {
          certificate_type: string
          created_at: string
          file_url: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          certificate_type: string
          created_at?: string
          file_url: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          certificate_type?: string
          created_at?: string
          file_url?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_review_nanny: {
        Args: { _family_id: string; _nanny_id: string }
        Returns: boolean
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_public_nanny_profiles: {
        Args: never
        Returns: {
          activities_offered: string[]
          ai_generated_description: string
          avatar_url: string
          avg_rating: number
          babysitting_rate_chf: number
          background_check_passed: boolean
          bio: string
          can_cook: boolean
          can_do_light_housekeeping: boolean
          can_drive: boolean
          can_help_homework: boolean
          caregiver_types: string[]
          city: string
          comfortable_with_pets: boolean
          country: string
          currency: string
          education: string
          experience_infants: boolean
          experience_preschool: boolean
          experience_school_age: boolean
          experience_special_needs: boolean
          experience_teenagers: boolean
          experience_toddlers: boolean
          full_name: string
          gender: string
          has_car: boolean
          has_child_psychology: boolean
          has_cpr: boolean
          has_drivers_license: boolean
          has_early_childhood_cert: boolean
          has_first_aid: boolean
          has_montessori_cert: boolean
          has_nutrition_cert: boolean
          hourly_rate_recurring: number
          hourly_rate_spot: number
          id_verified: boolean
          languages: string[]
          latitude: number
          longitude: number
          nationality: string
          offers_after_school: boolean
          offers_date_night: boolean
          offers_full_time: boolean
          offers_overnight: boolean
          offers_part_time: boolean
          offers_weekend_holiday: boolean
          part_time_childcare_rate_chf: number
          profile_status: string
          smoking_status: string
          state: string
          total_reviews: number
          user_id: string
          video_intro_url: string
          voice_intro_url: string
          work_radius_km: number
          years_of_experience: number
        }[]
      }
      has_admin_access: { Args: { _user_id: string }; Returns: boolean }
      has_booking_with: {
        Args: { _user_a: string; _user_b: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "family" | "nanny" | "admin" | "moderator" | "support"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["family", "nanny", "admin", "moderator", "support"],
    },
  },
} as const
