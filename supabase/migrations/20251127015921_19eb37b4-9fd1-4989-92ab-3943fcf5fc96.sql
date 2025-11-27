-- Corregir la función para incluir search_path
CREATE OR REPLACE FUNCTION public.generar_alertas_inventario()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;