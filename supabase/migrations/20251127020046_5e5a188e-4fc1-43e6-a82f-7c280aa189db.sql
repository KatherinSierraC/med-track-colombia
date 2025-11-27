-- Agregar foreign keys para integridad referencial en redistribuciones
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'redistribuciones_id_medicamento_fkey'
  ) THEN
    ALTER TABLE public.redistribuciones
    ADD CONSTRAINT redistribuciones_id_medicamento_fkey 
    FOREIGN KEY (id_medicamento) REFERENCES public.medicamentos(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'redistribuciones_id_sede_origen_fkey'
  ) THEN
    ALTER TABLE public.redistribuciones
    ADD CONSTRAINT redistribuciones_id_sede_origen_fkey 
    FOREIGN KEY (id_sede_origen) REFERENCES public.sedes(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'redistribuciones_id_sede_destino_fkey'
  ) THEN
    ALTER TABLE public.redistribuciones
    ADD CONSTRAINT redistribuciones_id_sede_destino_fkey 
    FOREIGN KEY (id_sede_destino) REFERENCES public.sedes(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'redistribuciones_id_solicitante_fkey'
  ) THEN
    ALTER TABLE public.redistribuciones
    ADD CONSTRAINT redistribuciones_id_solicitante_fkey 
    FOREIGN KEY (id_solicitante) REFERENCES public.usuarios(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_redistribuciones_estado ON public.redistribuciones(estado);
CREATE INDEX IF NOT EXISTS idx_redistribuciones_prioridad_automatica ON public.redistribuciones(prioridad_automatica);
CREATE INDEX IF NOT EXISTS idx_redistribuciones_id_medicamento ON public.redistribuciones(id_medicamento);
CREATE INDEX IF NOT EXISTS idx_redistribuciones_id_sede_origen ON public.redistribuciones(id_sede_origen);
CREATE INDEX IF NOT EXISTS idx_redistribuciones_id_sede_destino ON public.redistribuciones(id_sede_destino);
CREATE INDEX IF NOT EXISTS idx_redistribuciones_fecha_solicitud ON public.redistribuciones(fecha_solicitud DESC);

-- Función para actualizar inventario cuando se completa una redistribución
CREATE OR REPLACE FUNCTION public.procesar_redistribucion_completada()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Solo procesar cuando el estado cambia a 'completado'
  IF NEW.estado = 'completado' AND OLD.estado != 'completado' THEN
    
    -- Reducir stock en sede origen
    UPDATE public.inventario
    SET cantidad_actual = cantidad_actual - NEW.cantidad_solicitada
    WHERE id_medicamento = NEW.id_medicamento
      AND id_sede = NEW.id_sede_origen
      AND (NEW.lote IS NULL OR lote = NEW.lote);
    
    -- Aumentar stock en sede destino (o crear nuevo registro si no existe)
    INSERT INTO public.inventario (
      id_medicamento, 
      id_sede, 
      cantidad_actual, 
      lote,
      fecha_vencimiento,
      fecha_ingreso
    )
    SELECT 
      NEW.id_medicamento,
      NEW.id_sede_destino,
      NEW.cantidad_solicitada,
      COALESCE(NEW.lote, 'REDISTRIBUCION-' || NEW.id),
      COALESCE(
        (SELECT fecha_vencimiento FROM public.inventario 
         WHERE id_medicamento = NEW.id_medicamento 
           AND id_sede = NEW.id_sede_origen 
           AND (NEW.lote IS NULL OR lote = NEW.lote)
         LIMIT 1),
        CURRENT_DATE + INTERVAL '1 year'
      ),
      CURRENT_DATE
    ON CONFLICT DO NOTHING;
    
    -- Registrar movimiento de salida en sede origen
    INSERT INTO public.movimientos (
      tipo,
      id_medicamento,
      id_sede,
      cantidad,
      lote,
      id_usuario,
      observaciones
    )
    VALUES (
      'salida',
      NEW.id_medicamento,
      NEW.id_sede_origen,
      NEW.cantidad_solicitada,
      NEW.lote,
      NEW.id_solicitante,
      'Redistribución a ' || (SELECT nombre FROM public.sedes WHERE id = NEW.id_sede_destino)
    );
    
    -- Registrar movimiento de entrada en sede destino
    INSERT INTO public.movimientos (
      tipo,
      id_medicamento,
      id_sede,
      cantidad,
      lote,
      id_usuario,
      observaciones
    )
    VALUES (
      'entrada',
      NEW.id_medicamento,
      NEW.id_sede_destino,
      NEW.cantidad_solicitada,
      NEW.lote,
      NEW.id_solicitante,
      'Redistribución desde ' || (SELECT nombre FROM public.sedes WHERE id = NEW.id_sede_origen)
    );
    
    -- Establecer fecha de completado
    NEW.fecha_completado = NOW();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Eliminar trigger existente si existe
DROP TRIGGER IF EXISTS trigger_procesar_redistribucion ON public.redistribuciones;

-- Crear trigger para procesar redistribuciones completadas
CREATE TRIGGER trigger_procesar_redistribucion
BEFORE UPDATE OF estado ON public.redistribuciones
FOR EACH ROW
EXECUTE FUNCTION public.procesar_redistribucion_completada();