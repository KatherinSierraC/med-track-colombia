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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      alertas: {
        Row: {
          created_at: string | null
          descripcion: string
          estado: string
          fecha_generada: string
          fecha_resolucion: string | null
          id: number
          id_medicamento: number
          id_sede: number
          id_usuario_resolucion: string | null
          nivel_prioridad: string
          observaciones: string | null
          tipo: string
        }
        Insert: {
          created_at?: string | null
          descripcion: string
          estado?: string
          fecha_generada?: string
          fecha_resolucion?: string | null
          id?: number
          id_medicamento: number
          id_sede: number
          id_usuario_resolucion?: string | null
          nivel_prioridad: string
          observaciones?: string | null
          tipo: string
        }
        Update: {
          created_at?: string | null
          descripcion?: string
          estado?: string
          fecha_generada?: string
          fecha_resolucion?: string | null
          id?: number
          id_medicamento?: number
          id_sede?: number
          id_usuario_resolucion?: string | null
          nivel_prioridad?: string
          observaciones?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "alertas_id_medicamento_fkey"
            columns: ["id_medicamento"]
            isOneToOne: false
            referencedRelation: "medicamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_id_sede_fkey"
            columns: ["id_sede"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_id_usuario_resolucion_fkey"
            columns: ["id_usuario_resolucion"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias_patologias: {
        Row: {
          color_identificacion: string
          created_at: string | null
          descripcion: string | null
          id: number
          nivel_prioridad: string
          nombre: string
        }
        Insert: {
          color_identificacion: string
          created_at?: string | null
          descripcion?: string | null
          id?: number
          nivel_prioridad: string
          nombre: string
        }
        Update: {
          color_identificacion?: string
          created_at?: string | null
          descripcion?: string | null
          id?: number
          nivel_prioridad?: string
          nombre?: string
        }
        Relationships: []
      }
      inventario: {
        Row: {
          cantidad_actual: number
          created_at: string | null
          fecha_ingreso: string
          fecha_vencimiento: string
          id: number
          id_medicamento: number
          id_sede: number
          lote: string
          precio_unitario: number | null
          proveedor: string | null
        }
        Insert: {
          cantidad_actual?: number
          created_at?: string | null
          fecha_ingreso?: string
          fecha_vencimiento: string
          id?: number
          id_medicamento: number
          id_sede: number
          lote: string
          precio_unitario?: number | null
          proveedor?: string | null
        }
        Update: {
          cantidad_actual?: number
          created_at?: string | null
          fecha_ingreso?: string
          fecha_vencimiento?: string
          id?: number
          id_medicamento?: number
          id_sede?: number
          lote?: string
          precio_unitario?: number | null
          proveedor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventario_id_medicamento_fkey"
            columns: ["id_medicamento"]
            isOneToOne: false
            referencedRelation: "medicamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_id_sede_fkey"
            columns: ["id_sede"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      medicamentos: {
        Row: {
          concentracion: string | null
          created_at: string | null
          descripcion: string | null
          id: number
          id_categoria_patologia: number | null
          nombre: string
          presentacion: string | null
          principio_activo: string | null
          requiere_refrigeracion: boolean | null
          unidad_medida: string | null
        }
        Insert: {
          concentracion?: string | null
          created_at?: string | null
          descripcion?: string | null
          id?: number
          id_categoria_patologia?: number | null
          nombre: string
          presentacion?: string | null
          principio_activo?: string | null
          requiere_refrigeracion?: boolean | null
          unidad_medida?: string | null
        }
        Update: {
          concentracion?: string | null
          created_at?: string | null
          descripcion?: string | null
          id?: number
          id_categoria_patologia?: number | null
          nombre?: string
          presentacion?: string | null
          principio_activo?: string | null
          requiere_refrigeracion?: boolean | null
          unidad_medida?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medicamentos_id_categoria_patologia_fkey"
            columns: ["id_categoria_patologia"]
            isOneToOne: false
            referencedRelation: "categorias_patologias"
            referencedColumns: ["id"]
          },
        ]
      }
      movimientos: {
        Row: {
          cantidad: number
          created_at: string | null
          documento_paciente: string | null
          fecha_movimiento: string
          id: number
          id_medicamento: number
          id_sede: number
          id_usuario: string
          lote: string | null
          observaciones: string | null
          tipo: string
        }
        Insert: {
          cantidad: number
          created_at?: string | null
          documento_paciente?: string | null
          fecha_movimiento?: string
          id?: number
          id_medicamento: number
          id_sede: number
          id_usuario: string
          lote?: string | null
          observaciones?: string | null
          tipo: string
        }
        Update: {
          cantidad?: number
          created_at?: string | null
          documento_paciente?: string | null
          fecha_movimiento?: string
          id?: number
          id_medicamento?: number
          id_sede?: number
          id_usuario?: string
          lote?: string | null
          observaciones?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_id_medicamento_fkey"
            columns: ["id_medicamento"]
            isOneToOne: false
            referencedRelation: "medicamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_id_sede_fkey"
            columns: ["id_sede"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      redistribuciones: {
        Row: {
          cantidad_pacientes_afectados: number | null
          cantidad_solicitada: number
          created_at: string | null
          estado: string
          fecha_completado: string | null
          fecha_solicitud: string
          id: number
          id_medicamento: number
          id_sede_destino: number
          id_sede_origen: number
          id_solicitante: string
          justificacion_prioridad: string | null
          lote: string | null
          motivo: string | null
          prioridad_ajustada: string | null
          prioridad_automatica: string
        }
        Insert: {
          cantidad_pacientes_afectados?: number | null
          cantidad_solicitada: number
          created_at?: string | null
          estado?: string
          fecha_completado?: string | null
          fecha_solicitud?: string
          id?: number
          id_medicamento: number
          id_sede_destino: number
          id_sede_origen: number
          id_solicitante: string
          justificacion_prioridad?: string | null
          lote?: string | null
          motivo?: string | null
          prioridad_ajustada?: string | null
          prioridad_automatica: string
        }
        Update: {
          cantidad_pacientes_afectados?: number | null
          cantidad_solicitada?: number
          created_at?: string | null
          estado?: string
          fecha_completado?: string | null
          fecha_solicitud?: string
          id?: number
          id_medicamento?: number
          id_sede_destino?: number
          id_sede_origen?: number
          id_solicitante?: string
          justificacion_prioridad?: string | null
          lote?: string | null
          motivo?: string | null
          prioridad_ajustada?: string | null
          prioridad_automatica?: string
        }
        Relationships: [
          {
            foreignKeyName: "redistribuciones_id_medicamento_fkey"
            columns: ["id_medicamento"]
            isOneToOne: false
            referencedRelation: "medicamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redistribuciones_id_sede_destino_fkey"
            columns: ["id_sede_destino"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redistribuciones_id_sede_origen_fkey"
            columns: ["id_sede_origen"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redistribuciones_id_solicitante_fkey"
            columns: ["id_solicitante"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      sedes: {
        Row: {
          activo: boolean | null
          ciudad: string | null
          created_at: string | null
          departamento: string | null
          direccion: string | null
          email: string | null
          id: number
          nombre: string
          telefono: string | null
          tipo: string
        }
        Insert: {
          activo?: boolean | null
          ciudad?: string | null
          created_at?: string | null
          departamento?: string | null
          direccion?: string | null
          email?: string | null
          id?: number
          nombre: string
          telefono?: string | null
          tipo: string
        }
        Update: {
          activo?: boolean | null
          ciudad?: string | null
          created_at?: string | null
          departamento?: string | null
          direccion?: string | null
          email?: string | null
          id?: number
          nombre?: string
          telefono?: string | null
          tipo?: string
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          activo: boolean | null
          created_at: string | null
          email: string
          id: string
          id_sede_principal: number | null
          nombre_completo: string
          telefono: string | null
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          email: string
          id: string
          id_sede_principal?: number | null
          nombre_completo: string
          telefono?: string | null
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          email?: string
          id?: string
          id_sede_principal?: number | null
          nombre_completo?: string
          telefono?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_id_sede_principal_fkey"
            columns: ["id_sede_principal"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
