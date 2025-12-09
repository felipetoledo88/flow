import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, UserStatus } from './entities/user.entity';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  async findAll(@Query() queryDto: QueryUserDto, @CurrentUser() currentUser) {
    const result = await this.usersService.findAll(queryDto, currentUser);

    return {
      data: result.users,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  @Get('profile')
  async getProfile(@CurrentUser() user) {
    return this.usersService.getProfile(user.id);
  }

  @Get('available-projects')
  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.TECHLEAD,
    UserRole.USER,
    UserRole.CLIENT,
    UserRole.QA,
  )
  async getAvailableProjects(@CurrentUser() user) {
    return this.usersService.getAvailableProjects(user);
  }

  @Get('managers')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.TECHLEAD)
  async getManagers() {
    return this.usersService.findManagers();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return user;
  }

  @Post()
  async create(
    @Body() createUserDto: CreateUserDto,
    @CurrentUser() currentUser,
  ) {
    return this.usersService.create(createUserDto, currentUser);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() currentUser,
  ) {
    return this.usersService.update(id, updateUserDto, currentUser);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number) {
    try {
      await this.usersService.delete(id);
    } catch (error) {
      throw error;
    }
  }

  @Put(':id/status')
  async changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: UserStatus,
  ) {
    return this.usersService.changeStatus(id, status);
  }

  @Put(':id/role')
  async changeRole(
    @Param('id', ParseIntPipe) id: number,
    @Body('role') role: UserRole,
  ) {
    return this.usersService.changeRole(id, role);
  }

  @Put(':id/password')
  async updatePassword(
    @Param('id', ParseIntPipe) id: number,
    @Body('password') password: string,
  ) {
    await this.usersService.updatePassword(id, password);
    return { message: 'Senha atualizada com sucesso' };
  }

  @Post(':id/verify-email')
  async verifyEmail(@Param('id', ParseIntPipe) id: number) {
    await this.usersService.verifyEmail(id);
    return { message: 'Email verificado com sucesso' };
  }

  @Get(':id/projects')
  async getUserProjects(@Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.findUserWithProjects(id);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return user.clientProjects || [];
  }

  @Put(':id/projects')
  async linkUserToProjects(
    @Param('id', ParseIntPipe) id: number,
    @Body('projectIds') projectIds: string[],
    @CurrentUser() currentUser,
  ) {
    await this.usersService.linkUserToProjects(
      id,
      projectIds.map(Number),
      currentUser,
    );
    return { message: 'Projetos vinculados com sucesso' };
  }
}
