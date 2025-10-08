import { useState, useEffect } from "react";
import { Outlet, useNavigate, NavLink } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Package,
  Plus,
  Minus,
  RefreshCw,
  Bell,
  FileText,
  LogOut,
  Menu,
  X,
  PillBottle,
} from "lucide-react";
import { toast } from "sonner";

const MainLayout = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    // Obtener sesión actual
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/login");
      } else {
        setUser(session.user);
        loadUserData(session.user.id);
      }
    });

    // Escuchar cambios en la autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/login");
      } else {
        setUser(session.user);
        loadUserData(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadUserData = async (userId: string) => {
    const { data } = await supabase
      .from("usuarios")
      .select(`
        *,
        sedes(nombre)
      `)
      .eq("id", userId)
      .single();

    if (data) {
      setUserData(data);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Sesión cerrada");
    navigate("/login");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const menuItems = [
    { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/inventario", icon: Package, label: "Inventario" },
    { path: "/entradas", icon: Plus, label: "Entradas" },
    { path: "/salidas", icon: Minus, label: "Salidas" },
    { path: "/redistribuciones", icon: RefreshCw, label: "Redistribuciones" },
    { path: "/alertas", icon: Bell, label: "Alertas" },
    { path: "/reportes", icon: FileText, label: "Reportes" },
  ];

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar */}
      <aside
        className={`${
          isSidebarOpen ? "w-64" : "w-0"
        } transition-all duration-300 bg-card border-r border-border flex flex-col fixed h-full z-20 lg:relative`}
      >
        <div className={`${isSidebarOpen ? "block" : "hidden"} flex flex-col h-full`}>
          {/* Logo */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-3 text-primary">
              <PillBottle className="h-8 w-8" />
              <div>
                <h1 className="text-xl font-bold">MedTrack</h1>
                <p className="text-xs text-muted-foreground">Sistema Farmacéutico</p>
              </div>
            </div>
          </div>

          {/* Usuario */}
          {userData && (
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  {getInitials(userData.nombre_completo)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{userData.nombre_completo}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {userData.sedes?.nombre}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navegación */}
          <nav className="flex-1 p-4 space-y-1">
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`
                }
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Cerrar sesión */}
          <div className="p-4 border-t border-border">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5 mr-3" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col w-full">
        {/* Topbar */}
        <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between sticky top-0 z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Contenido */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
