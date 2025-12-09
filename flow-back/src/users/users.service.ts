import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere, In } from 'typeorm';
import { User, UserRole, UserStatus } from './entities/user.entity';
import { Project } from '../projects/entities/project.entity';
import { Team } from '../teams/entities/team.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import {
  UserResponse,
  PaginatedUsersResponse,
} from './interfaces/user-response.interface';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(Team)
    private teamRepository: Repository<Team>,
  ) {}

  async findAll(
    queryDto: QueryUserDto,
    currentUser?: any,
  ): Promise<PaginatedUsersResponse> {
    const {
      page = 1,
      limit = 10,
      search,
      role,
      status,
      orderBy = 'createdAt',
      order = 'DESC',
    } = queryDto;

    const skip = (page - 1) * limit;
    const where: FindOptionsWhere<User> = {};

    if (search) {
      where.name = Like(`%${search}%`);
    }

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    }

    const [users, total] = await this.usersRepository.findAndCount({
      where,
      skip,
      take: limit,
      order: { [orderBy]: order },
      select: [
        'id',
        'name',
        'email',
        'role',
        'status',
        'phone',
        'avatar',
        'lastLoginAt',
        'emailVerifiedAt',
        'createdAt',
        'updatedAt',
        'supervisorId',
      ],
      relations: ['clientProjects', 'supervisor'],
    });

    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    const userResponses = await Promise.all(
      users.map((user) => this.mapToUserResponse(user)),
    );

    return {
      users: userResponses,
      total,
      page,
      limit,
      totalPages,
      hasNext,
      hasPrev,
    };
  }

  async findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByIds(ids: number[]): Promise<User[]> {
    if (ids.length === 0) return [];
    return this.usersRepository.findByIds(ids);
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.usersRepository.findOne({
      where: { email },
      withDeleted: true,
    });

    if (!user || user.deletedAt) return null;
    return user;
  }

  async findByIdWithPassword(id: number): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { id },
      select: [
        'id',
        'name',
        'email',
        'password',
        'role',
        'status',
        'phone',
        'avatar',
        'lastLoginAt',
        'emailVerifiedAt',
        'createdAt',
        'updatedAt',
      ],
    });
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      select: [
        'id',
        'name',
        'email',
        'password',
        'role',
        'status',
        'phone',
        'avatar',
        'lastLoginAt',
        'emailVerifiedAt',
        'createdAt',
        'updatedAt',
      ],
    });
  }

  async create(createUserDto: CreateUserDto, currentUser?: any): Promise<User> {
    const existingUser = await this.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException('Usuário já existe com este email');
    }

    const { projectIds, ...userData } = createUserDto;
    const userDataWithSupervisor = {
      ...userData,
      supervisorId: currentUser?.id || null,
      status: UserStatus.ACTIVE,
    };

    const user = this.usersRepository.create(userDataWithSupervisor);
    const savedUser = await this.usersRepository.save(user);
    if (
      savedUser.role === UserRole.CLIENT &&
      projectIds &&
      projectIds.length > 0
    ) {
      await this.linkUserToProjects(savedUser.id, projectIds, currentUser);
    }
    return savedUser;
  }

  async update(
    id: number,
    updateUserDto: UpdateUserDto,
    currentUser?: any,
  ): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.findByEmail(updateUserDto.email);
      if (existingUser) {
        throw new ConflictException('Email já está em uso');
      }
    }
    const { projectIds, ...userData } = updateUserDto;
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 12);
    }

    await this.usersRepository.update(id, userData);
    if (projectIds !== undefined) {
      await this.linkUserToProjects(id, projectIds, currentUser);
    }

    const updatedUser = await this.findById(id);
    if (!updatedUser) {
      throw new NotFoundException('Erro ao atualizar usuário');
    }
    return updatedUser;
  }

  async delete(id: number): Promise<void> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['clientProjects'],
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    if (user.role === UserRole.MANAGER || user.role === UserRole.TECHLEAD) {
      const directorProjects = await this.projectRepository.find({
        where: { team: { director: { id } } },
        select: ['id', 'name'],
        relations: ['team', 'team.director'],
      });

      if (directorProjects.length > 0) {
        const projectNames = directorProjects.map((p) => p.name).join(', ');
        throw new BadRequestException(
          `Não é possível excluir este diretor pois ele é responsável por ${directorProjects.length} projeto(s): ${projectNames}. ` +
            'Transfira ou remova estes projetos primeiro.',
        );
      }
    }

    if (
      user.role === UserRole.CLIENT &&
      user.clientProjects &&
      user.clientProjects.length > 0
    ) {
      await this.usersRepository
        .createQueryBuilder()
        .relation(User, 'clientProjects')
        .of(id)
        .remove(user.clientProjects.map((p) => p.id));
    }

    try {
      const deleteResult = await this.usersRepository.softDelete(id);
      const timestamp = Date.now();
      const emailWithDlt = `${user.email}.dlt.${timestamp}`;
      await this.usersRepository.update(id, { 
        status: UserStatus.INACTIVE,
        email: emailWithDlt
      });
      if (deleteResult.affected === 0) {
        throw new BadRequestException('Usuário não pôde ser excluído');
      }
    } catch (error: any) {
      if (
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        error.code === '23503' &&
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        error.constraint === 'FK_c2bf4967c8c2a6b845dadfbf3d4'
      ) {
        throw new BadRequestException(
          'Não é possível excluir este usuário pois ele está vinculado a uma ou mais equipes. ' +
            'Remova o usuário de todas as equipes antes de excluí-lo.',
        );
      }
      if (
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        error.code === '23503' &&
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        error.constraint &&
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        error.constraint.includes('team')
      ) {
        throw new BadRequestException(
          'Não é possível excluir este usuário pois ele possui relacionamentos com equipes. ' +
            'Remova todas as vinculações com equipes antes de excluí-lo.',
        );
      }
      throw error;
    }
  }

  async updateLastLogin(id: number): Promise<void> {
    await this.usersRepository.update(id, { lastLoginAt: new Date() });
  }

  async updatePassword(id: number, newPassword: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await this.usersRepository.update(id, { password: hashedPassword });
  }

  async verifyEmail(id: number): Promise<void> {
    await this.usersRepository.update(id, {
      emailVerifiedAt: new Date(),
      emailVerificationToken: undefined,
    });
  }

  async setPasswordResetToken(
    id: string,
    token: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.usersRepository.update(id, {
      passwordResetToken: token,
      passwordResetTokenExpiresAt: expiresAt,
    });
  }

  async clearPasswordResetToken(id: number): Promise<void> {
    await this.usersRepository.update(id, {
      passwordResetToken: undefined,
      passwordResetTokenExpiresAt: undefined,
    });
  }

  async changeStatus(id: number, status: UserStatus): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    await this.usersRepository.update(id, { status });
    const updatedUser = await this.findById(id);
    if (!updatedUser) {
      throw new NotFoundException('Erro ao atualizar status do usuário');
    }
    return updatedUser;
  }

  async changeRole(id: number, role: UserRole): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    await this.usersRepository.update(id, { role });
    const updatedUser = await this.findById(id);
    if (!updatedUser) {
      throw new NotFoundException('Erro ao atualizar role do usuário');
    }
    return updatedUser;
  }

  async getProfile(id: number): Promise<UserResponse> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['clientProjects', 'supervisor'],
    });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return this.mapToUserResponse(user);
  }

  private async mapToUserResponse(user: User): Promise<UserResponse> {
    const projects = await this.getUserProjects(user);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      phone: user.phone,
      avatar: user.avatar,
      lastLoginAt: user.lastLoginAt,
      emailVerifiedAt: user.emailVerifiedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      supervisorId: user.supervisorId,
      supervisor: user.supervisor
        ? {
            id: user.supervisor.id,
            name: user.supervisor.name,
            email: user.supervisor.email,
          }
        : null,
      clientProjects:
        user.clientProjects?.map((project) => ({
          id: project.id.toString(),
          name: project.name,
          description: project.description,
        })) || [],
      projects: projects,
    };
  }

  private async getUserProjects(user: User): Promise<
    Array<{
      id: string;
      name: string;
      description?: string;
      relation?: 'director' | 'team_member' | 'client';
    }>
  > {
    const projects: Array<{
      id: string;
      name: string;
      description?: string;
      relation?: 'director' | 'team_member' | 'client';
    }> = [];

    if (user.role === UserRole.CLIENT && user.clientProjects) {
      projects.push(
        ...user.clientProjects.map((project) => ({
          id: project.id.toString(),
          name: project.name,
          description: project.description,
          relation: 'client' as const,
        })),
      );
    }

    if (user.role === UserRole.MANAGER || user.role === UserRole.TECHLEAD) {
      const directorProjects = await this.projectRepository.find({
        where: { team: { director: { id: user.id } } },
        select: ['id', 'name', 'description'],
        relations: ['team', 'team.director'],
      });

      projects.push(
        ...directorProjects.map((project) => ({
          id: project.id.toString(),
          name: project.name,
          description: project.description,
          relation: 'director' as const,
        })),
      );
    }

    if (user.role === UserRole.USER || user.role === UserRole.QA) {
      const teams = await this.teamRepository.find({
        where: {
          members: {
            user: { id: user.id },
          },
        },
        select: {
          id: true,
        },
      });

      if (teams.length > 0) {
        const teamIds = teams.map((team) => team.id);
        const teamProjects = await this.projectRepository.find({
          where: {
            team: {
              id: In(teamIds),
            },
          },
          select: {
            id: true,
            name: true,
            description: true,
          },
        });

        const projectsMap = new Map();
        teamProjects.forEach((project) => {
          if (!projectsMap.has(project.id)) {
            projectsMap.set(project.id, {
              id: project.id.toString(),
              name: project.name,
              description: project.description,
              relation: 'team_member' as const,
            });
          }
        });

        projects.push(...Array.from(projectsMap.values()));
      }
    }
    return projects;
  }

  async findUserWithProjects(id: number): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { id },
      relations: ['clientProjects'],
    });
  }

  async linkUserToProjects(
    userId: number,
    projectIds: number[],
    currentUser?: any,
  ): Promise<void> {
    const user = await this.findUserWithProjects(userId);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (projectIds.length > 0) {
      const projects = await this.projectRepository.findByIds(projectIds);
      if (projects.length !== projectIds.length) {
        throw new NotFoundException(
          'Um ou mais projetos não foram encontrados',
        );
      }

      if (
        currentUser &&
        (currentUser.role === UserRole.MANAGER ||
          currentUser.role === UserRole.TECHLEAD)
      ) {
        const projectsWithDirector = await this.projectRepository.find({
          where: { id: projectIds as any },
          relations: ['team', 'team.director'],
        });

        const unauthorizedProjects = projectsWithDirector.filter(
          (project) => project.team?.director?.id !== currentUser.id,
        );

        if (unauthorizedProjects.length > 0) {
          throw new BadRequestException(
            `Você não tem permissão para vincular os seguintes projetos: ${unauthorizedProjects.map((p) => p.name).join(', ')}`,
          );
        }
      }
    }
    const currentProjectIds = user.clientProjects?.map((p) => p.id) || [];

    await this.usersRepository
      .createQueryBuilder()
      .relation(User, 'clientProjects')
      .of(userId)
      .addAndRemove(projectIds, currentProjectIds);
  }

  async getAvailableProjects(currentUser: any): Promise<Project[]> {
    if (currentUser.role === UserRole.ADMIN) {
      const projects = await this.projectRepository.find({
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
        },
        order: { name: 'ASC' },
      });
      return projects;
    }

    if (
      currentUser.role === UserRole.MANAGER ||
      currentUser.role === UserRole.TECHLEAD
    ) {
      const projects = await this.projectRepository.find({
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
        },
        where: {
          team: { director: { id: currentUser.id } },
        },
        relations: ['team', 'team.director'],
        order: { name: 'ASC' },
      });
      return projects;
    }

    if (
      currentUser.role === UserRole.USER ||
      currentUser.role === UserRole.QA
    ) {
      const teams = await this.teamRepository.find({
        where: {
          members: {
            user: { id: currentUser.id },
          },
        },
        select: {
          id: true,
        },
      });

      if (teams.length > 0) {
        const teamIds = teams.map((team) => team.id);
        const projects = await this.projectRepository.find({
          where: {
            team: {
              id: In(teamIds),
            },
          },
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
          },
          order: { name: 'ASC' },
        });

        return projects;
      }

      return [];
    }
    if (currentUser.role === UserRole.CLIENT) {
      const userWithProjects = await this.usersRepository.findOne({
        where: { id: currentUser.id },
        relations: ['clientProjects'],
        select: {
          id: true,
          clientProjects: {
            id: true,
            name: true,
            description: true,
            status: true,
          },
        },
      });

      const projects = userWithProjects?.clientProjects || [];
      return projects;
    }
    return [];
  }

  async findManagers(): Promise<User[]> {
    return this.usersRepository.find({
      where: { role: UserRole.MANAGER, status: UserStatus.ACTIVE },
      select: ['id', 'name', 'email'],
      order: { name: 'ASC' },
    });
  }

  async createDefaultAdmin(): Promise<void> {
    const existingAdmin = await this.findByEmail('admin@teste.com');
    if (!existingAdmin) {
      // Criacao de um usuario padrao
      const adminUser = this.usersRepository.create({
        name: 'Admin',
        email: 'admin@teste.com',
        password: 'admin',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
      });
      await this.usersRepository.save(adminUser);
    }
  }
}
