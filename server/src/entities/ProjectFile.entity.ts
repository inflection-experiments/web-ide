import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('project_files')
export class ProjectFile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar' })
  path: string;

  @Column({ type: 'varchar', name: 'minio_key' })
  minioKey: string;

  @Column({ type: 'varchar', name: 'file_type' })
  fileType: string;

  @Column({ type: 'bigint', default: 0 })
  size: number;

  @ManyToOne("Project", (project: any) => project.files)
  project: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
