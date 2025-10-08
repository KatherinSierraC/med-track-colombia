-- Sistema de Gestión de Medicamentos para EPS/IPS Colombia
-- Crear las tablas principales con datos pre-poblados

-- 1. Tabla de categorías de patologías (priorización)
CREATE TABLE IF NOT EXISTS public.categorias_patologias (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  nivel_prioridad TEXT NOT NULL CHECK (nivel_prioridad IN ('CRITICA','ALTA','MEDIA','BAJA')),
  descripcion TEXT,
  color_identificacion VARCHAR(7) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de medicamentos
CREATE TABLE IF NOT EXISTS public.medicamentos (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  principio_activo VARCHAR(200),
  presentacion VARCHAR(100),
  concentracion VARCHAR(50),
  unidad_medida VARCHAR(20),
  requiere_refrigeracion BOOLEAN DEFAULT FALSE,
  id_categoria_patologia BIGINT REFERENCES public.categorias_patologias(id),
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de sedes
CREATE TABLE IF NOT EXISTS public.sedes (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('EPS','IPS')),
  direccion VARCHAR(300),
  ciudad VARCHAR(100),
  departamento VARCHAR(100),
  telefono VARCHAR(20),
  email VARCHAR(100),
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabla de usuarios (perfiles)
CREATE TABLE IF NOT EXISTS public.usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre_completo VARCHAR(200) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  id_sede_principal BIGINT REFERENCES public.sedes(id),
  telefono VARCHAR(20),
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabla de inventario
CREATE TABLE IF NOT EXISTS public.inventario (
  id BIGSERIAL PRIMARY KEY,
  id_medicamento BIGINT NOT NULL REFERENCES public.medicamentos(id),
  id_sede BIGINT NOT NULL REFERENCES public.sedes(id),
  lote VARCHAR(50) NOT NULL,
  cantidad_actual INTEGER NOT NULL DEFAULT 0,
  fecha_vencimiento DATE NOT NULL,
  fecha_ingreso DATE NOT NULL DEFAULT CURRENT_DATE,
  proveedor VARCHAR(200),
  precio_unitario DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(id_medicamento, id_sede, lote)
);

-- 6. Tabla de movimientos
CREATE TABLE IF NOT EXISTS public.movimientos (
  id BIGSERIAL PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada','salida')),
  id_medicamento BIGINT NOT NULL REFERENCES public.medicamentos(id),
  id_sede BIGINT NOT NULL REFERENCES public.sedes(id),
  cantidad INTEGER NOT NULL,
  lote VARCHAR(50),
  fecha_movimiento TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  id_usuario UUID NOT NULL REFERENCES public.usuarios(id),
  observaciones TEXT,
  documento_paciente VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tabla de redistribuciones
CREATE TABLE IF NOT EXISTS public.redistribuciones (
  id BIGSERIAL PRIMARY KEY,
  id_medicamento BIGINT NOT NULL REFERENCES public.medicamentos(id),
  id_sede_origen BIGINT NOT NULL REFERENCES public.sedes(id),
  id_sede_destino BIGINT NOT NULL REFERENCES public.sedes(id),
  cantidad_solicitada INTEGER NOT NULL,
  lote VARCHAR(50),
  prioridad_automatica TEXT NOT NULL CHECK (prioridad_automatica IN ('CRITICA','ALTA','MEDIA','BAJA')),
  prioridad_ajustada TEXT CHECK (prioridad_ajustada IN ('CRITICA','ALTA','MEDIA','BAJA')),
  justificacion_prioridad TEXT,
  estado TEXT NOT NULL CHECK (estado IN ('solicitada','completada')) DEFAULT 'solicitada',
  fecha_solicitud TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_completado TIMESTAMPTZ,
  id_solicitante UUID NOT NULL REFERENCES public.usuarios(id),
  motivo TEXT,
  cantidad_pacientes_afectados INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Tabla de alertas
CREATE TABLE IF NOT EXISTS public.alertas (
  id BIGSERIAL PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('vencimiento','desabastecimiento','stock_minimo','critico')),
  id_medicamento BIGINT NOT NULL REFERENCES public.medicamentos(id),
  id_sede BIGINT NOT NULL REFERENCES public.sedes(id),
  nivel_prioridad TEXT NOT NULL CHECK (nivel_prioridad IN ('CRITICA','ALTA','MEDIA','BAJA')),
  descripcion TEXT NOT NULL,
  fecha_generada TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  estado TEXT NOT NULL CHECK (estado IN ('activa','resuelta')) DEFAULT 'activa',
  fecha_resolucion TIMESTAMPTZ,
  id_usuario_resolucion UUID REFERENCES public.usuarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.categorias_patologias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sedes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redistribuciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertas ENABLE ROW LEVEL SECURITY;

-- RLS Policies (permitir lectura a usuarios autenticados)
CREATE POLICY "Allow authenticated read categorias" ON public.categorias_patologias FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read medicamentos" ON public.medicamentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read sedes" ON public.sedes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read usuarios" ON public.usuarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated all inventario" ON public.inventario FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated all movimientos" ON public.movimientos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated all redistribuciones" ON public.redistribuciones FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated all alertas" ON public.alertas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Insertar categorías de patologías
INSERT INTO public.categorias_patologias (nombre, nivel_prioridad, descripcion, color_identificacion) VALUES
('Cáncer terminal', 'CRITICA', 'Pacientes con cáncer en fase terminal', '#dc2626'),
('Cuidados paliativos', 'CRITICA', 'Pacientes en cuidados paliativos', '#dc2626'),
('Trasplante de órganos', 'CRITICA', 'Pacientes con trasplante de órganos', '#dc2626'),
('Cáncer (tratamiento activo)', 'ALTA', 'Pacientes en tratamiento activo de cáncer', '#ea580c'),
('VIH/SIDA', 'ALTA', 'Pacientes con VIH/SIDA', '#ea580c'),
('Hemofilia', 'ALTA', 'Pacientes con hemofilia', '#ea580c'),
('Artritis reumatoide severa', 'ALTA', 'Pacientes con artritis reumatoide severa', '#ea580c'),
('Insuficiencia renal crónica', 'ALTA', 'Pacientes con insuficiencia renal crónica', '#ea580c'),
('Diabetes', 'MEDIA', 'Pacientes con diabetes', '#f59e0b'),
('Hipertensión arterial', 'MEDIA', 'Pacientes con hipertensión arterial', '#f59e0b'),
('Asma', 'MEDIA', 'Pacientes con asma', '#f59e0b'),
('EPOC', 'MEDIA', 'Pacientes con EPOC', '#f59e0b'),
('Epilepsia', 'MEDIA', 'Pacientes con epilepsia', '#f59e0b'),
('Hipotiroidismo', 'MEDIA', 'Pacientes con hipotiroidismo', '#f59e0b'),
('Dislipidemia', 'MEDIA', 'Pacientes con dislipidemia', '#f59e0b'),
('Insuficiencia cardíaca', 'MEDIA', 'Pacientes con insuficiencia cardíaca', '#f59e0b'),
('Infección bacteriana', 'BAJA', 'Tratamiento de infecciones bacterianas', '#10b981'),
('Analgesia', 'BAJA', 'Medicamentos para manejo del dolor', '#10b981'),
('Alergia', 'BAJA', 'Tratamiento de alergias', '#10b981'),
('Gastritis', 'BAJA', 'Tratamiento de gastritis', '#10b981'),
('Antiinflamatorio', 'BAJA', 'Medicamentos antiinflamatorios', '#10b981'),
('Ansiedad', 'BAJA', 'Tratamiento de ansiedad', '#10b981');

-- Insertar sedes
INSERT INTO public.sedes (nombre, tipo, direccion, ciudad, departamento, telefono, email, activo) VALUES
('IPS Salud Norte', 'IPS', 'Calle 100 #15-20', 'Bogotá', 'Cundinamarca', '3001234567', 'contacto@saludnorte.com', true),
('IPS Centro Médico', 'IPS', 'Carrera 50 #30-15', 'Medellín', 'Antioquia', '3009876543', 'info@centromedico.com', true),
('IPS Clínica del Sur', 'IPS', 'Avenida 5N #20-50', 'Cali', 'Valle del Cauca', '3005551234', 'atencion@clinicasur.com', true),
('EPS Salud Total', 'EPS', 'Carrera 7 #80-45', 'Bogotá', 'Cundinamarca', '3007778888', 'servicios@saludtotal.com', true),
('EPS Vida Plena', 'EPS', 'Calle 72 #50-30', 'Barranquilla', 'Atlántico', '3004445555', 'contacto@vidaplena.com', true);

-- Insertar medicamentos (30 medicamentos)
INSERT INTO public.medicamentos (nombre, principio_activo, presentacion, concentracion, unidad_medida, requiere_refrigeracion, id_categoria_patologia) VALUES
-- CRÍTICA
('Morfina', 'morfina', 'ampolla', '10mg', 'mg', false, 2),
('Fentanilo', 'fentanilo', 'parche', '100mcg', 'mcg', false, 1),
('Ciclosporina', 'ciclosporina', 'cápsula', '100mg', 'mg', false, 3),
-- ALTA
('Imatinib', 'imatinib', 'tableta', '400mg', 'mg', false, 4),
('Rituximab', 'rituximab', 'ampolla', '500mg', 'mg', true, 4),
('Tenofovir/Emtricitabina', 'tenofovir/emtricitabina', 'tableta', '300/200mg', 'mg', false, 5),
('Factor VIII', 'factor VIII coagulación', 'frasco', '500UI', 'UI', true, 6),
('Metotrexate', 'metotrexate', 'tableta', '2.5mg', 'mg', false, 7),
-- MEDIA
('Metformina', 'metformina', 'tableta', '850mg', 'mg', false, 9),
('Glibenclamida', 'glibenclamida', 'tableta', '5mg', 'mg', false, 9),
('Insulina NPH', 'insulina NPH', 'frasco', '100UI/ml', 'UI', true, 9),
('Losartán', 'losartán', 'tableta', '50mg', 'mg', false, 10),
('Enalapril', 'enalapril', 'tableta', '10mg', 'mg', false, 10),
('Amlodipino', 'amlodipino', 'tableta', '5mg', 'mg', false, 10),
('Atorvastatina', 'atorvastatina', 'tableta', '20mg', 'mg', false, 15),
('Levotiroxina', 'levotiroxina', 'tableta', '100mcg', 'mcg', false, 14),
('Salbutamol', 'salbutamol', 'inhalador', '100mcg', 'mcg', false, 11),
('Levetiracetam', 'levetiracetam', 'tableta', '500mg', 'mg', false, 13),
('Carvedilol', 'carvedilol', 'tableta', '6.25mg', 'mg', false, 16),
('Espironolactona', 'espironolactona', 'tableta', '25mg', 'mg', false, 16),
('Furosemida', 'furosemida', 'tableta', '40mg', 'mg', false, 10),
-- BAJA
('Acetaminofén', 'acetaminofén', 'tableta', '500mg', 'mg', false, 18),
('Ibuprofeno', 'ibuprofeno', 'tableta', '400mg', 'mg', false, 21),
('Amoxicilina', 'amoxicilina', 'cápsula', '500mg', 'mg', false, 17),
('Loratadina', 'loratadina', 'tableta', '10mg', 'mg', false, 19),
('Omeprazol', 'omeprazol', 'cápsula', '20mg', 'mg', false, 20),
('Diclofenaco', 'diclofenaco', 'tableta', '50mg', 'mg', false, 21),
('Dipirona', 'dipirona', 'tableta', '500mg', 'mg', false, 18),
('Clonazepam', 'clonazepam', 'tableta', '2mg', 'mg', false, 22),
('Ranitidina', 'ranitidina', 'tableta', '150mg', 'mg', false, 20);