import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('teams')
@UseGuards(JwtAuthGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  create(@Body() createTeamDto: CreateTeamDto) {
    return this.teamsService.create(createTeamDto);
  }

  @Get()
  findAll(@CurrentUser() currentUser) {
    return this.teamsService.findAll(currentUser);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() currentUser) {
    return this.teamsService.findOne(+id, currentUser);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateTeamDto: UpdateTeamDto,
    @CurrentUser() currentUser,
  ) {
    // Verificar permissão antes de atualizar
    return this.teamsService.update(+id, updateTeamDto, currentUser);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() currentUser) {
    // Verificar permissão antes de remover
    return this.teamsService.remove(+id, currentUser);
  }

  @Post(':teamId/members')
  addMember(
    @Param('teamId') teamId: string,
    @Body() createMemberDto: CreateTeamMemberDto,
  ) {
    return this.teamsService.addMember(+teamId, createMemberDto);
  }

  @Patch(':teamId/members/:memberId')
  updateMember(
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string,
    @Body() updateMemberDto: UpdateTeamMemberDto,
  ) {
    return this.teamsService.updateMember(+teamId, +memberId, updateMemberDto);
  }

  @Delete(':teamId/members/:memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.teamsService.removeMember(+teamId, +memberId);
  }
}
