import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', name: 'minio_path' })
  minioPath: string;

  @Column({ type: 'varchar', default: 'active' })
  status: string;

  @ManyToOne("User", (user: any) => user.projects)
  user: any;

  @OneToMany("ProjectFile", (file: any) => file.project)
  files: any[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
