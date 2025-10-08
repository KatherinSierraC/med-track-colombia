import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, PillBottle } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    nombreCompleto: "",
    telefono: "",
    sedeId: "1",
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      if (data.session) {
        toast.success("¡Bienvenido!");
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast.error(error.message || "Error al iniciar sesión");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            nombre_completo: formData.nombreCompleto,
            telefono: formData.telefono,
            id_sede_principal: parseInt(formData.sedeId),
          },
        },
      });

      if (error) throw error;

      // Insertar en tabla usuarios
      if (data.user) {
        const { error: profileError } = await supabase.from("usuarios").insert({
          id: data.user.id,
          nombre_completo: formData.nombreCompleto,
          email: formData.email,
          telefono: formData.telefono,
          id_sede_principal: parseInt(formData.sedeId),
        });

        if (profileError) throw profileError;

        toast.success("Cuenta creada exitosamente");
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast.error(error.message || "Error al crear cuenta");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Lado izquierdo - Ilustración */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 text-white">
            <PillBottle className="h-10 w-10" />
            <h1 className="text-3xl font-bold">MedTrack</h1>
          </div>
          <p className="text-primary-foreground/80 mt-2">
            Sistema de Gestión de Medicamentos
          </p>
        </div>
        <div className="text-white space-y-6">
          <h2 className="text-4xl font-bold leading-tight">
            Control total de inventario farmacéutico
          </h2>
          <p className="text-xl text-primary-foreground/90">
            Optimiza la distribución de medicamentos entre sedes con
            priorización automática por patología
          </p>
          <div className="flex gap-4 pt-4">
            <div className="flex-1 p-4 bg-white/10 rounded-lg backdrop-blur">
              <div className="text-2xl font-bold">30+</div>
              <div className="text-sm text-primary-foreground/80">
                Medicamentos
              </div>
            </div>
            <div className="flex-1 p-4 bg-white/10 rounded-lg backdrop-blur">
              <div className="text-2xl font-bold">5</div>
              <div className="text-sm text-primary-foreground/80">Sedes</div>
            </div>
            <div className="flex-1 p-4 bg-white/10 rounded-lg backdrop-blur">
              <div className="text-2xl font-bold">24/7</div>
              <div className="text-sm text-primary-foreground/80">
                Monitoreo
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lado derecho - Formulario */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden text-center mb-8">
            <div className="flex items-center justify-center gap-3 text-primary mb-2">
              <PillBottle className="h-8 w-8" />
              <h1 className="text-2xl font-bold">MedTrack</h1>
            </div>
            <p className="text-muted-foreground">
              Sistema de Gestión de Medicamentos
            </p>
          </div>

          <div>
            <h2 className="text-3xl font-bold text-foreground">
              {isSignUp ? "Crear Cuenta" : "Iniciar Sesión"}
            </h2>
            <p className="text-muted-foreground mt-2">
              {isSignUp
                ? "Registra tu cuenta para acceder al sistema"
                : "Ingresa tus credenciales para continuar"}
            </p>
          </div>

          <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="space-y-6">
            {isSignUp && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="nombreCompleto">Nombre Completo</Label>
                  <Input
                    id="nombreCompleto"
                    type="text"
                    required
                    value={formData.nombreCompleto}
                    onChange={(e) =>
                      setFormData({ ...formData, nombreCompleto: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input
                    id="telefono"
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) =>
                      setFormData({ ...formData, telefono: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sede">Sede Principal</Label>
                  <select
                    id="sede"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.sedeId}
                    onChange={(e) =>
                      setFormData({ ...formData, sedeId: e.target.value })
                    }
                  >
                    <option value="1">IPS Salud Norte</option>
                    <option value="2">IPS Centro Médico</option>
                    <option value="3">IPS Clínica del Sur</option>
                    <option value="4">EPS Salud Total</option>
                    <option value="5">EPS Vida Plena</option>
                  </select>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                required
                placeholder="tu@email.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                required
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSignUp ? "Crear Cuenta" : "Iniciar Sesión"}
            </Button>
          </form>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-primary hover:underline"
            >
              {isSignUp
                ? "¿Ya tienes cuenta? Inicia sesión"
                : "¿No tienes cuenta? Regístrate"}
            </button>
          </div>

          {/* Usuarios de prueba */}
          {!isSignUp && (
            <Card className="p-4 bg-muted/50">
              <h3 className="font-semibold text-sm mb-3">Usuarios de prueba:</h3>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div>
                  <strong>Email:</strong> maria@medtrack.com |{" "}
                  <strong>Password:</strong> Maria123!
                </div>
                <div>
                  <strong>Email:</strong> carlos@medtrack.com |{" "}
                  <strong>Password:</strong> Carlos123!
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
