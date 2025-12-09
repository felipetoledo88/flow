import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { NewLoader } from '@/components/ui/new-loader';
import UserFormModal from '@/components/users/UserFormModal';
import { userManagementService } from '@/services/api/user-management.service';
import { User, UserFilters, USER_ROLES, USER_STATUSES } from '@/types/user-management';
import { 
  Users, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  MoreVertical,
  UserCheck,
  UserX,
  RefreshCw,
  Shield,
  Settings,
  Link
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { useSelectedProject } from '@/hooks/use-selected-project';

const UsersPage = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]); // Todos os usuários carregados
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<UserFilters>({
    page: 1,
    limit: 10,
  });
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const location = useLocation();
  const { user: currentUser } = useAuth();
  const currentPath = location.pathname;
  
  // Hook para projeto selecionado
  const { selectedProject, showAllProjects } = useSelectedProject();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };


  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await userManagementService.getUsers(filters);
      
      // A API já retorna os dados paginados
      setUsers(response.data);
      setTotal(response.total);
      setTotalPages(response.totalPages);
      
      // Armazenar para o filtro de projeto (apenas se necessário)
      setAllUsers(response.data);
    } catch (error) {
      toast.error(`Erro ao carregar usuários: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [filters]);

  // Reagir quando o projeto selecionado mudar - recarregar dados
  useEffect(() => {
    // Quando o projeto muda, recarregar os dados da primeira página
    if (selectedProject?.id !== undefined || showAllProjects !== undefined) {
      setFilters(prev => ({ ...prev, page: 1 }));
    }
  }, [selectedProject?.id, showAllProjects]);

  const handleSearch = (value: string) => {
    setFilters(prev => ({ ...prev, search: value, page: 1 }));
  };

  const handleRoleFilter = (value: string) => {
    setFilters(prev => ({ 
      ...prev, 
      role: value === 'all' ? undefined : value, 
      page: 1 
    }));
  };

  const handleStatusFilter = (value: string) => {
    setFilters(prev => ({ 
      ...prev, 
      status: value === 'all' ? undefined : value, 
      page: 1 
    }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const handleCreateUser = () => {
    setSelectedUser(null);
    setIsFormModalOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsFormModalOpen(true);
  };

  const handleDeleteUser = (user: User) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      await userManagementService.deleteUser(userToDelete.id);
      toast.success('Usuário excluído com sucesso');
      loadUsers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      const errorMessage = error.message || 'Erro ao excluir usuário';
      toast.error(errorMessage);
    } finally {
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const handleChangeStatus = async (user: User, newStatus: User['status']) => {
    try {
      await userManagementService.changeUserStatus(user.id, newStatus);
      toast.success('Status do usuário alterado com sucesso');
      loadUsers();
    } catch (error) {
      toast.error('Erro ao alterar status do usuário');
    }
  };

  const getRoleBadge = (role: User['role']) => {
    const variants = {
      admin: { color: 'bg-purple-100 text-purple-800', icon: Shield },
      manager: { color: 'bg-blue-100 text-blue-800', icon: Settings },
      techlead: { color: 'bg-indigo-100 text-indigo-800', icon: Settings },
      user: { color: 'bg-green-100 text-green-800', icon: Users },
      client: { color: 'bg-orange-100 text-orange-800', icon: Users },
      qa: { color: 'bg-amber-100 text-amber-800', icon: Users },
    };

    const config = variants[role];
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {USER_ROLES[role]}
      </Badge>
    );
  };

  const getStatusBadge = (status: User['status']) => {
    const variants = {
      active: { color: 'bg-green-100 text-green-800', label: 'Ativo' },
      inactive: { color: 'bg-gray-100 text-gray-800', label: 'Inativo' },
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pendente' },
      suspended: { color: 'bg-red-100 text-red-800', label: 'Suspenso' },
    };

    const config = variants[status];
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const onUserSaved = () => {
    setIsFormModalOpen(false);
    setSelectedUser(null);
    loadUsers();
  };

  const canEditUser = (user: User) => {
    if (currentUser?.role === 'admin') return true;
    if (currentUser?.role === 'manager' || currentUser?.role === 'techlead') {
      // Diretor/Techlead pode editar apenas clientes, desenvolvedores e QA
      return user.role === 'client' || user.role === 'user' || user.role === 'qa';
    }
    return false;
  };

  const canDeleteUser = (user: User) => {
    if (currentUser?.role === 'admin') {
      // Admin pode deletar qualquer usuário, exceto a si mesmo
      return user.id !== currentUser.id;
    }
    if (currentUser?.role === 'manager' || currentUser?.role === 'techlead') {
      // Diretor/Techlead pode deletar apenas clientes, desenvolvedores e QA, não outros diretores ou admins
      return user.role === 'client' || user.role === 'user' || user.role === 'qa';
    }
    return false;
  };

  if (loading && users.length === 0) {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        <Header onToggleSidebar={toggleSidebar} />
        
        <div className="flex flex-1 overflow-hidden">
          <Sidebar 
            isOpen={sidebarOpen} 
            currentPath={currentPath}
          />
          
          <main className="flex-1 flex items-center justify-center">
            <NewLoader
              message="Carregando usuários..."
              submessage="Preparando lista de usuários"
              size="lg"
              color="blue"
              variant="flow"
            />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header onToggleSidebar={toggleSidebar} />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          isOpen={sidebarOpen} 
          currentPath={currentPath}
        />
        
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  <Users className="h-8 w-8 text-primary" />
                  Usuários
                </h1>
                <p className="text-muted-foreground mt-1">
                  Gerencie administradores, diretores, desenvolvedores e clientes do sistema
                </p>
              </div>
              
              <Button onClick={handleCreateUser} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Novo Usuário
              </Button>
            </div>

            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Filtros</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por nome ou email..."
                        value={filters.search || ''}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <div className="md:w-48">
                    <Select
                      value={filters.role || 'all'}
                      onValueChange={handleRoleFilter}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="manager">Diretor</SelectItem>
                        <SelectItem value="user">Desenvolvedor</SelectItem>
                        <SelectItem value="client">Cliente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="md:w-48">
                    <Select
                      value={filters.status || 'all'}
                      onValueChange={handleStatusFilter}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="inactive">Inativo</SelectItem>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="suspended">Suspenso</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    variant="outline"
                    onClick={loadUsers}
                    disabled={loading}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Atualizar
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    Usuários ({total})
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {users.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Último Login</TableHead>
                        <TableHead>Projetos</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {user.name}
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{getRoleBadge(user.role)}</TableCell>
                          <TableCell>{user.phone || '-'}</TableCell>
                          <TableCell>{getStatusBadge(user.status)}</TableCell>
                          <TableCell>
                            {user.lastLoginAt 
                              ? new Date(user.lastLoginAt).toLocaleDateString('pt-BR')
                              : 'Nunca'
                            }
                          </TableCell>
                          <TableCell>
                            {user.role === 'manager' || user.role === 'techlead' || user.role === 'user' || user.role === 'client' || user.role === 'qa' ? (
                              <div className="flex flex-col gap-1 max-w-xs">
                                <div className="flex items-center gap-1">
                                  <Link className="h-3 w-3 text-blue-500" />
                                  <span className="text-xs font-medium">
                                    {user.projects?.length || 0} projeto(s)
                                  </span>
                                </div>
                                {user.projects && user.projects.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {user.projects.slice(0, 3).map(p => (
                                      <span 
                                        key={p.id} 
                                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                                          p.relation === 'director' ? 'bg-purple-100 text-purple-800' :
                                          p.relation === 'team_member' ? 'bg-green-100 text-green-800' :
                                          'bg-blue-100 text-blue-800'
                                        }`}
                                        title={`${p.relation === 'director' ? 'Diretor' : p.relation === 'team_member' ? 'Membro da Equipe' : 'Cliente'}: ${p.description || p.name}`}
                                      >
                                        {p.name}
                                      </span>
                                    ))}
                                    {user.projects.length > 3 && (
                                      <span className="text-xs text-muted-foreground self-center">
                                        +{user.projects.length - 3}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground italic">
                                    Nenhum projeto vinculado
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {canEditUser(user) && (
                                  <DropdownMenuItem 
                                    onClick={() => handleEditUser(user)}
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                )}
                                {canEditUser(user) && (
                                  <DropdownMenuSeparator />
                                )}
                                {canEditUser(user) && user.status === 'active' ? (
                                  <DropdownMenuItem
                                    onClick={() => handleChangeStatus(user, 'inactive')}
                                  >
                                    <UserX className="h-4 w-4 mr-2" />
                                    Desativar
                                  </DropdownMenuItem>
                                ) : canEditUser(user) && (
                                  <DropdownMenuItem
                                    onClick={() => handleChangeStatus(user, 'active')}
                                  >
                                    <UserCheck className="h-4 w-4 mr-2" />
                                    Ativar
                                  </DropdownMenuItem>
                                )}
                                {canDeleteUser(user) && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => handleDeleteUser(user)}
                                      className="text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Excluir
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">Nenhum usuário encontrado</h3>
                    <p className="text-muted-foreground">
                      {filters.search || filters.role || filters.status 
                        ? 'Nenhum usuário encontrado com os filtros aplicados.'
                        : 'Comece criando seu primeiro usuário usando o botão "Novo Usuário" acima.'
                      }
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center space-x-2">
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(filters.page! - 1)}
                  disabled={filters.page === 1}
                >
                  Anterior
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      const current = filters.page || 1;
                      return page === 1 || page === totalPages || 
                             (page >= current - 1 && page <= current + 1);
                    })
                    .map((page, index, array) => (
                      <React.Fragment key={page}>
                        {index > 0 && array[index - 1] !== page - 1 && (
                          <span className="px-2 text-muted-foreground">...</span>
                        )}
                        <Button
                          variant={filters.page === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(page)}
                        >
                          {page}
                        </Button>
                      </React.Fragment>
                    ))
                  }
                </div>

                <Button
                  variant="outline"
                  onClick={() => handlePageChange(filters.page! + 1)}
                  disabled={filters.page === totalPages}
                >
                  Próxima
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Form Modal */}
      <UserFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        user={selectedUser}
        onSave={onUserSaved}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o usuário "{userToDelete?.name}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteUser}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UsersPage;