import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';
import { TaskDependency } from './task-dependency.entity';
import { Sprint } from '../../common/entities/sprint.entity';
import { TaskStatus } from './task-status.entity';
import { TaskComment } from './task-comment.entity';

// Manter enum para compatibilidade
export enum TaskStatusEnum {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  BLOCKED = 'blocked',
  COMPLETED = 'completed',
}

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Project, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'project_id' })
  projectId: number;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'assignee_id' })
  assignee: User;

  @Column({ name: 'assignee_id' })
  assigneeId: number;

  @Column({ type: 'date', nullable: true })
  startDate?: Date;

  @Column({ type: 'date', nullable: true })
  endDate?: Date;

  @Column({ type: 'date', nullable: true })
  expectedStartDate?: Date;

  @Column({ type: 'date', nullable: true })
  expectedEndDate?: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  estimatedHours?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  actualHours: number;

  @ManyToOne(() => Sprint, { eager: true, nullable: true })
  @JoinColumn({ name: 'sprint_id' })
  sprint?: Sprint;

  @Column({ name: 'sprint_id', nullable: true })
  sprintId?: number;

  @ManyToOne(() => TaskStatus, { eager: true })
  @JoinColumn({ name: 'status_id' })
  status: TaskStatus;

  @Column({ name: 'status_id' })
  statusId: number;

  @Column({ type: 'int', nullable: true, default: null })
  order: number | null;

  @Column({ type: 'boolean', default: false })
  isBacklog: boolean;

  @OneToMany(() => TaskDependency, (dependency) => dependency.task)
  dependencies: TaskDependency[];

  @OneToMany(() => TaskDependency, (dependency) => dependency.dependsOn)
  dependents: TaskDependency[];

  @OneToMany(() => TaskComment, (comment) => comment.task)
  comments: TaskComment[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamp' })
  deletedAt?: Date;
}
