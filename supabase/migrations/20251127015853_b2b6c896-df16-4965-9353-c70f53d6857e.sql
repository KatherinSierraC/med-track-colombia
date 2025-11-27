-- Agregar columna observaciones si no existe
ALTER TABLE public.alertas 
ADD COLUMN IF NOT EXISTS observaciones TEXT;

-- Agregar foreign keys solo si no existen (usando DO block)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'alertas_id_medicamento_fkey'
  ) THEN
    ALTER TABLE public.alertas
    ADD CONSTRAINT alertas_id_medicamento_fkey 
    FOREIGN KEY (id_medicamento) REFERENCES public.medicamentos(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'alertas_id_usuario_resolucion_fkey'
  ) THEN
    ALTER TABLE public.alertas
    ADD CONSTRAINT alertas_id_usuario_resolucion_fkey 
    FOREIGN KEY (id_usuario_resolucion) REFERENCES public.usuarios(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Crear índices para mejorar el rendimiento de las consultas
CREATE INDEX IF NOT EXISTS idx_alertas_estado ON public.alertas(estado);
CREATE INDEX IF NOT EXISTS idx_alertas_tipo ON public.alertas(tipo);
CREATE INDEX IF NOT EXISTS idx_alertas_nivel_prioridad ON public.alertas(nivel_prioridad);
CREATE INDEX IF NOT EXISTS idx_alertas_id_sede ON public.alertas(id_sede);
CREATE INDEX IF NOT EXISTS idx_alertas_id_medicamento ON public.alertas(id_medicamento);
CREATE INDEX IF NOT EXISTS idx_alertas_fecha_generada ON public.alertas(fecha_generada DESC);

-- Función para generar alertas automáticamente según el inventario
CREATE OR REPLACE FUNCTION public.generar_alertas_inventario()
RETURNS TRIGGER AS $$
DECLARE
  stock_minimo INTEGER;
  nivel_critico INTEGER;
  dias_vencimiento INTEGER;
  prioridad_medicamento TEXT;
BEGIN
  -- Obtener la prioridad del medicamento
  SELECT COALESCE(cp.nivel_prioridad, 'media') INTO prioridad_medicamento
  FROM public.medicamentos m
  LEFT JOIN public.categorias_patologias cp ON m.id_categoria_patologia = cp.id
  WHERE m.id = NEW.id_medicamento;

  -- Definir umbrales según prioridad
  CASE prioridad_medicamento
    WHEN 'alta' THEN
      stock_minimo := 20;
      nivel_critico := 5;
      dias_vencimiento := 60;
    WHEN 'media' THEN
      stock_minimo := 10;
      nivel_critico := 3;
      dias_vencimiento := 30;
    ELSE
      stock_minimo := 5;
      nivel_critico := 2;
      dias_vencimiento := 15;
  END CASE;

  -- Alerta de desabastecimiento (cantidad = 0)
  IF NEW.cantidad_actual = 0 THEN
    INSERT INTO public.alertas (tipo, nivel_prioridad, descripcion, id_medicamento, id_sede)
    VALUES (
      'desabastecimiento',
      'alta',
      'Medicamento sin stock disponible',
      NEW.id_medicamento,
      NEW.id_sede
    )
    ON CONFLICT DO NOTHING;
  
  -- Alerta de stock crítico
  ELSIF NEW.cantidad_actual <= nivel_critico THEN
    INSERT INTO public.alertas (tipo, nivel_prioridad, descripcion, id_medicamento, id_sede)
    VALUES (
      'critico',
      'alta',
      'Stock en nivel crítico: ' || NEW.cantidad_actual || ' unidades',
      NEW.id_medicamento,
      NEW.id_sede
    )
    ON CONFLICT DO NOTHING;
  
  -- Alerta de stock mínimo
  ELSIF NEW.cantidad_actual <= stock_minimo THEN
    INSERT INTO public.alertas (tipo, nivel_prioridad, descripcion, id_medicamento, id_sede)
    VALUES (
      'stock_minimo',
      'media',
      'Stock por debajo del mínimo: ' || NEW.cantidad_actual || ' unidades',
      NEW.id_medicamento,
      NEW.id_sede
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- Alerta de próximo vencimiento
  IF NEW.fecha_vencimiento <= CURRENT_DATE + (dias_vencimiento || ' days')::INTERVAL THEN
    INSERT INTO public.alertas (tipo, nivel_prioridad, descripcion, id_medicamento, id_sede)
    VALUES (
      'vencimiento',
      CASE 
        WHEN NEW.fecha_vencimiento <= CURRENT_DATE + INTERVAL '7 days' THEN 'alta'
        WHEN NEW.fecha_vencimiento <= CURRENT_DATE + INTERVAL '30 days' THEN 'media'
        ELSE 'baja'
      END,
      'Lote ' || NEW.lote || ' vence el ' || TO_CHAR(NEW.fecha_vencimiento, 'DD/MM/YYYY'),
      NEW.id_medicamento,
      NEW.id_sede
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminar triggers existentes si existen
DROP TRIGGER IF EXISTS trigger_alertas_inventario_insert ON public.inventario;
DROP TRIGGER IF EXISTS trigger_alertas_inventario_update ON public.inventario;

-- Crear triggers para generar alertas automáticamente
CREATE TRIGGER trigger_alertas_inventario_insert
AFTER INSERT ON public.inventario
FOR EACH ROW
EXECUTE FUNCTION public.generar_alertas_inventario();

CREATE TRIGGER trigger_alertas_inventario_update
AFTER UPDATE OF cantidad_actual, fecha_vencimiento ON public.inventario
FOR EACH ROW
EXECUTE FUNCTION public.generar_alertas_inventario();