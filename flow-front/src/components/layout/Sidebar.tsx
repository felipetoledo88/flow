
import {
  FolderKanban,
  LogOut,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { useState } from 'react';

interface SidebarProps {
  isOpen: boolean;
  currentPath: string;
}

const Sidebar = ({ isOpen, currentPath }: SidebarProps) => {
  const { user, logout, isLoading } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const adminMenuItems = [
    { icon: FolderKanban, label: "Projetos", path: "/projects" },
    { icon: Users, label: "Equipes", path: "/teams" },
    { icon: Users, label: "Usuários", path: "/users" },
  ];

  const directorMenuItems = [
    { icon: FolderKanban, label: "Projetos", path: "/projects" },
    { icon: Users, label: "Equipes", path: "/teams" },
    { icon: Users, label: "Usuários", path: "/users" },
  ];

  const clientMenuItems = [
  ];

  const userMenuItems = [
    { icon: FolderKanban, label: "Projetos", path: "/projects" },
  ];

  const getMenuItems = () => {
    if (user?.role === 'admin') return adminMenuItems;
    if (user?.role === 'client') return clientMenuItems;
    if (user?.role === 'manager') return directorMenuItems;
    if (user?.role === 'techlead') return directorMenuItems;
    if (user?.role === 'user' || user?.role === 'qa') return userMenuItems;
    return directorMenuItems;
  };

  const menuItems = getMenuItems();

  const handleLogout = async () => {
    if (isLoggingOut) return;
    
    try {
      setIsLoggingOut(true);
      await logout();
      toast.success('Logout realizado com sucesso');

      setTimeout(() => {
        window.location.href = '/login';
      }, 500)
    } catch (error) {
      toast.error('Erro ao fazer logout, redirecionando...');

      setTimeout(() => {
        window.location.href = '/login';
      }, 1000);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <aside className={cn(
      "bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out overflow-hidden",
      "fixed xl:static top-16 left-0 h-[calc(100vh-4rem)] z-30",
      isOpen ? "w-64 translate-x-0" : "w-0 xl:w-64 -translate-x-full xl:translate-x-0"
    )}>
      <div className="flex flex-col h-full">
        <nav className="p-4 space-y-2 flex-1">
          <div className="mb-6">
            <h3 className="text-sidebar-foreground font-medium text-sm uppercase tracking-wide mb-2">
              {user?.role === 'admin' ? 'Administrador' : user?.role === 'manager' ? 'Diretor' : user?.role === 'techlead' ? 'Tech Lead' : user?.role === 'client' ? 'Cliente' : user?.role === 'user' ? 'Desenvolvedor' : user?.role === 'qa' ? 'QA' : 'Usuário'}
            </h3>
          </div>
          
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.path;
            
            return (
              <a
                key={item.path}
                href={item.path}
                className={cn("nav-item", isActive && "active")}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>

        {/* Logout Section */}
        <div className="p-4 border-t border-sidebar-border">
          <Button
            onClick={handleLogout}
            disabled={isLoading || isLoggingOut}
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground hover:bg-red-500/10 hover:text-red-600 transition-colors group disabled:opacity-50"
          >
            <LogOut className={cn(
              "h-4 w-4 mr-2 transition-transform",
              (isLoading || isLoggingOut) ? "animate-spin" : "group-hover:rotate-6"
            )} />
            <span>{(isLoading || isLoggingOut) ? 'Saindo...' : 'Sair'}</span>
          </Button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
