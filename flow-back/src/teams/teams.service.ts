import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Team } from './entities/team.entity';
import { TeamMember } from './entities/team-member.entity';
import { User } from '../users/entities/user.entity';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(TeamMember)
    private readonly teamMemberRepository: Repository<TeamMember>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  async create(createTeamDto: CreateTeamDto): Promise<Team> {
    // Primeiro, buscar o diretor pelo ID
    const director = await this.userRepository.findOne({
      where: { id: createTeamDto.director },
    });

    if (!director) {
      throw new NotFoundException('Diretor não encontrado');
    }

    // Criar a equipe sem incluir o campo director do DTO diretamente
    const team = this.teamRepository.create({
      name: createTeamDto.name,
      description: createTeamDto.description,
      isActive: createTeamDto.isActive,
      director: director,
    });

    if (createTeamDto.members && createTeamDto.members.length > 0) {
      team.members = createTeamDto.members.map((memberDto) =>
        this.teamMemberRepository.create(memberDto),
      );
    }

    return this.teamRepository.save(team);
  }

  async findAll(currentUser?: any): Promise<Team[]> {
    const queryBuilder = this.teamRepository
      .createQueryBuilder('team')
      .leftJoinAndSelect('team.director', 'director')
      .leftJoinAndSelect('team.members', 'members')
      .leftJoinAndSelect('members.user', 'user')
      .orderBy('team.createdAt', 'DESC');

    if (currentUser && currentUser.role !== 'admin') {
      queryBuilder.where(
        '(team.director_id = :userId OR members.user_id = :userId)',
        { userId: currentUser.id },
      );
    }

    return queryBuilder.getMany();
  }

  private async findOneInternal(id: number): Promise<Team> {
    const team = await this.teamRepository.findOne({
      where: { id },
      relations: ['director', 'members', 'members.user'],
    });

    if (!team) {
      throw new NotFoundException(`Equipe com ID ${id} não encontrada`);
    }

    return team;
  }

  async findOne(id: number, currentUser?: any): Promise<Team> {
    const team = await this.findOneInternal(id);
    if (currentUser && currentUser.role !== 'admin') {
      const hasAccess =
        team.director?.id === currentUser.id ||
        team.members?.some((member) => member.userId === currentUser.id);

      if (!hasAccess) {
        throw new NotFoundException(`Equipe com ID ${id} não encontrada`);
      }
    }

    return team;
  }

  async update(
    id: number,
    updateTeamDto: UpdateTeamDto,
    currentUser?: any,
  ): Promise<Team> {
    const team = await this.findOne(id, currentUser);

    Object.assign(team, updateTeamDto);

    if (updateTeamDto.members) {
      const existingMembers = await this.teamMemberRepository.find({
        where: { teamId: id },
        relations: ['user'],
      });
      const newMemberUserIds = updateTeamDto.members.map((m) => m.userId);
      const membersToRemove = existingMembers.filter(
        (member) => !newMemberUserIds.includes(member.userId),
      );
      for (const member of membersToRemove) {
        await this.removeUserFromTasks(member.userId);
      }
      await this.teamMemberRepository.softDelete({ teamId: id });
      team.members = updateTeamDto.members.map((memberDto) =>
        this.teamMemberRepository.create({ ...memberDto, teamId: id }),
      );
    }
    return this.teamRepository.save(team);
  }

  async remove(id: number, currentUser?: any): Promise<void> {
    const team = await this.findOne(id, currentUser);

    try {
      const members = await this.teamMemberRepository.find({
        where: { teamId: id },
        relations: ['user'],
      });
      for (const member of members) {
        await this.removeUserFromTasks(member.userId);
        await this.teamMemberRepository.softDelete(member.id);
      }
      await this.teamRepository.softDelete(team.id);
    } catch (error: any) {
      if (
        error.code === '23503' &&
        error.constraint === 'FK_ccc311614c1f1f229c71b473936'
      ) {
        throw new BadRequestException(
          `Não é possível excluir a equipe "${team.name}" pois ela está vinculada a um ou mais cronogramas. ` +
            'Remova ou transfira os cronogramas desta equipe antes de excluí-la.',
        );
      }
      if (
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        error.code === '23503' &&
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        error.constraint &&
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        error.constraint.includes('schedule')
      ) {
        throw new BadRequestException(
          `Não é possível excluir a equipe "${team.name}" pois ela possui relacionamentos com cronogramas. ` +
            'Remova todas as vinculações com cronogramas antes de excluí-la.',
        );
      }
      if (error.code === '23503') {
        throw new BadRequestException(
          `Não é possível excluir a equipe "${team.name}" pois ela possui relacionamentos ativos. ` +
            `Constraint: ${error.constraint}. Remova todas as vinculações antes de excluí-la.`,
        );
      }
      throw error;
    }
  }

  async addMember(
    teamId: number,
    createMemberDto: CreateTeamMemberDto,
  ): Promise<TeamMember> {
    const existingMember = await this.teamMemberRepository.findOne({
      where: { teamId, userId: createMemberDto.userId },
    });
    if (existingMember) {
      throw new BadRequestException('Este desenvolvedor já está na equipe');
    }
    const member = this.teamMemberRepository.create({
      ...createMemberDto,
      teamId,
    });
    return this.teamMemberRepository.save(member);
  }

  async updateMember(
    teamId: number,
    memberId: number,
    updateMemberDto: UpdateTeamMemberDto,
  ): Promise<TeamMember> {
    const member = await this.teamMemberRepository.findOne({
      where: { id: memberId, teamId },
      relations: ['user'],
    });
    if (!member) {
      throw new NotFoundException(
        `Membro com ID ${memberId} não encontrado nesta equipe`,
      );
    }
    Object.assign(member, updateMemberDto);
    return this.teamMemberRepository.save(member);
  }

  async removeMember(teamId: number, memberId: number): Promise<void> {
    const member = await this.teamMemberRepository.findOne({
      where: { id: memberId, teamId },
      relations: ['user'],
    });
    if (!member) {
      throw new NotFoundException(
        `Membro com ID ${memberId} não encontrado nesta equipe`,
      );
    }
    await this.removeUserFromTasks(member.userId);

    await this.teamMemberRepository.softDelete(member.id);
  }

  async findMemberByUserId(
    teamId: number,
    userId: number,
  ): Promise<TeamMember> {
    const member = await this.teamMemberRepository.findOne({
      where: { teamId, userId },
      relations: ['user'],
    });
    if (!member) {
      throw new NotFoundException(`Desenvolvedor não encontrado nesta equipe`);
    }
    return member;
  }

  /**
   * Remove um usuário de todas as tarefas de cronogramas
   * Isso é necessário quando o usuário é removido de uma equipe
   * para evitar violações de chave estrangeira
   */
  private async removeUserFromTasks(userId: number): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const affectedTasks = await queryRunner.query(
        'SELECT id, title FROM tasks WHERE assignee_id = $1',
        [userId],
      );

      await queryRunner.query(
        'UPDATE tasks SET assignee_id = NULL WHERE assignee_id = $1',
        [userId],
      );
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }
  }
}
