import { Injectable } from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import { UserRole, UserStatus } from '../../users/entities/user.entity';

@Injectable()
export class UserSeed {
  constructor(private readonly usersService: UsersService) {}

  async run() {
    console.log('👥 Executando seeder de usuários...');

    // Criar usuário admin padrão
    await this.createDefaultAdmin();

    console.log('✅ Seeder de usuários concluído!');
  }

  private async createDefaultAdmin() {
    const existingAdmin =
      await this.usersService.findByEmail('admin@teste.com');

    if (!existingAdmin) {
      const adminUser = await this.usersService.create({
        name: 'Administrador',
        email: 'admin@teste.com',
        password: '123456',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      });

      console.log('👤 Usuário admin criado:', adminUser.email);
    }
  }
}
